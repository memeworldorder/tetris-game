import { Router } from 'express'
import { TwitterBotController } from '../controllers/twitterController'

const router = Router()
const twitterController = new TwitterBotController()

// Health check
router.get('/health', twitterController.healthCheck.bind(twitterController))

// Account info
router.get('/account', twitterController.getAccountInfo.bind(twitterController))

// Send basic tweet
router.post('/tweet', twitterController.sendTweet.bind(twitterController))

// Send templated announcement
router.post('/announce', twitterController.sendAnnouncement.bind(twitterController))

// Specific announcement types
router.post('/announce/winner', twitterController.announceWinner.bind(twitterController))
router.post('/announce/leaderboard', twitterController.announceLeaderboard.bind(twitterController))
router.post('/announce/raffle', twitterController.announceRaffleWinner.bind(twitterController))

// Schedule tweet
router.post('/schedule', twitterController.scheduleTweet.bind(twitterController))

// Analytics
router.get('/analytics', twitterController.getAnalytics.bind(twitterController))

export { router as twitterRouter } 