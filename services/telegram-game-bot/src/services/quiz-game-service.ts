import { v4 as uuidv4 } from 'uuid';
import Database from '@/models/database';
import RedisService from './redis-service';
import WebhookService from './webhook-service';
import OpenAIService from './openai-service';
import WalletVerificationService from './wallet-verification-service';
import {
  Game,
  GameType,
  GameStatus,
  GameAction,
  Player,
  QuizQuestion,
  QuizAnswer,
  QuizParticipant,
  QuizSettings,
  GameCreationRequest,
  PlayerJoinRequest
} from '@/models/types';
import config from '@/config/config';

export class QuizGameService {
  private db = Database;
  private redis = RedisService.getInstance();
  private webhook = WebhookService.getInstance();
  private openai = OpenAIService.getInstance();
  private walletVerification = WalletVerificationService.getInstance();

  async createQuizGame(request: GameCreationRequest, createdBy: string): Promise<Game> {
    const gameId = uuidv4();
    const now = new Date();
    
    // Set default settings for quiz game
    const settings = this.getDefaultQuizSettings(request.settings.quiz);
    
    const game: Game = {
      id: gameId,
      type: GameType.QUIZ,
      status: GameStatus.CREATED,
      title: request.title,
      description: request.description,
      created_by: createdBy,
      chat_id: request.chatId,
      settings: { quiz: settings },
      created_at: now,
      updated_at: now,
      total_players: 0,
      max_players: settings.maxPlayers,
      min_players: settings.minPlayers,
      time_limit: settings.timePerQuestion * settings.questionCount
    };

    // Generate quiz questions using OpenAI
    console.log(`Generating ${settings.questionCount} quiz questions...`);
    const questions = await this.openai.generateQuizQuestions(
      gameId,
      settings.questionCount,
      settings.difficulty,
      settings.categories
    );

    await this.db.transaction(async (client) => {
      // Insert game
      await client.query(`
        INSERT INTO games (
          id, type, status, title, description, created_by, chat_id,
          settings, created_at, updated_at, total_players, max_players,
          min_players, time_limit
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [
        game.id, game.type, game.status, game.title, game.description,
        game.created_by, game.chat_id, JSON.stringify(game.settings),
        game.created_at, game.updated_at, game.total_players,
        game.max_players, game.min_players, game.time_limit
      ]);

      // Insert quiz questions
      for (const question of questions) {
        await client.query(`
          INSERT INTO quiz_questions (
            id, game_id, question_number, question, options,
            correct_answer, category, difficulty, time_limit, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          question.id, question.gameId, question.questionNumber,
          question.question, JSON.stringify(question.options),
          question.correctAnswer, question.category, question.difficulty,
          question.timeLimit, question.createdAt
        ]);
      }

      // Log game creation
      await this.logGameAction(client, gameId, GameAction.GAME_CREATED, createdBy, {
        title: game.title,
        settings: game.settings,
        questionCount: questions.length
      });
    });

    // Cache game in Redis
    await this.redis.setGame(gameId, game);

    // Send webhook
    await this.webhook.sendWebhook('gameStart', { game, questionCount: questions.length });

