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
  TelegramUser
} from '@/models/types';
import config from '@/config/config';

export class GameService {
  private db = Database;
  private redis = RedisService.getInstance();
  private webhook = WebhookService.getInstance();

  async createGame(request: GameCreationRequest, createdBy: string): Promise<Game> {
    const gameId = uuidv4();
    const now = new Date();
    
    // Set default settings for pick number game
    const settings = this.getDefaultPickNumberSettings(request.settings.pickNumber);
    
    const game: Game = {
      id: gameId,
      type: request.type,
      status: GameStatus.CREATED,
      title: request.title,
      description: request.description,
      created_by: createdBy,
      chat_id: request.chatId,
      settings: { pickNumber: settings },
      created_at: now,
      updated_at: now,
      total_players: 0,
      max_players: settings.maxPlayers,
      min_players: settings.minPlayers,
      time_limit: settings.timeLimit
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

      // Log game creation
      await this.logGameAction(client, gameId, GameAction.GAME_CREATED, createdBy, {
        title: game.title,
        settings: game.settings
      });
    });

    // Cache game in Redis
    await this.redis.setGame(gameId, game);

    // Send webhook
    await this.webhook.sendWebhook('GAME_START', { game });

    return game;
  }

  async joinGame(request: PlayerJoinRequest): Promise<{ success: boolean; message: string; participant?: GameParticipant }> {
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
    await this.redis.setGame(request.gameId, game);

    // Send webhook
    await this.webhook.sendWebhook('PLAYER_JOIN', { game, player, participant });

    // Check if we should auto-start the game
    if (game.settings.pickNumber?.autoStart && game.total_players >= game.min_players) {
      await this.startNumberSelectionPhase(request.gameId);
    }

    return { success: true, message: 'Successfully joined the game!', participant };
  }

  async selectNumber(request: NumberSelectionRequest): Promise<{ success: boolean; message: string }> {
    const game = await this.getGame(request.gameId);
    if (!game) {
      return { success: false, message: 'Game not found' };
    }

    if (game.status !== GameStatus.NUMBER_SELECTION) {
      return { success: false, message: 'Number selection is not currently active' };
    }

    const participant = await this.getGameParticipantByPlayerId(request.gameId, request.playerId);
    if (!participant) {
      return { success: false, message: 'You are not participating in this game' };
    }

    if (participant.selected_number !== null && participant.selected_number !== undefined) {
      return { success: false, message: 'You have already selected a number' };
    }

    const settings = game.settings.pickNumber!;
    
    // Validate number range
    if (request.number < settings.numberRange.min || request.number > settings.numberRange.max) {
      return { 
        success: false, 
        message: `Number must be between ${settings.numberRange.min} and ${settings.numberRange.max}` 
      };
    }

    // Check if number is already taken (if duplicates not allowed)
    if (!settings.allowDuplicateNumbers) {
      const existingSelection = await this.getNumberSelection(request.gameId, request.number);
      if (existingSelection) {
        return { success: false, message: 'This number has already been selected' };
      }
    }

    const now = new Date();
    const selectionId = uuidv4();

    await this.db.transaction(async (client) => {
      // Insert number selection
      await client.query(`
        INSERT INTO number_selections (
          id, game_id, player_id, number, selected_at, is_available
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [selectionId, request.gameId, request.playerId, request.number, now, true]);

      // Update participant
      await client.query(`
        UPDATE game_participants 
        SET selected_number = $1, selection_time = $2
        WHERE game_id = $3 AND player_id = $4
      `, [request.number, now, request.gameId, request.playerId]);

      // Log action
      await this.logGameAction(client, request.gameId, GameAction.NUMBER_SELECTED, request.playerId, {
        number: request.number,
        selectionTime: now
      });
    });

    // Send webhook
    await this.webhook.sendWebhook('NUMBER_SELECTED', { 
      game, 
      playerId: request.playerId, 
      number: request.number 
    });

    // Check if all players have selected numbers
    const allSelected = await this.checkAllPlayersSelected(request.gameId);
    if (allSelected) {
      await this.startDrawing(request.gameId);
    }

    return { success: true, message: `Number ${request.number} selected successfully!` };
  }

  async startNumberSelectionPhase(gameId: string): Promise<void> {
    const game = await this.getGame(gameId);
    if (!game || game.status !== GameStatus.WAITING_FOR_PLAYERS) {
      return;
    }

    const now = new Date();
    const settings = game.settings.pickNumber!;
    const selectionDeadline = new Date(now.getTime() + (settings.timeLimit * 1000));

    // Generate number range based on player count
    const numberRange = this.calculateNumberRange(game.total_players, settings);

    await this.db.query(`
      UPDATE games 
      SET status = $1, started_at = $2, selection_deadline = $3, updated_at = $4,
          settings = $5
      WHERE id = $6
    `, [
      GameStatus.NUMBER_SELECTION, 
      now, 
      selectionDeadline, 
      now,
      JSON.stringify({
        ...game.settings,
        pickNumber: { ...settings, numberRange }
      }),
      gameId
    ]);

    // Update cache
    game.status = GameStatus.NUMBER_SELECTION;
    game.started_at = now;
    game.selection_deadline = selectionDeadline;
    game.updated_at = now;
    game.settings.pickNumber!.numberRange = numberRange;
    
    await this.redis.setGame(gameId, game);

    // Schedule automatic drawing if time runs out
    setTimeout(() => {
      this.startDrawing(gameId);
    }, settings.timeLimit * 1000);

    await this.logGameAction(null, gameId, GameAction.GAME_STARTED, game.created_by, {
      selectionDeadline,
      numberRange,
      playerCount: game.total_players
    });
  }

  async startDrawing(gameId: string): Promise<void> {
    const game = await this.getGame(gameId);
    if (!game || game.status !== GameStatus.NUMBER_SELECTION) {
      return;
    }

    await this.db.query(`
      UPDATE games SET status = $1, updated_at = $2 WHERE id = $3
    `, [GameStatus.DRAWING, new Date(), gameId]);

    // Get all number selections
    const selections = await this.getAllNumberSelections(gameId);
    if (selections.length === 0) {
      await this.cancelGame(gameId, 'No numbers were selected');
      return;
    }

    // Generate random winning number(s)
    const settings = game.settings.pickNumber!;
    const winners = await this.selectWinners(gameId, selections, settings);

    if (winners.length > 0) {
      await this.completeGame(gameId, winners);
    } else {
      await this.cancelGame(gameId, 'No winners could be determined');
    }
  }

  private async selectWinners(
    _gameId: string,
    selections: NumberSelection[],
    settings: PickNumberSettings
  ): Promise<string[]> {
    // Extract unique player IDs from the selections
    const uniquePlayerIds = Array.from(new Set(selections.map(s => s.player_id)));

    // Edge-case: If the total unique players is less than or equal to the requested winners,
    // simply return them all.
    if (uniquePlayerIds.length <= settings.maxWinners) {
      return uniquePlayerIds;
    }

    // Fisher-Yates shuffle to randomly order the players
    for (let i = uniquePlayerIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [uniquePlayerIds[i], uniquePlayerIds[j]] = [uniquePlayerIds[j], uniquePlayerIds[i]];
    }

    // Return the first N shuffled player IDs as winners
    return uniquePlayerIds.slice(0, settings.maxWinners);
  }

  private async completeGame(gameId: string, winnerIds: string[]): Promise<void> {
    const now = new Date();

    await this.db.transaction(async (client) => {
      // Update game status
      await client.query(`
        UPDATE games SET status = $1, ended_at = $2, updated_at = $3
        WHERE id = $4
      `, [GameStatus.COMPLETED, now, now, gameId]);

      // Mark winners
      for (const winnerId of winnerIds) {
        await client.query(`
          UPDATE game_participants SET is_winner = true
          WHERE game_id = $1 AND player_id = $2
        `, [gameId, winnerId]);

        await client.query(`
          UPDATE players SET total_games_won = total_games_won + 1, updated_at = $1
          WHERE id = $2
        `, [now, winnerId]);

        await this.logGameAction(client, gameId, GameAction.WINNER_SELECTED, winnerId, {
          winnerCount: winnerIds.length,
          completedAt: now
        });
      }

      await this.logGameAction(client, gameId, GameAction.GAME_COMPLETED, null, {
        winners: winnerIds,
        completedAt: now
      });
    });

    // Clear from cache
    await this.redis.deleteGame(gameId);

    // Send webhook
    const game = await this.getGame(gameId);
    await this.webhook.sendWebhook('WINNER_SELECTED', { game, winners: winnerIds });
    await this.webhook.sendWebhook('GAME_END', { game, winners: winnerIds });
  }

  private async cancelGame(gameId: string, reason: string): Promise<void> {
    const now = new Date();
    
    await this.db.query(`
      UPDATE games SET status = $1, ended_at = $2, updated_at = $3
      WHERE id = $4
    `, [GameStatus.CANCELLED, now, now, gameId]);

    await this.logGameAction(null, gameId, GameAction.GAME_CANCELLED, null, {
      reason,
      cancelledAt: now
    });

    await this.redis.deleteGame(gameId);

    const game = await this.getGame(gameId);
    await this.webhook.sendWebhook('GAME_CANCELLED', { game, reason });
  }

  // Helper methods
  private getDefaultPickNumberSettings(customSettings?: Partial<PickNumberSettings>): PickNumberSettings {
    const defaults = config.games.pickNumber;
    return {
      timeLimit: customSettings?.timeLimit || defaults.defaultTimeLimit,
      joinTimeLimit: customSettings?.joinTimeLimit || defaults.joinTimeLimit,
      minPlayers: customSettings?.minPlayers || defaults.minPlayers,
      maxPlayers: customSettings?.maxPlayers || defaults.maxPlayers,
      numberRange: customSettings?.numberRange || { min: 1, max: 100 },
      allowDuplicateNumbers: customSettings?.allowDuplicateNumbers || false,
      maxWinners: customSettings?.maxWinners || 1,
      announceInterval: customSettings?.announceInterval || defaults.announceInterval,
      autoStart: customSettings?.autoStart || true,
      enablePrizes: customSettings?.enablePrizes || false
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

    const result = await this.db.query(
      'SELECT * FROM games WHERE id = $1',
      [gameId]
    );
    
    if (result.rows.length === 0) return null;
    
    const game = this.mapRowToGame(result.rows[0]);
    await this.redis.setGame(gameId, game);
    return game;
  }

  private async getGameParticipant(gameId: string, telegramUserId: number): Promise<GameParticipant | null> {
    const result = await this.db.query(`
      SELECT gp.* FROM game_participants gp
      JOIN players p ON gp.player_id = p.id
      WHERE gp.game_id = $1 AND p.telegram_user_id = $2
    `, [gameId, telegramUserId]);

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  private async getGameParticipantByPlayerId(gameId: string, playerId: string): Promise<GameParticipant | null> {
    const result = await this.db.query(
      'SELECT * FROM game_participants WHERE game_id = $1 AND player_id = $2',
      [gameId, playerId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  private async getOrCreatePlayer(telegramUser: TelegramUser): Promise<Player> {
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

    result = await this.db.query(
      'SELECT * FROM players WHERE id = $1',
      [playerId]
    );

    return result.rows[0];
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

export default GameService;