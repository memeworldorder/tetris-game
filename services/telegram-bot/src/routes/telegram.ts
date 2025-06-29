import { Router } from 'express'
import { TelegramBotController } from '../controllers/botController'

const router = Router()
const telegramController = new TelegramBotController()

// Health check
router.get('/health', telegramController.healthCheck.bind(telegramController))

// Bot info
router.get('/info', telegramController.getBotInfo.bind(telegramController))

// Send basic message
router.post('/send-message', telegramController.sendMessage.bind(telegramController))

// Send templated announcement
router.post('/announce', telegramController.sendAnnouncement.bind(telegramController))

// Specific announcement types
router.post('/announce/winner', telegramController.announceWinner.bind(telegramController))
router.post('/announce/leaderboard', telegramController.announceLeaderboard.bind(telegramController))
router.post('/announce/raffle', telegramController.announceRaffleWinner.bind(telegramController))

// Message history
router.get('/messages', telegramController.getMessageHistory.bind(telegramController))

export { router as telegramRouter } 