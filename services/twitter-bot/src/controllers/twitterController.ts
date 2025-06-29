import { Request, Response } from 'express'
import { twitterClient, twitterConfig, tweetTemplates, formatTweet, formatWalletForTwitter } from '../config/twitter'
import { db } from '../config/database'

export class TwitterBotController {

  // Send a tweet
  async sendTweet(req: Request, res: Response) {
    try {
      const { text, mediaIds } = req.body

      if (!text) {
        return res.status(400).json({
          error: 'Tweet text is required'
        })
      }

      if (!twitterConfig.enabled) {
        console.log('Mock Twitter tweet:', { text, mediaIds })
        return res.json({
          success: true,
          mock: true,
          message: 'Twitter bot running in mock mode',
          tweet: { text, mediaIds }
        })
      }

      const tweetOptions: any = { text }
      if (mediaIds && mediaIds.length > 0) {
        tweetOptions.media = { media_ids: mediaIds }
      }

      const result = await twitterClient!.v2.tweet(tweetOptions)

      // Log the tweet
      await db.query(
        `INSERT INTO twitter_tweets (tweet_id, tweet_text, media_ids, posted_at, status)
         VALUES ($1, $2, $3, NOW(), 'posted')`,
        [result.data.id, text, JSON.stringify(mediaIds || [])]
      )

      res.json({
        success: true,
        tweetId: result.data.id,
        text: result.data.text
      })
    } catch (error) {
      console.error('Error sending tweet:', error)
      res.status(500).json({
        error: 'Failed to send tweet',
        details: (error as Error).message
      })
    }
  }

  // Send announcement using templates
  async sendAnnouncement(req: Request, res: Response) {
    try {
      const { type, data } = req.body

      if (!tweetTemplates[type as keyof typeof tweetTemplates]) {
        return res.status(400).json({
          error: 'Invalid announcement type',
          availableTypes: Object.keys(tweetTemplates)
        })
      }

      const template = tweetTemplates[type as keyof typeof tweetTemplates]
      const tweetText = formatTweet(template, data)

      if (!twitterConfig.enabled) {
        console.log('Mock Twitter announcement:', { type, tweetText })
        return res.json({
          success: true,
          mock: true,
          message: 'Twitter bot running in mock mode',
          announcement: { type, tweetText }
        })
      }

      const result = await twitterClient!.v2.tweet({ text: tweetText })

      // Log the announcement
      await db.query(
        `INSERT INTO twitter_announcements (announcement_type, tweet_data, tweet_id, posted_at)
         VALUES ($1, $2, $3, NOW())`,
        [type, JSON.stringify(data), result.data.id]
      )

      res.json({
        success: true,
        tweetId: result.data.id,
        type,
        preview: tweetText.substring(0, 100) + '...'
      })
    } catch (error) {
      console.error('Error sending Twitter announcement:', error)
      res.status(500).json({
        error: 'Failed to send announcement',
        details: (error as Error).message
      })
    }
  }

  // Announce winner
  async announceWinner(req: Request, res: Response) {
    try {
      const { walletAddress, gameName, score, prize } = req.body

      const data = {
        walletAddress: formatWalletForTwitter(walletAddress),
        gameName,
        score,
        prize
      }

      const tweetText = formatTweet(tweetTemplates.dailyWinner, data)

      if (!twitterConfig.enabled) {
        return res.json({
          success: true,
          mock: true,
          message: 'Twitter bot running in mock mode',
          announcement: tweetText
        })
      }

      const result = await twitterClient!.v2.tweet({ text: tweetText })

      // Log winner announcement
      await db.query(
        `INSERT INTO twitter_announcements (announcement_type, tweet_data, tweet_id, posted_at)
         VALUES ('winner', $1, $2, NOW())`,
        [JSON.stringify(data), result.data.id]
      )

      res.json({
        success: true,
        tweetId: result.data.id,
        winner: walletAddress,
        prize
      })
    } catch (error) {
      console.error('Error announcing winner:', error)
      res.status(500).json({
        error: 'Failed to announce winner',
        details: (error as Error).message
      })
    }
  }

  // Announce leaderboard
  async announceLeaderboard(req: Request, res: Response) {
    try {
      const { gameName, leaderboard, period = 'weekly' } = req.body

      if (!leaderboard || leaderboard.length < 3) {
        return res.status(400).json({
          error: 'Leaderboard must have at least 3 players'
        })
      }

      const data = {
        gameName,
        first: {
          wallet: formatWalletForTwitter(leaderboard[0].wallet_address),
          score: leaderboard[0].score
        },
        second: {
          wallet: formatWalletForTwitter(leaderboard[1].wallet_address),
          score: leaderboard[1].score
        },
        third: {
          wallet: formatWalletForTwitter(leaderboard[2].wallet_address),
          score: leaderboard[2].score
        },
        totalPlayers: leaderboard.length,
        totalPrizes: leaderboard.reduce((sum: number, player: any) => sum + (player.prize || 0), 0)
      }

      const tweetText = formatTweet(tweetTemplates.weeklyLeaderboard, data)

      if (!twitterConfig.enabled) {
        return res.json({
          success: true,
          mock: true,
          message: 'Twitter bot running in mock mode',
          leaderboard: data
        })
      }

      const result = await twitterClient!.v2.tweet({ text: tweetText })

      res.json({
        success: true,
        tweetId: result.data.id,
        period,
        playersCount: leaderboard.length
      })
    } catch (error) {
      console.error('Error announcing leaderboard:', error)
      res.status(500).json({
        error: 'Failed to announce leaderboard',
        details: (error as Error).message
      })
    }
  }

