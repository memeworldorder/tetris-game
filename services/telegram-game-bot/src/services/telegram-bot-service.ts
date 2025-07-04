import TelegramBot from 'node-telegram-bot-api';
import GameService from './game-service';
import QuizGameService from './quiz-game-service';
import WalletVerificationService from './wallet-verification-service';
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
  NumberSelectionRequest,
  QuizQuestion
} from '@/models/types';

export class TelegramBotService {
  private bot: TelegramBot;
  private gameService: GameService;
  private quizService: QuizGameService;
  private walletService: WalletVerificationService;
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
    { command: 'verify', description: 'Verify your Solana wallet for prize eligibility' },
    { command: 'create_game', description: 'Create a new pick number game', adminOnly: true },
    { command: 'start_quiz', description: 'Start a quiz game', adminOnly: true },
    { command: 'cancel_game', description: 'Cancel an active game', adminOnly: true },
    { command: 'settings', description: 'Configure game settings', adminOnly: true }
  ];

  private constructor() {
    this.bot = new TelegramBot(config.telegram.botToken, { polling: true });
    this.gameService = new GameService();
    this.quizService = new QuizGameService();
    this.walletService = WalletVerificationService.getInstance();
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
      case 'verify':
        await this.handleVerifyCommand(chatId, userId, msg.from!, args);
        break;
      case 'create_game':
        await this.handleCreateGameCommand(chatId, userId, args);
        break;
      case 'start_quiz':
        await this.handleStartQuizCommand(chatId, userId, args);
        break;
      case 'cancel_game':
        await this.handleCancelGameCommand(chatId, userId, args);
        break;
      case 'settings':
        await this.handleSettingsCommand(chatId, userId);
        break;
      default:
        await this.sendMessage(chatId, 'Unknown command. Type /help to see available commands.');
    }
  }

  private async handleCallbackQuery(callbackQuery: TelegramBot.CallbackQuery): Promise<void> {
    const data = callbackQuery.data;
    if (!data) return;

    const [action, ...params] = data.split(':');
    const chatId = callbackQuery.message!.chat.id;
    const userId = callbackQuery.from.id;

    try {
      await this.bot.answerCallbackQuery(callbackQuery.id);
    } catch (error) {
      console.error('Error answering callback query:', error);
    }

    switch (action) {
      case 'join_game':
        const joinGameId = params[0] === 'current' 
          ? (await this.findActiveGameInChat(chatId.toString()))?.id 
          : params[0];
        if (joinGameId) {
          await this.processJoinGame(chatId, userId, callbackQuery.from, joinGameId);
        }
        break;
      case 'select_number':
        const [selectGameId, number] = params;
        await this.processNumberSelection(chatId, userId, selectGameId, parseInt(number));
        // Update the message to show remaining numbers
        await this.updateNumberSelectionMessage(chatId, callbackQuery.message!.message_id, selectGameId);
        break;
      case 'page_numbers':
        const [pageGameId, page] = params;
        await this.showNumberSelectionPage(chatId, pageGameId, parseInt(page), callbackQuery.message!.message_id);
        break;
      case 'show_numbers':
        const showGameId = params[0];
        await this.showNumberSelection(chatId, userId, showGameId);
        break;
      case 'refresh_game':
        const refreshGameId = params[0];
        await this.refreshGameStatus(chatId, refreshGameId);
        break;
      case 'quiz_answer':
        const [quizGameId, questionNumber, answer] = params;
        await this.processQuizAnswer(chatId, userId, quizGameId, parseInt(questionNumber), parseInt(answer));
        break;
      case 'quick_create':
        const [mode, prizes] = params;
        await this.handleQuickCreate(chatId, userId, mode, parseInt(prizes));
        break;
      case 'show_prize_options':
        await this.showPrizeOptions(chatId);
        break;
      case 'noop':
        // No operation - just acknowledge
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

    // Parse arguments: /create_game [title] [reverse] [prizes]
    // Example: /create_game "Lucky Draw" reverse 3
    let title = 'Pick Your Number Game';
    let isReverseMode = false;
    let totalPrizes = 1;
    
    if (args.length > 0) {
      // Check for special flags
      const reverseIndex = args.indexOf('reverse');
      if (reverseIndex !== -1) {
        isReverseMode = true;
        args.splice(reverseIndex, 1); // Remove 'reverse' from args
      }
      
      // Check for prize count (last numeric argument)
      const lastArg = args[args.length - 1];
      if (!isNaN(parseInt(lastArg)) && parseInt(lastArg) >= 1 && parseInt(lastArg) <= 10) {
        totalPrizes = parseInt(lastArg);
        args.pop(); // Remove prize count from args
      }
      
      // Remaining args are the title
      if (args.length > 0) {
        title = args.join(' ');
      }
    }
    
    // Generate prize distribution if prizes > 1
    let prizeDistribution = undefined;
    if (totalPrizes > 1) {
      prizeDistribution = GameService.generateAutoPrizeDistribution(totalPrizes);
    }
    
    const gameRequest: GameCreationRequest = {
      type: GameType.PICK_NUMBER,
      title,
      description: isReverseMode 
        ? 'Numbers drawn will be eliminated! Last players standing win!' 
        : 'Select a number and see if you win!',
      chatId: chatId.toString(),
      settings: {
        pickNumber: {
          timeLimit: config.games.pickNumber.defaultTimeLimit,
          joinTimeLimit: config.games.pickNumber.joinTimeLimit,
          minPlayers: config.games.pickNumber.minPlayers,
          maxPlayers: config.games.pickNumber.maxPlayers,
          numberRange: { min: 1, max: 100 },
          allowDuplicateNumbers: false,
          maxWinners: totalPrizes,
          announceInterval: config.games.pickNumber.announceInterval,
          autoStart: true,
          enablePrizes: totalPrizes > 1,
          isReverseMode,
          prizeDistribution
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
    
    // Get the current game number state with available numbers
    const gameNumberState = await this.gameService.getGameNumberState(gameId);
    if (!gameNumberState) {
      await this.sendMessage(chatId, 'Unable to get game state.');
      return;
    }

    const availableNumbers = gameNumberState.availableNumbers;
    
    // Create pagination for large number ranges
    const pageSize = 25; // Show 25 numbers per page
    const totalPages = Math.ceil(availableNumbers.length / pageSize);
    const currentPage = 0; // Start at first page
    
    const keyboard = this.createNumberKeyboardPage(
      availableNumbers, 
      gameId, 
      currentPage, 
      pageSize, 
      totalPages
    );
    
    const timeLeft = game.selection_deadline 
      ? Math.max(0, Math.floor((game.selection_deadline.getTime() - Date.now()) / 1000))
      : settings.timeLimit;

    const modeText = settings.isReverseMode 
      ? '⚠️ REVERSE MODE: Numbers drawn will be ELIMINATED!' 
      : '🎯 Normal Mode: Numbers drawn will WIN!';

    const message = `
🎯 *Select Your Number*

Game: ${game.title}
${modeText}
Range: ${settings.numberRange.min} - ${settings.numberRange.max}
Available Numbers: ${availableNumbers.length}
Time left: ${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}

Choose a number below:
    `;

    await this.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  private createNumberKeyboardPage(
    numbers: number[], 
    gameId: string,
    currentPage: number,
    pageSize: number,
    totalPages: number
  ): TelegramBot.InlineKeyboardButton[][] {
    const keyboard: TelegramBot.InlineKeyboardButton[][] = [];
    
    // Calculate slice indices
    const startIdx = currentPage * pageSize;
    const endIdx = Math.min(startIdx + pageSize, numbers.length);
    const pageNumbers = numbers.slice(startIdx, endIdx).sort((a, b) => a - b);
    
    // Create number buttons (5 per row)
    for (let i = 0; i < pageNumbers.length; i += 5) {
      const row = pageNumbers.slice(i, i + 5).map(num => ({
        text: num.toString(),
        callback_data: `select_number:${gameId}:${num}`
      }));
      keyboard.push(row);
    }
    
    // Add navigation row if needed
    if (totalPages > 1) {
      const navRow: TelegramBot.InlineKeyboardButton[] = [];
      
      if (currentPage > 0) {
        navRow.push({
          text: '⬅️ Previous',
          callback_data: `page_numbers:${gameId}:${currentPage - 1}`
        });
      }
      
      navRow.push({
        text: `📄 ${currentPage + 1}/${totalPages}`,
        callback_data: 'noop' // No operation
      });
      
      if (currentPage < totalPages - 1) {
        navRow.push({
          text: 'Next ➡️',
          callback_data: `page_numbers:${gameId}:${currentPage + 1}`
        });
      }
      
      keyboard.push(navRow);
    }
    
    // Add refresh button
    keyboard.push([{
      text: '🔄 Refresh Available Numbers',
      callback_data: `show_numbers:${gameId}`
    }]);
    
    return keyboard;
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

  private async processQuizAnswer(
    chatId: number,
    userId: number,
    gameId: string,
    questionNumber: number,
    selectedAnswer: number
  ): Promise<void> {
    // Get player ID from database
    const player = await this.getPlayerByTelegramId(userId);
    if (!player) {
      await this.bot.answerCallbackQuery('', {
        text: 'You need to join the game first!',
        show_alert: true
      });
      return;
    }

    const result = await this.quizService.submitAnswer(
      gameId,
      player.id,
      questionNumber,
      selectedAnswer
    );

    if (result.success) {
      const text = result.isCorrect 
        ? '✅ Correct! Well done!' 
        : `❌ Wrong! The correct answer was option ${(result.correctAnswer || 0) + 1}`;
      
      await this.bot.answerCallbackQuery('', {
        text,
        show_alert: true
      });
    } else {
      await this.bot.answerCallbackQuery('', {
        text: '⏰ Too late or already answered!',
        show_alert: false
      });
    }
  }

  // Announcement methods
  async announceQuizGame(chatId: number, game: Game): Promise<void> {
    const settings = game.settings.quiz!;
    
    const message = `
🎯 *Quiz Game Starting Soon!*

📝 **${game.title}**
${game.description || 'Test your knowledge and win prizes!'}

🏆 **Prize Pool:** ${settings.prizePool?.amount} ${settings.prizePool?.currency}
📊 **Questions:** ${settings.questionCount}
⏱️ **Time per Question:** ${settings.timePerQuestion} seconds
👥 **Players:** ${settings.minPlayers}-${settings.maxPlayers}

💳 **Requirements:** Must verify wallet with ${config.solana.minTokenBalance} ${config.solana.tokenSymbol}

The game will start in ${settings.joinTimeLimit} seconds!
Use /join to participate!
    `;

    await this.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎮 Join Quiz', callback_data: `join_game:${game.id}` }],
          [{ text: '📊 Game Info', callback_data: `refresh_game:${game.id}` }]
        ]
      }
    });
  }

  async announceNewGame(chatId: number, game: Game): Promise<void> {
    const settings = game.settings.pickNumber!;
    
    const modeEmoji = settings.isReverseMode ? '⚠️' : '🎯';
    const modeText = settings.isReverseMode 
      ? 'REVERSE MODE - Numbers drawn are ELIMINATED!' 
      : 'Normal Mode - Numbers drawn WIN!';
    
    const prizeText = settings.enablePrizes && settings.prizeDistribution
      ? `\n🏆 **Prizes:** ${settings.prizeDistribution.totalPrizes} winner${settings.prizeDistribution.totalPrizes > 1 ? 's' : ''}`
      : '';
    
    const message = `
${modeEmoji} *New Game Created!*

📝 **${game.title}**
${game.description || ''}

🎯 **Game Mode:** ${modeText}
👥 **Players:** ${settings.minPlayers} - ${settings.maxPlayers}
⏱️ **Join Time:** ${settings.joinTimeLimit} seconds
⌛ **Selection Time:** ${settings.timeLimit} seconds
🔢 **Number Range:** ${settings.numberRange.min} - ${settings.numberRange.max}${prizeText}

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
    try {
      const result = await this.db.query(`
        SELECT * FROM games 
        WHERE chat_id = $1 
        AND status IN ($2, $3, $4, $5)
        ORDER BY created_at DESC
        LIMIT 1
      `, [chatId, GameStatus.CREATED, GameStatus.WAITING_FOR_PLAYERS, GameStatus.PLAYERS_JOINING, GameStatus.NUMBER_SELECTION]);

      if (result.rows.length === 0) return null;

      return this.mapRowToGame(result.rows[0]);
    } catch (error) {
      console.error('Error finding active game:', error);
      return null;
    }
  }

  private async getPlayerByTelegramId(telegramId: number): Promise<Player | null> {
    try {
      const result = await this.db.query(`
        SELECT * FROM players WHERE telegram_user_id = $1
      `, [telegramId]);

      if (result.rows.length === 0) return null;

      return result.rows[0];
    } catch (error) {
      console.error('Error getting player by telegram ID:', error);
      return null;
    }
  }

  private async getPlayerById(playerId: string): Promise<Player | null> {
    try {
      const result = await this.db.query(`
        SELECT * FROM players WHERE id = $1
      `, [playerId]);

      if (result.rows.length === 0) return null;

      return result.rows[0];
    } catch (error) {
      console.error('Error getting player by ID:', error);
      return null;
    }
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

  private async handleSettingsCommand(chatId: number, userId: number): Promise<void> {
    // Check if user is admin
    if (!await this.isUserAdmin(chatId, userId)) {
      await this.sendMessage(chatId, 'Only admins can access settings.');
      return;
    }

    const settingsMessage = `
⚙️ *Game Settings*

*Create Game Options:*
\`/create_game [title] [reverse] [prizes]\`

*Examples:*
• \`/create_game\` - Basic game
• \`/create_game "Lucky Draw"\` - Custom title
• \`/create_game "Elimination" reverse\` - Reverse mode
• \`/create_game "Big Prize" 5\` - 5 winners
• \`/create_game "Ultimate" reverse 3\` - Reverse with 3 winners

*Prize Distribution:*
When multiple prizes are set, the distribution is:
• 1st place: 50%
• Others: Split remaining 50%

*Settings Commands:*
• \`/set_range [min] [max]\` - Set number range
• \`/set_time [seconds]\` - Set selection time
• \`/set_players [min] [max]\` - Set player limits

*Current Defaults:*
• Number Range: 1-100
• Time Limit: ${config.games.pickNumber.defaultTimeLimit}s
• Players: ${config.games.pickNumber.minPlayers}-${config.games.pickNumber.maxPlayers}
    `;

    await this.sendMessage(chatId, settingsMessage, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎮 Create Basic Game', callback_data: 'quick_create:normal:1' }],
          [{ text: '⚠️ Create Reverse Game', callback_data: 'quick_create:reverse:1' }],
          [{ text: '🏆 Create Multi-Prize Game', callback_data: 'show_prize_options' }]
        ]
      }
    });
  }

  private async handleVerifyCommand(chatId: number, userId: number, user: TelegramBot.User, args: string[]): Promise<void> {
    if (args.length === 0) {
      await this.sendMessage(chatId, 
        '💳 Please provide your Solana wallet address:\n\n' +
        'Usage: `/verify YOUR_WALLET_ADDRESS`\n\n' +
        'Example: `/verify 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZtq8Zq3NPe`',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const walletAddress = args[0];
    
    // Validate wallet address format
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
      await this.sendMessage(chatId, '❌ Invalid wallet address format. Please provide a valid Solana address.');
      return;
    }

    await this.sendMessage(chatId, '🔄 Verifying your wallet...');

    try {
      // Get player
      const player = await this.getPlayerByTelegramId(userId);
      if (!player) {
        await this.sendMessage(chatId, '❌ Player not found. Please join a game first.');
        return;
      }

      // Verify wallet
      const verification = await this.walletService.verifyWalletOwnership(
        player.id,
        walletAddress
      );

      if (verification.verified) {
        const successMessage = `
✅ *Wallet Verified Successfully!*

📱 Wallet: \`${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}\`
💰 ${config.solana.tokenSymbol} Balance: ${verification.balance.toFixed(2)}
🎮 Status: Eligible for prize games

You can now join quiz games with prize pools!
        `;
        
        await this.sendMessage(chatId, successMessage, { parse_mode: 'Markdown' });
      } else {
        const failMessage = `
❌ *Verification Failed*

Your wallet doesn't meet the minimum requirements:
• Required: ${config.solana.minTokenBalance} ${config.solana.tokenSymbol}
• Your Balance: ${verification.balance.toFixed(2)} ${config.solana.tokenSymbol}

Please ensure you have enough ${config.solana.tokenSymbol} tokens and try again.
Token Address: \`${config.solana.tokenAddress}\`
        `;
        
        await this.sendMessage(chatId, failMessage, { parse_mode: 'Markdown' });
      }
    } catch (error) {
      console.error('Error verifying wallet:', error);
      await this.sendMessage(chatId, '❌ Error verifying wallet. Please try again later.');
    }
  }

  private async handleStartQuizCommand(chatId: number, userId: number, args: string[]): Promise<void> {
    // Check if user is admin
    if (!await this.isUserAdmin(chatId, userId)) {
      await this.sendMessage(chatId, 'Only admins can start quiz games.');
      return;
    }

    // Check if there's already an active game
    const existingGame = await this.findActiveGameInChat(chatId.toString());
    if (existingGame) {
      await this.sendMessage(chatId, 'There is already an active game in this chat. Cancel it first with /cancel_game');
      return;
    }

    // Parse arguments: /start_quiz [questions] [time_per_question] [max_players]
    let questionCount = config.games.quiz.defaultQuestionCount;
    let timePerQuestion = config.games.quiz.defaultTimePerQuestion;
    let maxPlayers = config.games.quiz.maxPlayers;

    if (args.length >= 1 && !isNaN(parseInt(args[0]))) {
      questionCount = Math.min(Math.max(parseInt(args[0]), 5), 50); // 5-50 questions
    }
    if (args.length >= 2 && !isNaN(parseInt(args[1]))) {
      timePerQuestion = Math.min(Math.max(parseInt(args[1]), 10), 60); // 10-60 seconds
    }
    if (args.length >= 3 && !isNaN(parseInt(args[2]))) {
      maxPlayers = Math.min(Math.max(parseInt(args[2]), 2), 100); // 2-100 players
    }

    const title = `Quiz Game - ${questionCount} Questions`;
    
    const gameRequest: GameCreationRequest = {
      type: GameType.QUIZ,
      title,
      description: 'Test your knowledge and win prizes!',
      chatId: chatId.toString(),
      settings: {
        quiz: {
          questionCount,
          timePerQuestion,
          joinTimeLimit: config.games.quiz.joinTimeLimit,
          minPlayers: config.games.quiz.minPlayers,
          maxPlayers,
          difficulty: 'medium' as const,
          announceInterval: config.games.quiz.announceInterval,
          autoStart: true,
          enablePrizes: true,
          prizePool: {
            amount: config.games.quiz.prizePoolAmount,
            currency: config.games.quiz.prizePoolCurrency,
            tokenAddress: config.solana.tokenAddress,
            distribution: 'top-3'
          },
          requiresWalletVerification: true
        }
      }
    };

    try {
      await this.sendMessage(chatId, '🎯 Creating quiz game...');
      const game = await this.quizService.createQuizGame(gameRequest, userId.toString());
      await this.announceQuizGame(chatId, game);
    } catch (error) {
      console.error('Error creating quiz game:', error);
      await this.sendMessage(chatId, '❌ Failed to create quiz game. Please check if OpenAI API is configured.');
    }
  }

  private async updateNumberSelectionMessage(
    chatId: number, 
    messageId: number, 
    gameId: string
  ): Promise<void> {
    try {
      // Get updated game state
      const gameNumberState = await this.gameService.getGameNumberState(gameId);
      if (!gameNumberState) return;

      const game = await this.gameService.getGame(gameId);
      if (!game) return;

      const settings = game.settings.pickNumber!;
      const availableNumbers = gameNumberState.availableNumbers;
      
      const keyboard = this.createNumberKeyboardPage(
        availableNumbers, 
        gameId, 
        0, // Reset to first page
        25, 
        Math.ceil(availableNumbers.length / 25)
      );

      const timeLeft = game.selection_deadline 
        ? Math.max(0, Math.floor((game.selection_deadline.getTime() - Date.now()) / 1000))
        : settings.timeLimit;

      const modeText = settings.isReverseMode 
        ? '⚠️ REVERSE MODE: Numbers drawn will be ELIMINATED!' 
        : '🎯 Normal Mode: Numbers drawn will WIN!';

      const message = `
🎯 *Select Your Number*

Game: ${game.title}
${modeText}
Range: ${settings.numberRange.min} - ${settings.numberRange.max}
Available Numbers: ${availableNumbers.length}
Time left: ${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}

Choose a number below:
      `;

      await this.bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });
    } catch (error) {
      console.error('Error updating number selection message:', error);
    }
  }

  private async showNumberSelectionPage(
    chatId: number,
    gameId: string,
    page: number,
    messageId: number
  ): Promise<void> {
    try {
      const gameNumberState = await this.gameService.getGameNumberState(gameId);
      if (!gameNumberState) return;

      const game = await this.gameService.getGame(gameId);
      if (!game) return;

      const settings = game.settings.pickNumber!;
      const availableNumbers = gameNumberState.availableNumbers;
      const pageSize = 25;
      const totalPages = Math.ceil(availableNumbers.length / pageSize);
      
      const keyboard = this.createNumberKeyboardPage(
        availableNumbers, 
        gameId, 
        page, 
        pageSize, 
        totalPages
      );

      const timeLeft = game.selection_deadline 
        ? Math.max(0, Math.floor((game.selection_deadline.getTime() - Date.now()) / 1000))
        : settings.timeLimit;

      const modeText = settings.isReverseMode 
        ? '⚠️ REVERSE MODE: Numbers drawn will be ELIMINATED!' 
        : '🎯 Normal Mode: Numbers drawn will WIN!';

      const message = `
🎯 *Select Your Number*

Game: ${game.title}
${modeText}
Range: ${settings.numberRange.min} - ${settings.numberRange.max}
Available Numbers: ${availableNumbers.length}
Time left: ${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}

Choose a number below:
      `;

      await this.bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });
    } catch (error) {
      console.error('Error showing number selection page:', error);
    }
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

  private async handleQuickCreate(chatId: number, userId: number, mode: string, prizes: number): Promise<void> {
    if (!await this.isUserAdmin(chatId, userId)) {
      await this.sendMessage(chatId, 'Only admins can create games.');
      return;
    }

    const args = mode === 'reverse' ? ['Quick Game', 'reverse', prizes.toString()] : ['Quick Game', prizes.toString()];
    await this.handleCreateGameCommand(chatId, userId, args);
  }

  private async showPrizeOptions(chatId: number): Promise<void> {
    const message = `
🏆 *Select Number of Prizes*

Choose how many winners you want:
    `;

    const keyboard: TelegramBot.InlineKeyboardButton[][] = [];
    
    // Create prize option buttons
    for (let i = 2; i <= 10; i++) {
      const row: TelegramBot.InlineKeyboardButton[] = [];
      row.push({ text: `🏆 ${i} Winners`, callback_data: `quick_create:normal:${i}` });
      if (i <= 5) { // Only show reverse mode for reasonable winner counts
        row.push({ text: `⚠️ ${i} Winners (Reverse)`, callback_data: `quick_create:reverse:${i}` });
      }
      keyboard.push(row);
    }
    
    keyboard.push([{ text: '❌ Cancel', callback_data: 'noop' }]);

    await this.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });
  }
}

export default TelegramBotService;