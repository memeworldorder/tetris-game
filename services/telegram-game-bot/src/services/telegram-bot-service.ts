import TelegramBot from 'node-telegram-bot-api';
import GameService from './game-service';
import RedisService from './redis-service';
import config from '@/config/config';
import {
  Game,
  GameType,
  GameStatus,
  Player,
  TelegramBotCommand,
  BotResponse,
  GameCreationRequest,
  PlayerJoinRequest,
  NumberSelectionRequest
} from '@/models/types';

export class TelegramBotService {
  private bot: TelegramBot;
  private gameService: GameService;
  private redis: RedisService;
  private static instance: TelegramBotService;
  private commands: TelegramBotCommand[] = [
    { command: 'start', description: 'Start the bot and see available commands' },
    { command: 'help', description: 'Show help message with all commands' },
    { command: 'join', description: 'Join the current active game' },
    { command: 'status', description: 'Check current game status' },
    { command: 'games', description: 'List active games' },
    { command: 'stats', description: 'Show your game statistics' },
    { command: 'leaderboard', description: 'Show top players' },
    { command: 'create_game', description: 'Create a new pick number game', adminOnly: true },
    { command: 'cancel_game', description: 'Cancel an active game', adminOnly: true },
    { command: 'game_settings', description: 'Configure game settings', adminOnly: true }
  ];

  private constructor() {
    this.bot = new TelegramBot(config.telegram.botToken, { polling: true });
    this.gameService = new GameService();
    this.redis = RedisService.getInstance();
    this.setupBot();
  }

  public static getInstance(): TelegramBotService {
    if (!TelegramBotService.instance) {
      TelegramBotService.instance = new TelegramBotService();
    }
    return TelegramBotService.instance;
  }

  private setupBot(): void {
    // Set bot commands
    this.bot.setMyCommands(
      this.commands.filter(cmd => !cmd.adminOnly).map(cmd => ({
        command: cmd.command,
        description: cmd.description
      }))
    );

    // Handle text messages
    this.bot.on('message', async (msg) => {
      try {
        await this.handleMessage(msg);
      } catch (error) {
        console.error('Error handling message:', error);
        await this.sendErrorMessage(msg.chat.id, 'An error occurred while processing your message.');
      }
    });

    // Handle callback queries (inline keyboard buttons)
    this.bot.on('callback_query', async (callbackQuery) => {
      try {
        await this.handleCallbackQuery(callbackQuery);
      } catch (error) {
        console.error('Error handling callback query:', error);
        await this.bot.answerCallbackQuery(callbackQuery.id, {
          text: 'An error occurred. Please try again.',
          show_alert: true
        });
      }
    });

    // Error handling
    this.bot.on('error', (error) => {
      console.error('Telegram bot error:', error);
    });

    console.log('Telegram bot initialized and listening...');
  }

  private async handleMessage(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const text = msg.text;

    if (!text || !userId) return;

    // Check rate limiting
    const rateLimit = await this.redis.checkRateLimit(
      `user:${userId}`,
      10, // 10 messages
      60  // per minute
    );

    if (!rateLimit.allowed) {
      await this.sendMessage(chatId, 'Please slow down! You are sending messages too quickly.');
      return;
    }

    // Handle commands
    if (text.startsWith('/')) {
      await this.handleCommand(msg);
      return;
    }

    // Handle number selection if user is in a game
    const session = await this.redis.getPlayerSession(userId);
    if (session && session.waitingForNumber) {
      await this.handleNumberSelection(msg, session);
      return;
    }

    // Handle general messages
    await this.handleGeneralMessage(msg);
  }

  private async handleCommand(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const userId = msg.from!.id;
    const command = msg.text!.split(' ')[0].replace('/', '');
    const args = msg.text!.split(' ').slice(1);

    switch (command) {
      case 'start':
        await this.handleStartCommand(chatId, userId);
        break;
      case 'help':
        await this.handleHelpCommand(chatId);
        break;
      case 'join':
        await this.handleJoinCommand(chatId, userId, msg.from!);
        break;
      case 'status':
        await this.handleStatusCommand(chatId);
        break;
      case 'games':
        await this.handleGamesCommand(chatId);
        break;
      case 'stats':
        await this.handleStatsCommand(chatId, userId);
        break;
      case 'leaderboard':
        await this.handleLeaderboardCommand(chatId);
        break;
      case 'create_game':
        await this.handleCreateGameCommand(chatId, userId, args);
        break;
      case 'cancel_game':
        await this.handleCancelGameCommand(chatId, userId, args);
        break;
      case 'game_settings':
        await this.handleGameSettingsCommand(chatId, userId);
        break;
      default:
        await this.sendMessage(chatId, 'Unknown command. Type /help to see available commands.');
    }
  }