  // Announce raffle winner
  async announceRaffleWinner(req: Request, res: Response) {
    try {
      const { walletAddress, ticketCount, prize, prizeType, winningTicket } = req.body

      const data = {
        walletAddress: formatWalletForTwitter(walletAddress),
        ticketCount,
        prize,
        prizeType: prizeType || 'SOL',
        winningTicket
      }

      const tweetText = formatTweet(tweetTemplates.raffleWinner, data)

      if (!twitterConfig.enabled) {
        return res.json({
          success: true,
          mock: true,
          message: 'Twitter bot running in mock mode',
          raffleWinner: data
        })
      }

      const result = await twitterClient!.v2.tweet({ text: tweetText })

      res.json({
        success: true,
        tweetId: result.data.id,
        winner: walletAddress,
        prize: `${prize} ${prizeType}`
      })
    } catch (error) {
      console.error('Error announcing raffle winner:', error)
      res.status(500).json({
        error: 'Failed to announce raffle winner',
        details: (error as Error).message
      })
    }
  }

  // Get Twitter account info
  async getAccountInfo(req: Request, res: Response) {
    try {
      if (!twitterConfig.enabled) {
        return res.json({
          enabled: false,
          status: 'Twitter API not configured'
        })
      }

      const userInfo = await twitterClient!.v2.me()
      
      res.json({
        enabled: true,
        status: 'Twitter API active',
        account: {
          id: userInfo.data.id,
          username: userInfo.data.username,
          name: userInfo.data.name
        }
      })
    } catch (error) {
      console.error('Error getting Twitter account info:', error)
      res.status(500).json({
        error: 'Failed to get account info',
        details: (error as Error).message
      })
    }
  }

  // Get tweet analytics
  async getAnalytics(req: Request, res: Response) {
    try {
      const { days = 7 } = req.query

      const result = await db.query(
        `SELECT 
           COUNT(*) as total_tweets,
           COUNT(CASE WHEN announcement_type = 'winner' THEN 1 END) as winner_announcements,
           COUNT(CASE WHEN announcement_type = 'leaderboard' THEN 1 END) as leaderboard_announcements,
           COUNT(CASE WHEN announcement_type = 'raffle' THEN 1 END) as raffle_announcements
         FROM twitter_announcements 
         WHERE posted_at >= NOW() - INTERVAL '${days} days'`
      )

      const analytics = {
        period: `${days} days`,
        ...result.rows[0],
        enabled: twitterConfig.enabled
      }

      res.json(analytics)
    } catch (error) {
      console.error('Error getting Twitter analytics:', error)
      res.status(500).json({
        error: 'Failed to get analytics',
        details: (error as Error).message
      })
    }
  }

  // Schedule tweet
  async scheduleTweet(req: Request, res: Response) {
    try {
      const { text, scheduledFor, type, data } = req.body

      // Store scheduled tweet in database
      const result = await db.query(
        `INSERT INTO scheduled_tweets (tweet_text, scheduled_for, tweet_type, tweet_data, status, created_at)
         VALUES ($1, $2, $3, $4, 'scheduled', NOW())
         RETURNING id`,
        [text, scheduledFor, type || 'custom', JSON.stringify(data || {})]
      )

      res.json({
        success: true,
        scheduledTweetId: result.rows[0].id,
        scheduledFor,
        message: 'Tweet scheduled successfully'
      })
    } catch (error) {
      console.error('Error scheduling tweet:', error)
      res.status(500).json({
        error: 'Failed to schedule tweet',
        details: (error as Error).message
      })
    }
  }

  // Health check
  async healthCheck(req: Request, res: Response) {
    try {
      const health = {
        service: 'twitter-bot',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        twitter: {
          enabled: twitterConfig.enabled,
          configured: !!twitterConfig.apiKey
        },
        database: {
          connected: true
        }
      }

      if (twitterConfig.enabled) {
        try {
          await twitterClient!.v2.me()
          health.twitter = { ...health.twitter, apiStatus: 'active' }
        } catch (error) {
          health.twitter = { ...health.twitter, apiStatus: 'error', error: (error as Error).message }
          health.status = 'degraded'
        }
      }

      res.json(health)
    } catch (error) {
      console.error('Health check error:', error)
      res.status(500).json({
        service: 'twitter-bot',
        status: 'unhealthy',
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      })
    }
  }
} 