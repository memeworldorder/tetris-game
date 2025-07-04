import { v4 as uuidv4 } from 'uuid';
import Database from '@/models/database';
import RedisService from './redis-service';
import WebhookService from './webhook-service';
import {
  Game,
  GameType,
  GameStatus,
  GameAction,
  Player,
  GameParticipant,
  NumberSelection,
  GameCreationRequest,
  PlayerJoinRequest,
  NumberSelectionRequest,
  PickNumberSettings,
  GameHistory,
  TelegramUser,
  GameUpdateRequest,
  PrizeDistribution,
  Prize,
  GameNumberState
} from '@/models/types';
import config from '@/config/config';

export class GameService {
  private db = Database;
  private redis = RedisService.getInstance();
  private webhook = WebhookService.getInstance();

  async createGame(request: GameCreationRequest, createdBy: string): Promise<Game> {
    const gameId = uuidv4();
    const now = new Date();
    
    // Default settings for pick number game
    const pickNumberSettings = this.getDefaultPickNumberSettings(request.settings.pickNumber);
    
    const game: Game = {
      id: gameId,
      type: request.type,
      status: GameStatus.CREATED,
      title: request.title,
      description: request.description,
      created_by: createdBy,
      chat_id: request.chatId,
      settings: { pickNumber: pickNumberSettings },
      created_at: now,
      updated_at: now,
      total_players: 0,
      max_players: pickNumberSettings.maxPlayers,
      min_players: pickNumberSettings.minPlayers,
      time_limit: pickNumberSettings.timeLimit
    };

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

      // Initialize game number state
      const numberRange = pickNumberSettings.numberRange;
      const availableNumbers = Array.from(
        { length: numberRange.max - numberRange.min + 1 },
        (_, i) => numberRange.min + i
      );

      await client.query(`
        INSERT INTO game_number_states (game_id, available_numbers, last_updated)
        VALUES ($1, $2, $3)
      `, [gameId, availableNumbers, now]);

      // Create prize distribution if enabled
      if (pickNumberSettings.enablePrizes && pickNumberSettings.prizeDistribution) {
        await this.createPrizeDistribution(client, gameId, pickNumberSettings.prizeDistribution);
      }

      // Log game creation
      await this.logGameAction(client, gameId, GameAction.GAME_CREATED, createdBy, {
        title: game.title,
        settings: game.settings,
        isReverseMode: pickNumberSettings.isReverseMode
      });
    });

    // Cache game in Redis
    await this.redis.setGame(gameId, game);

    // Send webhook
    await this.webhook.sendWebhook('gameStart', { game });

    return game;
  }

  private async createPrizeDistribution(
    client: any,
    gameId: string,
    distribution: PrizeDistribution
  ): Promise<void> {
    // Insert prize distribution
    const distResult = await client.query(`
      INSERT INTO prize_distributions (game_id, total_prizes, auto_calculate)
      VALUES ($1, $2, $3)
      RETURNING id
    `, [gameId, distribution.totalPrizes, distribution.autoCalculate]);

    const distributionId = distResult.rows[0].id;

    // Insert individual prizes
    for (const prize of distribution.prizes) {
      await client.query(`
        INSERT INTO prizes (distribution_id, position, percentage, amount)
        VALUES ($1, $2, $3, $4)
      `, [distributionId, prize.position, prize.percentage, prize.amount]);
    }
  }

  async getGameNumberState(gameId: string): Promise<GameNumberState | null> {
    // Try cache first
    const cached = await this.redis.getTempData(`game:${gameId}:numbers`);
    if (cached) return cached;

    const result = await this.db.query(`
      SELECT game_id, available_numbers, last_updated
      FROM game_number_states
      WHERE game_id = $1
    `, [gameId]);

    if (result.rows.length === 0) return null;

    const state = result.rows[0];
    
    // Get selected numbers
    const selections = await this.db.query(`
      SELECT number, player_id
      FROM number_selections
      WHERE game_id = $1 AND is_available = false
    `, [gameId]);

    const selectedNumbers = new Map<number, string>();
    selections.rows.forEach((row: { number: number; player_id: string }) => {
      selectedNumbers.set(row.number, row.player_id);
    });

    const gameNumberState: GameNumberState = {
      gameId: state.game_id,
      availableNumbers: state.available_numbers,
      selectedNumbers,
      lastUpdated: state.last_updated
    };

    // Cache for 30 seconds
    await this.redis.setTempData(`game:${gameId}:numbers`, gameNumberState, 30);

    return gameNumberState;
  }

  async selectNumber(request: NumberSelectionRequest): Promise<{ success: boolean; message: string }> {
    const game = await this.getGame(request.gameId);
    if (!game) {
      return { success: false, message: 'Game not found' };
    }

    if (game.status !== GameStatus.NUMBER_SELECTION) {
      return { success: false, message: 'Game is not in number selection phase' };
    }

    const settings = game.settings.pickNumber!;

    return await this.db.transaction(async (client) => {
      // Check if player already selected a number
      const existing = await client.query(`
        SELECT id FROM number_selections
        WHERE game_id = $1 AND player_id = $2
      `, [request.gameId, request.playerId]);

      if (existing.rows.length > 0 && !settings.allowDuplicateNumbers) {
        return { success: false, message: 'You have already selected a number' };
      }

      // Check if number is available
      const numberState = await client.query(`
        SELECT available_numbers FROM game_number_states
        WHERE game_id = $1
      `, [request.gameId]);

      if (numberState.rows.length === 0) {
        return { success: false, message: 'Game state not found' };
      }

      const availableNumbers = numberState.rows[0].available_numbers;
      if (!availableNumbers.includes(request.number)) {
        return { success: false, message: 'This number is not available' };
      }

      // Insert number selection
      const selectionId = uuidv4();
      await client.query(`
        INSERT INTO number_selections (id, game_id, player_id, number, selected_at, is_available)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [selectionId, request.gameId, request.playerId, request.number, new Date(), false]);

      // Update available numbers
      const updatedNumbers = availableNumbers.filter((n: number) => n !== request.number);
      await client.query(`
        UPDATE game_number_states
        SET available_numbers = $1, last_updated = $2
        WHERE game_id = $3
      `, [updatedNumbers, new Date(), request.gameId]);

      // Update participant's selected number
      await client.query(`
        UPDATE game_participants
        SET selected_number = $1, selection_time = $2
        WHERE game_id = $3 AND player_id = $4
      `, [request.number, new Date(), request.gameId, request.playerId]);

      // Log action
      await this.logGameAction(client, request.gameId, GameAction.NUMBER_SELECTED, request.playerId, {
        number: request.number
      });

      // Clear cache
      await this.redis.deleteTempData(`game:${request.gameId}:numbers`);

      // Send webhook
      await this.webhook.sendWebhook('numberSelected', { 
        gameId: request.gameId, 
        playerId: request.playerId, 
        number: request.number 
      });

      // Emit socket event for real-time update
      const io = (global as any).io;
      if (io) {
        io.to(`game:${request.gameId}`).emit('number-selected', {
          playerId: request.playerId,
          number: request.number,
          availableNumbers: updatedNumbers
        });
      }

      return { success: true, message: 'Number selected successfully!' };
    });
  }

  async performDrawing(gameId: string): Promise<void> {
    const game = await this.getGame(gameId);
    if (!game || game.status !== GameStatus.NUMBER_SELECTION) {
      return;
    }

    const settings = game.settings.pickNumber!;
    const isReverseMode = settings.isReverseMode || false;

    // Update game status to drawing
    await this.db.query(`
      UPDATE games SET status = $1, updated_at = $2
      WHERE id = $3
    `, [GameStatus.DRAWING, new Date(), gameId]);

    // Get all participants with their selected numbers
    const participants = await this.db.query(`
      SELECT gp.*, p.username, p.display_name
      FROM game_participants gp
      JOIN players p ON gp.player_id = p.id
      WHERE gp.game_id = $1 AND gp.selected_number IS NOT NULL
      ORDER BY gp.selected_number
    `, [gameId]);

    if (participants.rows.length === 0) {
      await this.endGameWithNoWinners(gameId);
      return;
    }

    // Generate winning number(s)
    const numberRange = settings.numberRange;
    const totalNumbers = numberRange.max - numberRange.min + 1;
    const winningNumbers: number[] = [];
    
    // In reverse mode, we need to eliminate players until we have our winners
    if (isReverseMode) {
      await this.performReverseDrawing(gameId, participants.rows, settings);
    } else {
      // Normal mode: select winning numbers
      const numWinners = Math.min(settings.maxWinners, participants.rows.length);
      
      while (winningNumbers.length < numWinners) {
        const winningNumber = Math.floor(Math.random() * totalNumbers) + numberRange.min;
        if (!winningNumbers.includes(winningNumber)) {
          winningNumbers.push(winningNumber);
        }
      }

      await this.determineWinners(gameId, participants.rows, winningNumbers, settings);
    }
  }

  private async performReverseDrawing(
    gameId: string,
    participants: any[],
    settings: PickNumberSettings
  ): Promise<void> {
    const numberRange = settings.numberRange;
    const totalNumbers = numberRange.max - numberRange.min + 1;
    const eliminatedNumbers: number[] = [];
    const remainingPlayers = new Set(participants.map(p => p.player_id));
    
    // Keep drawing until we have the desired number of winners
    while (remainingPlayers.size > settings.maxWinners) {
      const eliminationNumber = Math.floor(Math.random() * totalNumbers) + numberRange.min;
      
      if (!eliminatedNumbers.includes(eliminationNumber)) {
        eliminatedNumbers.push(eliminationNumber);
        
        // Eliminate players who selected this number
        participants.forEach(p => {
          if (p.selected_number === eliminationNumber && remainingPlayers.has(p.player_id)) {
            remainingPlayers.delete(p.player_id);
          }
        });

        // Emit elimination event
        const io = (global as any).io;
        if (io) {
          io.to(`game:${gameId}`).emit('number-eliminated', {
            number: eliminationNumber,
            remainingPlayers: remainingPlayers.size
          });
        }

        // Small delay for dramatic effect
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // The remaining players are the winners
    const winners = participants.filter(p => remainingPlayers.has(p.player_id));
    await this.processWinners(gameId, winners, settings);
  }

  private async determineWinners(
    gameId: string,
    participants: any[],
    winningNumbers: number[],
    settings: PickNumberSettings
  ): Promise<void> {
    const winners = participants.filter(p => winningNumbers.includes(p.selected_number));
    await this.processWinners(gameId, winners, settings);
  }

  private async processWinners(
    gameId: string,
    winners: any[],
    settings: PickNumberSettings
  ): Promise<void> {
    const now = new Date();

    await this.db.transaction(async (client) => {
      // Get prize distribution if enabled
      let prizeDistribution = null;
      if (settings.enablePrizes && settings.prizeDistribution) {
        const distResult = await client.query(`
          SELECT pd.*, p.*
          FROM prize_distributions pd
          JOIN prizes p ON pd.id = p.distribution_id
          WHERE pd.game_id = $1
          ORDER BY p.position
        `, [gameId]);
        
        prizeDistribution = distResult.rows;
      }

      // Update winners
      for (let i = 0; i < winners.length; i++) {
        const winner = winners[i];
        let prizeAmount = 0;
        
        // Calculate prize based on position
        if (prizeDistribution && i < prizeDistribution.length) {
          const prize = prizeDistribution[i];
          const totalPrizePool = settings.prizePool?.amount || 0;
          prizeAmount = (totalPrizePool * prize.percentage) / 100;
          
          // Update prize record with winner
          await client.query(`
            UPDATE prizes
            SET winner_id = $1, amount = $2
            WHERE distribution_id = $3 AND position = $4
          `, [winner.player_id, prizeAmount, prize.distribution_id, i + 1]);
        }

        // Update participant as winner
        await client.query(`
          UPDATE game_participants
          SET is_winner = true, prize_amount = $1, prize_type = $2
          WHERE game_id = $3 AND player_id = $4
        `, [prizeAmount, settings.prizePool?.currency || 'POINTS', gameId, winner.player_id]);

        // Update player stats
        await client.query(`
          UPDATE players SET total_games_won = total_games_won + 1, updated_at = $1
          WHERE id = $2
        `, [now, winner.player_id]);

        await this.logGameAction(client, gameId, GameAction.WINNER_SELECTED, winner.player_id, {
          selectedNumber: winner.selected_number,
          position: i + 1,
          prizeAmount
        });
      }

      // Update game status
      await client.query(`
        UPDATE games SET status = $1, ended_at = $2, updated_at = $3
        WHERE id = $4
      `, [GameStatus.COMPLETED, now, now, gameId]);

      await this.logGameAction(client, gameId, GameAction.GAME_COMPLETED, null, {
        winners: winners.map(w => ({
          playerId: w.player_id,
          username: w.username,
          selectedNumber: w.selected_number
        })),
        totalParticipants: winners.length
      });
    });

    // Clear game from cache
    await this.redis.deleteGame(gameId);

    // Send webhooks
    await this.webhook.sendWebhook('winnerSelected', { gameId, winners });
    await this.webhook.sendWebhook('gameEnd', { gameId, winners });

    // Emit final results
    const io = (global as any).io;
    if (io) {
      io.to(`game:${gameId}`).emit('game-completed', {
        winners: winners.map(w => ({
          playerId: w.player_id,
          username: w.username,
          displayName: w.display_name,
          selectedNumber: w.selected_number
        }))
      });
    }
  }

  private async endGameWithNoWinners(gameId: string): Promise<void> {
    const now = new Date();
    
    await this.db.query(`
      UPDATE games SET status = $1, ended_at = $2, updated_at = $3
      WHERE id = $4
    `, [GameStatus.CANCELLED, now, now, gameId]);

    await this.logGameAction(null, gameId, GameAction.GAME_CANCELLED, null, {
      reason: 'No players selected numbers',
      cancelledAt: now
    });

    await this.redis.deleteGame(gameId);
    // Use gameEnd webhook for cancellation
    await this.webhook.sendWebhook('gameEnd', { gameId, cancelled: true, reason: 'No players selected numbers' });
  }

  // Helper method to generate automatic prize distribution
  static generateAutoPrizeDistribution(
    totalPrizes: number,
    firstPrizePercentage: number = 50
  ): PrizeDistribution {
    const prizes: Prize[] = [];
    let remainingPercentage = 100;
    let remainingPrizes = totalPrizes;

    // First prize
    prizes.push({
      position: 1,
      percentage: firstPrizePercentage,
      amount: 0
    });
    remainingPercentage -= firstPrizePercentage;
    remainingPrizes--;

    // Distribute remaining percentage
    if (remainingPrizes > 0) {
      const basePercentage = remainingPercentage / remainingPrizes;
      const decrementFactor = 0.7; // Each subsequent prize is 70% of the previous

      let currentPercentage = basePercentage * 1.5; // Start higher
      
      for (let i = 2; i <= totalPrizes; i++) {
        if (i === totalPrizes) {
          // Last prize gets all remaining percentage
          prizes.push({
            position: i,
            percentage: remainingPercentage,
            amount: 0
          });
        } else {
          const percentage = Math.min(currentPercentage, remainingPercentage - (totalPrizes - i));
          prizes.push({
            position: i,
            percentage: Math.round(percentage * 100) / 100,
            amount: 0
          });
          remainingPercentage -= percentage;
          currentPercentage *= decrementFactor;
        }
      }
    }

    return {
      totalPrizes,
      prizes,
      autoCalculate: true
    };
  }

  // Helper methods
  private getDefaultPickNumberSettings(customSettings?: Partial<PickNumberSettings>): PickNumberSettings {
    const defaults = config.games.pickNumber;
    
    return {
      timeLimit: customSettings?.timeLimit || defaults.defaultTimeLimit,
      joinTimeLimit: customSettings?.joinTimeLimit || defaults.joinTimeLimit,
      minPlayers: customSettings?.minPlayers || defaults.minPlayers,
      maxPlayers: customSettings?.maxPlayers || defaults.maxPlayers,
      numberRange: customSettings?.numberRange || { 
        min: 1, 
        max: 100 
      },
      allowDuplicateNumbers: customSettings?.allowDuplicateNumbers ?? false,
      maxWinners: customSettings?.maxWinners || 1,
      announceInterval: customSettings?.announceInterval || defaults.announceInterval,
      autoStart: customSettings?.autoStart ?? true,
      enablePrizes: customSettings?.enablePrizes ?? false,
      isReverseMode: customSettings?.isReverseMode ?? false,
      prizeDistribution: customSettings?.prizeDistribution,
      prizePool: customSettings?.prizePool
    };
  }

  private calculateNumberRange(playerCount: number, settings: PickNumberSettings): { min: number; max: number } {
    const multiplier = config.games.pickNumber.numberMultiplier;
    const maxNumbers = Math.min(
      Math.floor(playerCount * multiplier),
      config.games.pickNumber.maxNumbers
    );
    
    return {
      min: 1,
      max: Math.max(maxNumbers, playerCount + 5) // Ensure some buffer
    };
  }

  // Database query methods
  async getGame(gameId: string): Promise<Game | null> {
    // Try cache first
    const cached = await this.redis.getGame(gameId);
    if (cached) return cached;

    const result = await this.db.query(`
      SELECT * FROM games WHERE id = $1
    `, [gameId]);

    if (result.rows.length === 0) return null;

    const game = this.mapRowToGame(result.rows[0]);
    
    // Cache for 1 minute
    await this.redis.setGame(gameId, game);
    
    return game;
  }

  private async getGameParticipant(gameId: string, telegramUserId: number): Promise<GameParticipant | null> {
    const result = await this.db.query(`
      SELECT gp.* FROM game_participants gp
      JOIN players p ON gp.player_id = p.id
      WHERE gp.game_id = $1 AND p.telegram_user_id = $2
    `, [gameId, telegramUserId]);

    if (result.rows.length === 0) return null;

    return result.rows[0];
  }

  private async getGameParticipantByPlayerId(gameId: string, playerId: string): Promise<GameParticipant | null> {
    const result = await this.db.query(
      'SELECT * FROM game_participants WHERE game_id = $1 AND player_id = $2',
      [gameId, playerId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  private async getOrCreatePlayer(telegramUser: TelegramUser): Promise<Player> {
    const existing = await this.db.query(`
      SELECT * FROM players WHERE telegram_user_id = $1
    `, [telegramUser.id]);

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    // Create new player
    const playerId = uuidv4();
    const now = new Date();
    
    const newPlayer: Player = {
      id: playerId,
      telegram_user_id: telegramUser.id,
      username: telegramUser.username,
      display_name: telegramUser.first_name || telegramUser.username || `User${telegramUser.id}`,
      created_at: now,
      updated_at: now,
      total_games_played: 0,
      total_games_won: 0,
      is_active: true,
      is_banned: false
    };

    await this.db.query(`
      INSERT INTO players (
        id, telegram_user_id, username, display_name,
        created_at, updated_at, total_games_played, total_games_won,
        is_active, is_banned
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      newPlayer.id, newPlayer.telegram_user_id, newPlayer.username,
      newPlayer.display_name, newPlayer.created_at, newPlayer.updated_at,
      newPlayer.total_games_played, newPlayer.total_games_won,
      newPlayer.is_active, newPlayer.is_banned
    ]);

    return newPlayer;
  }

  private async getNumberSelection(gameId: string, number: number): Promise<NumberSelection | null> {
    const result = await this.db.query(
      'SELECT * FROM number_selections WHERE game_id = $1 AND number = $2',
      [gameId, number]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  private async getAllNumberSelections(gameId: string): Promise<NumberSelection[]> {
    const result = await this.db.query(
      'SELECT * FROM number_selections WHERE game_id = $1 ORDER BY selected_at',
      [gameId]
    );

    return result.rows;
  }

  private async checkAllPlayersSelected(gameId: string): Promise<boolean> {
    const result = await this.db.query(`
      SELECT COUNT(*) as total_players,
             COUNT(selected_number) as players_selected
      FROM game_participants 
      WHERE game_id = $1
    `, [gameId]);

    const { total_players, players_selected } = result.rows[0];
    return parseInt(total_players) === parseInt(players_selected);
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
    const timestamp = new Date();

    await (client || this.db).query(`
      INSERT INTO game_history (
        id, game_id, action, actor_id, data, timestamp, message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      historyId, gameId, action, actorId,
      JSON.stringify(data || {}), timestamp, message
    ]);
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
      settings: typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings,
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

  async joinGame(request: PlayerJoinRequest): Promise<{ success: boolean; message: string; participant?: GameParticipant }> {
    const game = await this.getGame(request.gameId);
    if (!game) {
      return { success: false, message: 'Game not found' };
    }

    if (game.status !== GameStatus.WAITING_FOR_PLAYERS && game.status !== GameStatus.PLAYERS_JOINING && game.status !== GameStatus.CREATED) {
      return { success: false, message: 'Game is not accepting new players' };
    }

    if (game.total_players >= game.max_players) {
      return { success: false, message: 'Game is full' };
    }

    // Check if player already joined
    const existingParticipant = await this.getGameParticipant(request.gameId, request.telegramUserId);
    if (existingParticipant) {
      return { success: false, message: 'You have already joined this game' };
    }

    // Get or create player
    const player = await this.getOrCreatePlayer({
      id: request.telegramUserId,
      username: request.username,
      first_name: request.displayName
    });

    const participantId = uuidv4();
    const now = new Date();

    const participant: GameParticipant = {
      id: participantId,
      game_id: request.gameId,
      player_id: player.id,
      joined_at: now,
      is_winner: false
    };

    await this.db.transaction(async (client) => {
      // Insert participant
      await client.query(`
        INSERT INTO game_participants (
          id, game_id, player_id, joined_at, is_winner
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        participant.id, participant.game_id, participant.player_id,
        participant.joined_at, participant.is_winner
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

      // Update game status if this is the first player
      if (game.total_players === 0 && game.status === GameStatus.CREATED) {
        await client.query(`
          UPDATE games SET status = $1, updated_at = $2
          WHERE id = $3
        `, [GameStatus.WAITING_FOR_PLAYERS, now, request.gameId]);
      }

      // Log action
      await this.logGameAction(client, request.gameId, GameAction.PLAYER_JOINED, player.id, {
        telegramUserId: request.telegramUserId,
        username: request.username,
        displayName: request.displayName
      });
    });

    // Update cached game
    game.total_players += 1;
    game.updated_at = now;
    if (game.total_players === 1 && game.status === GameStatus.CREATED) {
      game.status = GameStatus.WAITING_FOR_PLAYERS;
    }
    await this.redis.setGame(request.gameId, game);

    // Send webhook
    await this.webhook.sendWebhook('playerJoin', { game, player, participant });

    // Check if we should auto-start the game
    if (game.settings.pickNumber?.autoStart && game.total_players >= game.min_players) {
      await this.startNumberSelectionPhase(request.gameId);
    }

    return { success: true, message: 'Successfully joined the game!', participant };
  }

  async startNumberSelectionPhase(gameId: string): Promise<void> {
    const game = await this.getGame(gameId);
    if (!game || (game.status !== GameStatus.WAITING_FOR_PLAYERS && game.status !== GameStatus.PLAYERS_JOINING)) {
      return;
    }

    const now = new Date();
    const settings = game.settings.pickNumber!;
    const selectionDeadline = new Date(now.getTime() + (settings.timeLimit * 1000));

    await this.db.query(`
      UPDATE games 
      SET status = $1, started_at = $2, selection_deadline = $3, updated_at = $4
      WHERE id = $5
    `, [GameStatus.NUMBER_SELECTION, now, selectionDeadline, now, gameId]);

    // Update cache
    game.status = GameStatus.NUMBER_SELECTION;
    game.started_at = now;
    game.selection_deadline = selectionDeadline;
    game.updated_at = now;
    
    await this.redis.setGame(gameId, game);

    // Schedule automatic drawing if time runs out
    // Using promise to avoid direct setTimeout issues
    new Promise<void>((resolve) => {
      setTimeout(() => {
        this.performDrawing(gameId);
        resolve();
      }, settings.timeLimit * 1000);
    });

    await this.logGameAction(null, gameId, GameAction.GAME_STARTED, game.created_by, {
      selectionDeadline,
      numberRange: settings.numberRange,
      playerCount: game.total_players
    });

    // Emit socket event
    const io = (global as any).io;
    if (io) {
      io.to(`game:${gameId}`).emit('game-started', {
        gameId,
        status: GameStatus.NUMBER_SELECTION,
        deadline: selectionDeadline
      });
    }
  }
}

export default GameService;