    return game;
  }

  async joinQuizGame(request: PlayerJoinRequest): Promise<{ success: boolean; message: string; participant?: QuizParticipant }> {
    const game = await this.getGame(request.gameId);
    if (!game) {
      return { success: false, message: 'Game not found' };
    }

    if (game.status !== GameStatus.WAITING_FOR_PLAYERS && game.status !== GameStatus.PLAYERS_JOINING) {
      return { success: false, message: 'Game is not accepting new players' };
    }

    if (game.total_players >= game.max_players) {
      return { success: false, message: 'Game is full' };
    }

    // Get or create player
    const player = await this.getOrCreatePlayer({
      id: request.telegramUserId,
      username: request.username,
      first_name: request.displayName
    });

    // Check wallet verification if required
    if (game.settings.quiz?.requiresWalletVerification) {
      const isVerified = await this.walletVerification.isPlayerVerified(player.id);
      if (!isVerified) {
        return { 
          success: false, 
          message: 'You need to verify your wallet first. Use /verify command with your Solana wallet address.' 
        };
      }
    }

    // Check if player already joined
    const existingParticipant = await this.getQuizParticipant(request.gameId, request.telegramUserId);
    if (existingParticipant) {
      return { success: false, message: 'You have already joined this game' };
    }

    const participantId = uuidv4();
    const now = new Date();

    const participant: QuizParticipant = {
      id: participantId,
      game_id: request.gameId,
      player_id: player.id,
      joined_at: now,
      is_winner: false,
      score: 0,
      correctAnswers: 0,
      totalAnswers: 0,
      averageResponseTime: 0,
      currentStreak: 0,
      maxStreak: 0
    };

    await this.db.transaction(async (client) => {
      // Insert participant
      await client.query(`
        INSERT INTO game_participants (
          id, game_id, player_id, joined_at, is_winner,
          selected_number, prize_amount, prize_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        participant.id, participant.game_id, participant.player_id,
        participant.joined_at, participant.is_winner,
        participant.score, // Store score in selected_number column
        0, // prize_amount
        'QUIZ_SCORE' // prize_type to identify quiz participants
      ]);

      // Update game player count
      await client.query(`
        UPDATE games SET total_players = total_players + 1, updated_at = $1
        WHERE id = $2
      `, [now, request.gameId]);

      // Update player stats
      await client.query(`
        UPDATE players SET total_games_played = total_games_played + 1, updated_at = $1
        WHERE id = $2
      `, [now, player.id]);

      // Log action
      await this.logGameAction(client, request.gameId, GameAction.PLAYER_JOINED, player.id, {
        telegramUserId: request.telegramUserId,
        username: request.username,
        displayName: request.displayName,
        walletVerified: game.settings.quiz?.requiresWalletVerification
      });
    });

    // Update cached game
    game.total_players += 1;
    game.updated_at = now;
    await this.redis.setGame(request.gameId, game);

    // Send webhook
    await this.webhook.sendWebhook('playerJoin', { game, player, participant });

    // Check if we should auto-start the game
    if (game.settings.quiz?.autoStart && game.total_players >= game.min_players) {
      await this.startQuizGame(request.gameId);
    }

    return { success: true, message: 'Successfully joined the quiz game!', participant };
  }

  async startQuizGame(gameId: string): Promise<void> {
    const game = await this.getGame(gameId);
    if (!game || (game.status !== GameStatus.WAITING_FOR_PLAYERS && game.status !== GameStatus.CREATED)) {
      return;
    }

    const now = new Date();
    const settings = game.settings.quiz!;
    const joinDeadline = new Date(now.getTime() + (settings.joinTimeLimit * 1000));

    await this.db.query(`
      UPDATE games 
      SET status = $1, started_at = $2, join_deadline = $3, updated_at = $4
      WHERE id = $5
    `, [GameStatus.PLAYERS_JOINING, now, joinDeadline, now, gameId]);

    // Update cache
    game.status = GameStatus.PLAYERS_JOINING;
    game.started_at = now;
    game.join_deadline = joinDeadline;
    game.updated_at = now;
    
    await this.redis.setGame(gameId, game);

    // Schedule quiz start after join time
    setTimeout(() => {
      this.beginQuizQuestions(gameId);
    }, settings.joinTimeLimit * 1000);

    await this.logGameAction(null, gameId, GameAction.GAME_STARTED, game.created_by, {
      joinDeadline,
      playerCount: game.total_players,
      questionCount: settings.questionCount
    });
  }

  async beginQuizQuestions(gameId: string): Promise<void> {
    const game = await this.getGame(gameId);
    if (!game || game.status !== GameStatus.PLAYERS_JOINING) {
      return;
    }

    // Update status to active quiz
    await this.db.query(`
      UPDATE games SET status = $1, updated_at = $2
      WHERE id = $3
    `, [GameStatus.NUMBER_SELECTION, new Date(), gameId]); // Using NUMBER_SELECTION for active quiz

    // Start the quiz question flow
    await this.sendNextQuestion(gameId, 1);
  }

  async sendNextQuestion(gameId: string, questionNumber: number): Promise<void> {
    const game = await this.getGame(gameId);
    if (!game || game.status !== GameStatus.NUMBER_SELECTION) {
      return;
    }

    const question = await this.getQuizQuestion(gameId, questionNumber);
    if (!question) {
      // No more questions, end the game
      await this.endQuizGame(gameId);
      return;
    }

    // Cache current question
    await this.redis.setTempData(`quiz:${gameId}:current`, {
      questionId: question.id,
      questionNumber: question.questionNumber,
      startTime: Date.now()
    }, question.timeLimit + 10); // Add buffer time

    // Emit question via Socket.IO (if available)
    const io = (global as any).io;
    if (io) {
      io.to(`game:${gameId}`).emit('quiz:question', {
        questionNumber: question.questionNumber,
        question: question.question,
        options: question.options,
        timeLimit: question.timeLimit,
        category: question.category
      });
    }

    // Schedule next question
    setTimeout(() => {
      this.processQuestionTimeout(gameId, question.id, questionNumber);
    }, question.timeLimit * 1000);
  }

  async submitAnswer(
    gameId: string,
    playerId: string,
    questionNumber: number,
    selectedAnswer: number
  ): Promise<{ success: boolean; isCorrect: boolean; correctAnswer?: number }> {
    // Get current question
    const currentData = await this.redis.getTempData(`quiz:${gameId}:current`);
    if (!currentData || currentData.questionNumber !== questionNumber) {
      return { success: false, isCorrect: false };
    }

    const question = await this.getQuizQuestion(gameId, questionNumber);
    if (!question) {
      return { success: false, isCorrect: false };
    }

    // Check if already answered
    const existingAnswer = await this.getPlayerAnswer(gameId, playerId, question.id);
    if (existingAnswer) {
      return { success: false, isCorrect: existingAnswer.isCorrect };
    }

    // Calculate response time
    const timeToAnswer = Date.now() - currentData.startTime;
    const isCorrect = selectedAnswer === question.correctAnswer;

    // Store answer
    const answerId = uuidv4();
    await this.db.query(`
      INSERT INTO quiz_answers (
        id, game_id, player_id, question_id, selected_answer,
        is_correct, time_to_answer, answered_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      answerId, gameId, playerId, question.id, selectedAnswer,
      isCorrect, timeToAnswer, new Date()
    ]);

    // Update participant score
    await this.updateParticipantScore(gameId, playerId, isCorrect, timeToAnswer);

    return { 
      success: true, 
      isCorrect, 
      correctAnswer: isCorrect ? undefined : question.correctAnswer 
    };
  }

  private async processQuestionTimeout(gameId: string, questionId: string, questionNumber: number): Promise<void> {
    // Clear current question cache
    await this.redis.deleteTempData(`quiz:${gameId}:current`);

    // Get question details for the answer
    const question = await this.getQuizQuestion(gameId, questionNumber);
    
    // Emit correct answer
    const io = (global as any).io;
    if (io && question) {
      io.to(`game:${gameId}`).emit('quiz:answer', {
        questionNumber: question.questionNumber,
        correctAnswer: question.correctAnswer,
        correctOption: question.options[question.correctAnswer]
      });
    }

    // Wait a bit before sending next question
    setTimeout(() => {
      this.sendNextQuestion(gameId, questionNumber + 1);
    }, 3000); // 3 second pause between questions
  }

  private async endQuizGame(gameId: string): Promise<void> {
    const now = new Date();

    // Get final scores
    const scores = await this.getGameScores(gameId);
    const winners = scores.slice(0, 3).map(s => s.player_id); // Top 3 winners

    await this.db.transaction(async (client) => {
      // Update game status
      await client.query(`
        UPDATE games SET status = $1, ended_at = $2, updated_at = $3
        WHERE id = $4
      `, [GameStatus.COMPLETED, now, now, gameId]);

      // Mark winners
      for (let i = 0; i < winners.length; i++) {
        const winnerId = winners[i];
        const prizeAmount = this.calculatePrize(i, scores[i].score);
        
        await client.query(`
          UPDATE game_participants 
          SET is_winner = true, prize_amount = $1
          WHERE game_id = $2 AND player_id = $3
        `, [prizeAmount, gameId, winnerId]);

        await client.query(`
          UPDATE players SET total_games_won = total_games_won + 1, updated_at = $1
          WHERE id = $2
        `, [now, winnerId]);

        await this.logGameAction(client, gameId, GameAction.WINNER_SELECTED, winnerId, {
          position: i + 1,
          score: scores[i].score,
          prizeAmount
        });
      }

      await this.logGameAction(client, gameId, GameAction.GAME_COMPLETED, null, {
        winners: winners.slice(0, 3),
        totalParticipants: scores.length,
        completedAt: now
      });
    });

    // Clear from cache
    await this.redis.deleteGame(gameId);

    // Send webhooks
    const game = await this.getGame(gameId);
    await this.webhook.sendWebhook('winnerSelected', { game, winners });
    await this.webhook.sendWebhook('gameEnd', { game, winners, scores });

    // Generate and return summary
    const questions = await this.getAllQuizQuestions(gameId);
    const summary = await this.openai.generateQuizSummary(questions, winners);
    
    // Emit game end event
    const io = (global as any).io;
    if (io) {
      io.to(`game:${gameId}`).emit('quiz:end', {
        winners,
        scores: scores.slice(0, 10), // Top 10 scores
        summary
      });
    }
  }

  private async updateParticipantScore(
    gameId: string,
    playerId: string,
    isCorrect: boolean,
    responseTime: number
  ): Promise<void> {
    // Get current participant data
    const participant = await this.db.query(`
      SELECT selected_number as score, prize_amount as correct_answers,
             prize_type as total_answers
      FROM game_participants
      WHERE game_id = $1 AND player_id = $2 AND prize_type = 'QUIZ_SCORE'
    `, [gameId, playerId]);

    if (participant.rows.length === 0) return;

    const current = participant.rows[0];
    const currentScore = parseInt(current.score) || 0;
    const correctAnswers = parseInt(current.correct_answers) || 0;
    const totalAnswers = parseInt(current.total_answers) || 0;

    // Calculate new score (correct answer + speed bonus)
    let scoreIncrease = 0;
    if (isCorrect) {
      scoreIncrease = 100; // Base score for correct answer
      // Speed bonus: faster responses get more points
      const speedBonus = Math.max(0, 50 - Math.floor(responseTime / 200)); // Up to 50 bonus points
      scoreIncrease += speedBonus;
    }

    const newScore = currentScore + scoreIncrease;
    const newCorrectAnswers = correctAnswers + (isCorrect ? 1 : 0);
    const newTotalAnswers = totalAnswers + 1;

    await this.db.query(`
      UPDATE game_participants
      SET selected_number = $1, prize_amount = $2, prize_type = $3
      WHERE game_id = $4 AND player_id = $5
    `, [newScore, newCorrectAnswers, newTotalAnswers, gameId, playerId]);
  }

  private calculatePrize(position: number, score: number): number {
    const settings = config.games.quiz;
    const totalPrize = settings.prizePoolAmount;
    
    switch (position) {
      case 0: // 1st place
        return totalPrize * 0.5;
      case 1: // 2nd place
        return totalPrize * 0.3;
      case 2: // 3rd place
        return totalPrize * 0.2;
      default:
        return 0;
    }
  }

  // Helper methods
  private getDefaultQuizSettings(customSettings?: Partial<QuizSettings>): QuizSettings {
    const defaults = config.games.quiz;
    return {
      questionCount: customSettings?.questionCount || defaults.defaultQuestionCount,
      timePerQuestion: customSettings?.timePerQuestion || defaults.defaultTimePerQuestion,
      joinTimeLimit: customSettings?.joinTimeLimit || defaults.joinTimeLimit,
      minPlayers: customSettings?.minPlayers || defaults.minPlayers,
      maxPlayers: customSettings?.maxPlayers || defaults.maxPlayers,
      difficulty: customSettings?.difficulty || defaults.defaultDifficulty as any,
      categories: customSettings?.categories,
      announceInterval: customSettings?.announceInterval || defaults.announceInterval,
      autoStart: customSettings?.autoStart ?? true,
      enablePrizes: customSettings?.enablePrizes ?? true,
      prizePool: customSettings?.prizePool || {
        amount: defaults.prizePoolAmount,
        currency: defaults.prizePoolCurrency,
        tokenAddress: config.solana.tokenAddress,
        distribution: 'top-3'
      },
      requiresWalletVerification: customSettings?.requiresWalletVerification ?? true
    };
  }

  // Database query methods
  private async getGame(gameId: string): Promise<Game | null> {
    const result = await this.db.query('SELECT * FROM games WHERE id = $1', [gameId]);
    if (result.rows.length === 0) return null;
    return this.mapRowToGame(result.rows[0]);
  }

  private async getQuizQuestion(gameId: string, questionNumber: number): Promise<QuizQuestion | null> {
    const result = await this.db.query(
      'SELECT * FROM quiz_questions WHERE game_id = $1 AND question_number = $2',
      [gameId, questionNumber]
    );
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      gameId: row.game_id,
      questionNumber: row.question_number,
      question: row.question,
      options: JSON.parse(row.options),
      correctAnswer: row.correct_answer,
      category: row.category,
      difficulty: row.difficulty,
      timeLimit: row.time_limit,
      createdAt: row.created_at
    };
  }

  private async getAllQuizQuestions(gameId: string): Promise<QuizQuestion[]> {
    const result = await this.db.query(
      'SELECT * FROM quiz_questions WHERE game_id = $1 ORDER BY question_number',
      [gameId]
    );
    
    return result.rows.map(row => ({
      id: row.id,
      gameId: row.game_id,
      questionNumber: row.question_number,
      question: row.question,
      options: JSON.parse(row.options),
      correctAnswer: row.correct_answer,
      category: row.category,
      difficulty: row.difficulty,
      timeLimit: row.time_limit,
      createdAt: row.created_at
    }));
  }

  private async getQuizParticipant(gameId: string, telegramUserId: number): Promise<QuizParticipant | null> {
    const result = await this.db.query(`
      SELECT gp.* FROM game_participants gp
      JOIN players p ON gp.player_id = p.id
      WHERE gp.game_id = $1 AND p.telegram_user_id = $2 AND gp.prize_type = 'QUIZ_SCORE'
    `, [gameId, telegramUserId]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      game_id: row.game_id,
      player_id: row.player_id,
      joined_at: row.joined_at,
      is_winner: row.is_winner,
      score: parseInt(row.selected_number) || 0,
      correctAnswers: parseInt(row.prize_amount) || 0,
      totalAnswers: parseInt(row.prize_type) || 0,
      averageResponseTime: 0,
      currentStreak: 0,
      maxStreak: 0
    };
  }

  private async getPlayerAnswer(gameId: string, playerId: string, questionId: string): Promise<QuizAnswer | null> {
    const result = await this.db.query(
      'SELECT * FROM quiz_answers WHERE game_id = $1 AND player_id = $2 AND question_id = $3',
      [gameId, playerId, questionId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      gameId: row.game_id,
      playerId: row.player_id,
      questionId: row.question_id,
      selectedAnswer: row.selected_answer,
      isCorrect: row.is_correct,
      timeToAnswer: row.time_to_answer,
      answeredAt: row.answered_at
    };
  }

  private async getGameScores(gameId: string): Promise<any[]> {
    const result = await this.db.query(`
      SELECT 
        gp.player_id,
        p.display_name,
        p.username,
        gp.selected_number as score,
        gp.prize_amount as correct_answers,
        gp.prize_type as total_answers
      FROM game_participants gp
      JOIN players p ON gp.player_id = p.id
      WHERE gp.game_id = $1 AND gp.prize_type = 'QUIZ_SCORE'
      ORDER BY gp.selected_number DESC, gp.joined_at ASC
    `, [gameId]);

    return result.rows.map(row => ({
      player_id: row.player_id,
      display_name: row.display_name,
      username: row.username,
      score: parseInt(row.score) || 0,
      correct_answers: parseInt(row.correct_answers) || 0,
      total_answers: parseInt(row.total_answers) || 0
    }));
  }

  private async getOrCreatePlayer(telegramUser: any): Promise<Player> {
    let result = await this.db.query(
      'SELECT * FROM players WHERE telegram_user_id = $1',
      [telegramUser.id]
    );

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    // Create new player
    const playerId = uuidv4();
    const now = new Date();
    const displayName = telegramUser.first_name || telegramUser.username || `User${telegramUser.id}`;

    await this.db.query(`
      INSERT INTO players (
        id, telegram_user_id, username, display_name, created_at, updated_at,
        total_games_played, total_games_won, is_active, is_banned
      ) VALUES ($1, $2, $3, $4, $5, $6, 0, 0, true, false)
    `, [playerId, telegramUser.id, telegramUser.username, displayName, now, now]);

    result = await this.db.query('SELECT * FROM players WHERE id = $1', [playerId]);
    return result.rows[0];
  }

  private async logGameAction(
    client: any,
    gameId: string,
    action: GameAction,
    actorId?: string | null,
    data?: any,
    message?: string
  ): Promise<void> {
    const historyId = uuidv4();
    const query = client ? client.query.bind(client) : this.db.query.bind(this.db);
    
    await query(`
      INSERT INTO game_history (
        id, game_id, action, actor_id, data, timestamp, message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [historyId, gameId, action, actorId, JSON.stringify(data || {}), new Date(), message]);
  }

  private mapRowToGame(row: any): Game {
    return {
      id: row.id,
      type: row.type,
      status: row.status,
      title: row.title,
      description: row.description,
      created_by: row.created_by,
      chat_id: row.chat_id,
      message_id: row.message_id,
      settings: JSON.parse(row.settings),
      created_at: row.created_at,
      updated_at: row.updated_at,
      started_at: row.started_at,
      ended_at: row.ended_at,
      winner_id: row.winner_id,
      total_players: row.total_players,
      max_players: row.max_players,
      min_players: row.min_players,
      time_limit: row.time_limit,
      join_deadline: row.join_deadline,
      selection_deadline: row.selection_deadline
    };
  }
}

export default QuizGameService;