export interface TelegramUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  is_bot?: boolean;
  language_code?: string;
}

export interface Player {
  id: string;
  telegram_user_id: number;
  username?: string;
  display_name: string;
  created_at: Date;
  updated_at: Date;
  total_games_played: number;
  total_games_won: number;
  is_active: boolean;
  is_banned: boolean;
}

export interface Game {
  id: string;
  type: GameType;
  status: GameStatus;
  title: string;
  description?: string;
  created_by: string; // admin user id
  chat_id: string;
  message_id?: number;
  settings: GameSettings;
  created_at: Date;
  updated_at: Date;
  started_at?: Date;
  ended_at?: Date;
  winner_id?: string;
  total_players: number;
  max_players: number;
  min_players: number;
  time_limit: number; // seconds
  join_deadline?: Date;
  selection_deadline?: Date;
}

export interface GameParticipant {
  id: string;
  game_id: string;
  player_id: string;
  joined_at: Date;
  selected_number?: number;
  selection_time?: Date;
  is_winner: boolean;
  prize_amount?: number;
  prize_type?: string;
}

export interface NumberSelection {
  id: string;
  game_id: string;
  player_id: string;
  number: number;
  selected_at: Date;
  is_available: boolean;
}

export interface GameHistory {
  id: string;
  game_id: string;
  action: GameAction;
  actor_id?: string; // player or admin who performed the action
  data: any; // JSON data specific to the action
  timestamp: Date;
  message?: string;
}

export interface WebhookEvent {
  id: string;
  event_type: WebhookEventType;
  game_id?: string;
  player_id?: string;
  data: any;
  webhook_url: string;
  status: WebhookStatus;
  attempts: number;
  last_attempt?: Date;
  created_at: Date;
  response_status?: number;
  response_body?: string;
  error_message?: string;
}

export enum GameType {
  PICK_NUMBER = 'pick_number',
  QUIZ = 'quiz',
  // Future game types can be added here
  // LOTTERY = 'lottery'
}

export enum GameStatus {
  CREATED = 'created',
  WAITING_FOR_PLAYERS = 'waiting_for_players',
  PLAYERS_JOINING = 'players_joining',
  NUMBER_SELECTION = 'number_selection',
  DRAWING = 'drawing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  ERROR = 'error'
}

export enum GameAction {
  GAME_CREATED = 'game_created',
  PLAYER_JOINED = 'player_joined',
  PLAYER_LEFT = 'player_left',
  NUMBER_SELECTED = 'number_selected',
  GAME_STARTED = 'game_started',
  DRAWING_STARTED = 'drawing_started',
  WINNER_SELECTED = 'winner_selected',
  GAME_COMPLETED = 'game_completed',
  GAME_CANCELLED = 'game_cancelled',
  ADMIN_ACTION = 'admin_action'
}

export enum WebhookEventType {
  GAME_START = 'game.start',
  GAME_END = 'game.end',
  PLAYER_JOIN = 'player.join',
  NUMBER_SELECTED = 'number.selected',
  WINNER_SELECTED = 'winner.selected',
  GAME_CANCELLED = 'game.cancelled'
}

export enum WebhookStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  RETRYING = 'retrying'
}

export interface GameSettings {
  pickNumber?: PickNumberSettings;
  quiz?: QuizSettings;
}

export interface PickNumberSettings {
  timeLimit: number; // seconds for selection phase
  joinTimeLimit: number; // seconds for joining phase
  minPlayers: number;
  maxPlayers: number;
  numberRange: {
    min: number;
    max: number;
  };
  allowDuplicateNumbers: boolean;
  maxWinners: number;
  announceInterval: number; // seconds between announcements
  autoStart: boolean;
  enablePrizes: boolean;
  prizePool?: {
    amount: number;
    currency: string;
    distribution: 'equal' | 'weighted';
  };
}

export interface QuizSettings {
  questionCount: number;
  timePerQuestion: number; // seconds per question
  joinTimeLimit: number; // seconds for joining phase
  minPlayers: number;
  maxPlayers: number;
  difficulty: 'easy' | 'medium' | 'hard';
  categories?: string[]; // Quiz categories/topics
  announceInterval: number;
  autoStart: boolean;
  enablePrizes: boolean;
  prizePool?: {
    amount: number;
    currency: string;
    tokenAddress?: string;
    distribution: 'winner-takes-all' | 'top-3' | 'percentage';
  };
  requiresWalletVerification: boolean;
}

export interface QuizQuestion {
  id: string;
  gameId: string;
  questionNumber: number;
  question: string;
  options: string[];
  correctAnswer: number; // index of correct answer
  category?: string;
  difficulty?: string;
  timeLimit: number;
  createdAt: Date;
}

export interface QuizAnswer {
  id: string;
  gameId: string;
  playerId: string;
  questionId: string;
  selectedAnswer: number;
  isCorrect: boolean;
  timeToAnswer: number; // milliseconds
  answeredAt: Date;
}

export interface QuizParticipant extends GameParticipant {
  score: number;
  correctAnswers: number;
  totalAnswers: number;
  averageResponseTime: number;
  currentStreak: number;
  maxStreak: number;
}

export interface WalletVerification {
  id: string;
  playerId: string;
  walletAddress: string;
  tokenAddress: string;
  tokenSymbol: string;
  tokenBalance: number;
  isVerified: boolean;
  verifiedAt: Date;
  lastCheckedAt: Date;
}

export interface GameCreationRequest {
  type: GameType;
  title: string;
  description?: string;
  chatId: string;
  settings: GameSettings;
  startImmediate?: boolean;
  scheduledStart?: Date;
}

export interface GameUpdateRequest {
  title?: string;
  description?: string;
  settings?: Partial<GameSettings>;
  status?: GameStatus;
}

export interface PlayerJoinRequest {
  gameId: string;
  telegramUserId: number;
  username?: string;
  displayName: string;
}

export interface NumberSelectionRequest {
  gameId: string;
  playerId: string;
  number: number;
}

export interface GameStatsResponse {
  totalGames: number;
  activeGames: number;
  completedGames: number;
  totalPlayers: number;
  activePlayers: number;
  gamesByType: Record<GameType, number>;
  recentGames: Game[];
}

export interface PlayerStatsResponse {
  player: Player;
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
  favoriteGameType?: GameType;
  recentGames: GameParticipant[];
}

export interface TelegramBotCommand {
  command: string;
  description: string;
  adminOnly?: boolean;
  params?: string[];
}

export interface BotResponse {
  text: string;
  reply_markup?: any;
  parse_mode?: 'HTML' | 'Markdown';
  disable_web_page_preview?: boolean;
}

export interface AdminDashboardData {
  stats: GameStatsResponse;
  activeGames: Game[];
  recentPlayers: Player[];
  systemHealth: {
    database: boolean;
    redis: boolean;
    telegram: boolean;
    webhooks: boolean;
  };
}