  private async handleCallbackQuery(callbackQuery: TelegramBot.CallbackQuery): Promise<void> {
    const chatId = callbackQuery.message?.chat.id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;

    if (!chatId || !data) return;

    await this.bot.answerCallbackQuery(callbackQuery.id);

    const [action, ...params] = data.split(':');

    switch (action) {
      case 'join_game':
        const gameId = params[0];
        await this.processJoinGame(chatId, userId, callbackQuery.from, gameId);
        break;
      case 'select_number':
        const [selectGameId, number] = params;
        await this.processNumberSelection(chatId, userId, selectGameId, parseInt(number));
        break;
      case 'show_numbers':
        const showGameId = params[0];
        await this.showNumberSelection(chatId, userId, showGameId);
        break;
      case 'refresh_game':
        const refreshGameId = params[0];
        await this.refreshGameStatus(chatId, refreshGameId);
        break;
    }
  }

  // Command handlers
  private async handleStartCommand(chatId: number, userId: number): Promise<void> {
    const welcomeMessage = `
🎮 *Welcome to Community Game Bot!*

I help you play fun community games with your friends!

*Available Games:*
🔢 Pick Your Number - Select a number and see if you win!

*Commands:*
/join - Join the current active game
/status - Check current game status
/games - List active games
/stats - Show your statistics
/help - Show this help message

Let's start playing! 🚀
    `;

    await this.sendMessage(chatId, welcomeMessage, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎯 Join Active Game', callback_data: 'join_game:current' }],
          [{ text: '📊 Game Status', callback_data: 'refresh_game:current' }],
          [{ text: '🏆 Leaderboard', callback_data: 'show_leaderboard' }]
        ]
      }
    });
  }

  private async handleHelpCommand(chatId: number): Promise<void> {
    const helpMessage = this.commands
      .filter(cmd => !cmd.adminOnly)
      .map(cmd => `/${cmd.command} - ${cmd.description}`)
      .join('\n');

    await this.sendMessage(chatId, `*Available Commands:*\n\n${helpMessage}`, {
      parse_mode: 'Markdown'
    });
  }

  private async handleJoinCommand(chatId: number, userId: number, user: TelegramBot.User): Promise<void> {
    // Find active game in this chat
    const activeGame = await this.findActiveGameInChat(chatId.toString());
    
    if (!activeGame) {
      await this.sendMessage(chatId, 'No active games in this chat. An admin can create one with /create_game');
      return;
    }

    await this.processJoinGame(chatId, userId, user, activeGame.id);
  }

  private async handleStatusCommand(chatId: number): Promise<void> {
    const activeGame = await this.findActiveGameInChat(chatId.toString());
    
    if (!activeGame) {
      await this.sendMessage(chatId, 'No active games in this chat.');
      return;
    }

    await this.sendGameStatus(chatId, activeGame);
  }

  private async handleCreateGameCommand(chatId: number, userId: number, args: string[]): Promise<void> {
    // Check if user is admin
    if (!await this.isUserAdmin(chatId, userId)) {
      await this.sendMessage(chatId, 'Only admins can create games.');
      return;
    }

    // Check if there's already an active game
    const existingGame = await this.findActiveGameInChat(chatId.toString());
    if (existingGame) {
      await this.sendMessage(chatId, 'There is already an active game in this chat. Cancel it first with /cancel_game');
      return;
    }

    const title = args.length > 0 ? args.join(' ') : 'Pick Your Number Game';
    
    const gameRequest: GameCreationRequest = {
      type: GameType.PICK_NUMBER,
      title,
      description: 'Select a number and see if you win!',
      chatId: chatId.toString(),
      settings: {
        pickNumber: {
          timeLimit: config.games.pickNumber.defaultTimeLimit,
          joinTimeLimit: config.games.pickNumber.joinTimeLimit,
          minPlayers: config.games.pickNumber.minPlayers,
          maxPlayers: config.games.pickNumber.maxPlayers,
          numberRange: { min: 1, max: 100 },
          allowDuplicateNumbers: false,
          maxWinners: 1,
          announceInterval: config.games.pickNumber.announceInterval,
          autoStart: true,
          enablePrizes: false
        }
      }
    };

    try {
      const game = await this.gameService.createGame(gameRequest, userId.toString());
      await this.announceNewGame(chatId, game);
    } catch (error) {
      console.error('Error creating game:', error);
      await this.sendMessage(chatId, 'Failed to create game. Please try again.');
    }
  }

  // Game interaction methods
  private async processJoinGame(
    chatId: number, 
    userId: number, 
    user: TelegramBot.User, 
    gameId: string
  ): Promise<void> {
    const request: PlayerJoinRequest = {
      gameId,
      telegramUserId: userId,
      username: user.username,
      displayName: user.first_name || user.username || `User${userId}`
    };

    const result = await this.gameService.joinGame(request);
    
    if (result.success) {
      await this.sendMessage(chatId, `✅ ${result.message}`);
      
      // If game starts automatically, show number selection
      const game = await this.gameService.getGame(gameId);
      if (game?.status === GameStatus.NUMBER_SELECTION) {
        await this.showNumberSelection(chatId, userId, gameId);
      }
    } else {
      await this.sendMessage(chatId, `❌ ${result.message}`);
    }
  }

  private async showNumberSelection(chatId: number, userId: number, gameId: string): Promise<void> {
    const game = await this.gameService.getGame(gameId);
    if (!game || game.status !== GameStatus.NUMBER_SELECTION) {
      await this.sendMessage(chatId, 'Number selection is not currently active.');
      return;
    }

    const settings = game.settings.pickNumber!;
    const availableNumbers = await this.redis.getAvailableNumbers(gameId, settings.numberRange.max);
    
    // Create number selection keyboard
    const keyboard = this.createNumberKeyboard(availableNumbers.slice(0, 20), gameId); // Show first 20 numbers
    
    const timeLeft = game.selection_deadline 
      ? Math.max(0, Math.floor((game.selection_deadline.getTime() - Date.now()) / 1000))
      : settings.timeLimit;

    const message = `
🎯 *Select Your Number*

Game: ${game.title}
Range: ${settings.numberRange.min} - ${settings.numberRange.max}
Time left: ${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}

Choose a number below or type it in chat:
    `;

    await this.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });

    // Set user session for number input
    await this.redis.setPlayerSession(userId, {
      gameId,
      waitingForNumber: true,
      chatId
    }, 300); // 5 minutes
  }

  private async processNumberSelection(
    chatId: number, 
    userId: number, 
    gameId: string, 
    number: number
  ): Promise<void> {
    // Get player ID from database
    const player = await this.getPlayerByTelegramId(userId);
    if (!player) {
      await this.sendMessage(chatId, 'Player not found. Please join the game first.');
      return;
    }

    const request: NumberSelectionRequest = {
      gameId,
      playerId: player.id,
      number
    };

    const result = await this.gameService.selectNumber(request);
    
    if (result.success) {
      await this.sendMessage(chatId, `✅ ${result.message}`);
      await this.redis.deletePlayerSession(userId);
    } else {
      await this.sendMessage(chatId, `❌ ${result.message}`);
    }
  }

  // Announcement methods
  async announceNewGame(chatId: number, game: Game): Promise<void> {
    const settings = game.settings.pickNumber!;
    
    const message = `
🎮 *New Game Created!*

📝 **${game.title}**
${game.description || ''}

🎯 **Game Type:** Pick Your Number
👥 **Players:** ${settings.minPlayers} - ${settings.maxPlayers}
⏱️ **Join Time:** ${settings.joinTimeLimit} seconds
⌛ **Selection Time:** ${settings.timeLimit} seconds

Click the button below to join!
    `;

    await this.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎯 Join Game', callback_data: `join_game:${game.id}` }],
          [{ text: '📊 Game Info', callback_data: `refresh_game:${game.id}` }]
        ]
      }
    });

    // Set message ID for later updates
    // Note: In a real implementation, you'd store this message ID to update it
  }

  async announceGameStart(chatId: number, game: Game): Promise<void> {
    const settings = game.settings.pickNumber!;
    
    const message = `
🚀 *Game Started!*

🎯 **${game.title}**
👥 **Players:** ${game.total_players}
🔢 **Number Range:** ${settings.numberRange.min} - ${settings.numberRange.max}
⏱️ **Time Limit:** ${Math.floor(settings.timeLimit / 60)} minutes

Select your numbers now! Good luck! 🍀
    `;

    await this.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔢 Select Number', callback_data: `show_numbers:${game.id}` }]
        ]
      }
    });
  }

  async announceWinner(chatId: number, game: Game, winners: string[]): Promise<void> {
    // Get winner details
    const winnerNames = await Promise.all(
      winners.map(async (winnerId) => {
        const player = await this.getPlayerById(winnerId);
        return player?.display_name || 'Unknown Player';
      })
    );

    const message = `
🎉 *Game Complete!*

🏆 **Winner${winners.length > 1 ? 's' : ''}:** ${winnerNames.join(', ')}
🎯 **Game:** ${game.title}
👥 **Total Players:** ${game.total_players}

Congratulations! 🥳

Want to play again? An admin can create a new game with /create_game
    `;

    await this.sendMessage(chatId, message, {
      parse_mode: 'Markdown'
    });
  }

  // Utility methods
  private createNumberKeyboard(numbers: number[], gameId: string): TelegramBot.InlineKeyboardButton[][] {
    const keyboard: TelegramBot.InlineKeyboardButton[][] = [];
    
    for (let i = 0; i < numbers.length; i += 5) {
      const row = numbers.slice(i, i + 5).map(num => ({
        text: num.toString(),
        callback_data: `select_number:${gameId}:${num}`
      }));
      keyboard.push(row);
    }

    return keyboard;
  }

  private async sendMessage(
    chatId: number, 
    text: string, 
    options?: TelegramBot.SendMessageOptions
  ): Promise<TelegramBot.Message> {
    return this.bot.sendMessage(chatId, text, options);
  }

  private async sendErrorMessage(chatId: number, error: string): Promise<void> {
    await this.sendMessage(chatId, `❌ Error: ${error}`);
  }

  private async isUserAdmin(chatId: number, userId: number): Promise<boolean> {
    try {
      const member = await this.bot.getChatMember(chatId, userId);
      return ['creator', 'administrator'].includes(member.status);
    } catch {
      return false;
    }
  }

  private async findActiveGameInChat(chatId: string): Promise<Game | null> {
    // This would be implemented to query active games by chat ID
    // For now, return null - implement based on your database schema
    return null;
  }

  private async getPlayerByTelegramId(telegramId: number): Promise<any> {
    // Implementation to get player by Telegram ID
    return null;
  }

  private async getPlayerById(playerId: string): Promise<any> {
    // Implementation to get player by ID
    return null;
  }

  private async sendGameStatus(chatId: number, game: Game): Promise<void> {
    const statusMessage = `
📊 *Game Status*

🎯 **${game.title}**
📅 **Status:** ${game.status.replace('_', ' ').toUpperCase()}
👥 **Players:** ${game.total_players}/${game.max_players}
⏱️ **Created:** ${game.created_at.toLocaleString()}

${game.started_at ? `🚀 **Started:** ${game.started_at.toLocaleString()}` : ''}
${game.selection_deadline ? `⏰ **Selection Deadline:** ${game.selection_deadline.toLocaleString()}` : ''}
    `;

    await this.sendMessage(chatId, statusMessage, {
      parse_mode: 'Markdown'
    });
  }

  private async refreshGameStatus(chatId: number, gameId: string): Promise<void> {
    const game = await this.gameService.getGame(gameId);
    if (game) {
      await this.sendGameStatus(chatId, game);
    } else {
      await this.sendMessage(chatId, 'Game not found.');
    }
  }

  private async handleNumberSelection(msg: TelegramBot.Message, session: any): Promise<void> {
    const number = parseInt(msg.text!);
    if (isNaN(number)) {
      await this.sendMessage(msg.chat.id, 'Please enter a valid number.');
      return;
    }

    await this.processNumberSelection(msg.chat.id, msg.from!.id, session.gameId, number);
  }

  private async handleGeneralMessage(msg: TelegramBot.Message): Promise<void> {
    // Handle general conversation or provide help
    await this.sendMessage(msg.chat.id, 'Type /help to see available commands or /join to join a game!');
  }

  // Additional command handlers would go here...
  private async handleGamesCommand(chatId: number): Promise<void> {
    await this.sendMessage(chatId, 'Games list feature coming soon!');
  }

  private async handleStatsCommand(chatId: number, userId: number): Promise<void> {
    await this.sendMessage(chatId, 'Stats feature coming soon!');
  }

  private async handleLeaderboardCommand(chatId: number): Promise<void> {
    await this.sendMessage(chatId, 'Leaderboard feature coming soon!');
  }

  private async handleCancelGameCommand(chatId: number, userId: number, args: string[]): Promise<void> {
    await this.sendMessage(chatId, 'Cancel game feature coming soon!');
  }

  private async handleGameSettingsCommand(chatId: number, userId: number): Promise<void> {
    await this.sendMessage(chatId, 'Game settings feature coming soon!');
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      // Test bot connectivity
      await this.bot.getMe();
      return true;
    } catch (error) {
      console.error('Telegram bot health check failed:', error);
      return false;
    }
  }

  async stop(): Promise<void> {
    await this.bot.stopPolling();
    console.log('Telegram bot stopped');
  }
}

export default TelegramBotService;