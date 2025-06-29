import { Request, Response } from 'express'
import { bot, telegramConfig, messageTemplates, formatMessage } from '../config/telegram'
import { db } from '../config/database'

export class TelegramBotController {
  
  // Send message to channel or chat
  async sendMessage(req: Request, res: Response) {
    try {
      const { message, chatId, parseMode = 'HTML', disablePreview = false } = req.body

      if (!telegramConfig.enabled) {
        return res.json({
          success: false,
          error: 'Telegram bot is not configured',
          message: 'Bot running in mock mode'
        })
      }

      const targetChatId = chatId || telegramConfig.channelId || telegramConfig.chatId

      if (!targetChatId) {
        return res.status(400).json({
          error: 'No chat ID specified and no default configured'
        })
      }

      const result = await bot!.sendMessage(targetChatId, message, {
        parse_mode: parseMode,
        disable_web_page_preview: disablePreview
      })

      // Log the message
      await db.query(
        `INSERT INTO telegram_messages (message_id, chat_id, message_text, sent_at, status)
         VALUES ($1, $2, $3, NOW(), 'sent')`,
        [result.message_id, targetChatId, message]
      )

      res.json({
        success: true,
        messageId: result.message_id,
        chatId: targetChatId
      })
    } catch (error) {
      console.error('Error sending Telegram message:', error)
      res.status(500).json({
        error: 'Failed to send message',
        details: (error as Error).message
      })
    }
  }

  // Send announcement using templates
  async sendAnnouncement(req: Request, res: Response) {
    try {
      const { type, data, chatId } = req.body

      if (!messageTemplates[type as keyof typeof messageTemplates]) {
        return res.status(400).json({
          error: 'Invalid announcement type',
          availableTypes: Object.keys(messageTemplates)
        })
      }

      const template = messageTemplates[type as keyof typeof messageTemplates]
      const message = formatMessage(template, data)

      const targetChatId = chatId || telegramConfig.channelId || telegramConfig.chatId

      if (!telegramConfig.enabled) {
        console.log('Mock Telegram announcement:', { type, message, targetChatId })
        return res.json({
          success: true,
          mock: true,
          message: 'Bot running in mock mode',
          announcement: { type, message }
        })
      }

      const result = await bot!.sendMessage(targetChatId, message, {
        parse_mode: 'HTML',
        disable_web_page_preview: false
      })

      // Log the announcement
      await db.query(
        `INSERT INTO telegram_announcements (announcement_type, message_data, message_id, chat_id, sent_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [type, JSON.stringify(data), result.message_id, targetChatId]
      )

      res.json({
        success: true,
        messageId: result.message_id,
        chatId: targetChatId,
        type,
        preview: message.substring(0, 100) + '...'
      })
    } catch (error) {
      console.error('Error sending Telegram announcement:', error)
      res.status(500).json({
        error: 'Failed to send announcement',
        details: (error as Error).message
      })
    }
  }

  // Send winner announcement
  async announceWinner(req: Request, res: Response) {
    try {
      const { walletAddress, gameName, score, prize } = req.body

      const data = {
        walletAddress: this.formatWalletAddress(walletAddress),
        gameName,
        score,
        prize
      }

      const message = formatMessage(messageTemplates.dailyWinner, data)

      if (!telegramConfig.enabled) {
        return res.json({
          success: true,
          mock: true,
          message: 'Bot running in mock mode',
          announcement: message
        })
      }

      const result = await bot!.sendMessage(telegramConfig.channelId || telegramConfig.chatId, message, {
        parse_mode: 'HTML'
      })

      // Log winner announcement
      await db.query(
        `INSERT INTO telegram_announcements (announcement_type, message_data, message_id, chat_id, sent_at)
         VALUES ('winner', $1, $2, $3, NOW())`,
        [JSON.stringify(data), result.message_id, telegramConfig.channelId || telegramConfig.chatId]
      )

      res.json({
        success: true,
        messageId: result.message_id,
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

  // Send leaderboard update
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
          wallet: this.formatWalletAddress(leaderboard[0].wallet_address),
          score: leaderboard[0].score
        },
        second: {
          wallet: this.formatWalletAddress(leaderboard[1].wallet_address),
          score: leaderboard[1].score
        },
        third: {
          wallet: this.formatWalletAddress(leaderboard[2].wallet_address),
          score: leaderboard[2].score
        },
        totalPlayers: leaderboard.length,
        totalPrizes: leaderboard.reduce((sum: number, player: any) => sum + (player.prize || 0), 0)
      }

      const message = formatMessage(messageTemplates.weeklyLeaderboard, data)

      if (!telegramConfig.enabled) {
        return res.json({
          success: true,
          mock: true,
          message: 'Bot running in mock mode',
          leaderboard: data
        })
      }

      const result = await bot!.sendMessage(telegramConfig.channelId || telegramConfig.chatId, message, {
        parse_mode: 'HTML'
      })

      res.json({
        success: true,
        messageId: result.message_id,
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

  // Send raffle winner announcement
  async announceRaffleWinner(req: Request, res: Response) {
    try {
      const { walletAddress, ticketCount, prize, prizeType, winningTicket } = req.body

      const data = {
        walletAddress: this.formatWalletAddress(walletAddress),
        ticketCount,
        prize,
        prizeType: prizeType || 'SOL',
        winningTicket
      }

      const message = formatMessage(messageTemplates.raffleWinner, data)

      if (!telegramConfig.enabled) {
        return res.json({
          success: true,
          mock: true,
          message: 'Bot running in mock mode',
          raffleWinner: data
        })
      }

      const result = await bot!.sendMessage(telegramConfig.channelId || telegramConfig.chatId, message, {
        parse_mode: 'HTML'
      })

      res.json({
        success: true,
        messageId: result.message_id,
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

  // Get bot info
  async getBotInfo(req: Request, res: Response) {
    try {
      if (!telegramConfig.enabled) {
        return res.json({
          enabled: false,
          status: 'Bot not configured',
          config: {
            chatId: telegramConfig.chatId,
            channelId: telegramConfig.channelId
          }
        })
      }

      const botInfo = await bot!.getMe()
      
      res.json({
        enabled: true,
        status: 'Bot active',
        bot: {
          id: botInfo.id,
          username: botInfo.username,
          firstName: botInfo.first_name
        },
        config: {
          chatId: telegramConfig.chatId,
          channelId: telegramConfig.channelId
        }
      })
    } catch (error) {
      console.error('Error getting bot info:', error)
      res.status(500).json({
        error: 'Failed to get bot info',
        details: (error as Error).message
      })
    }
  }

  // Get message history
  async getMessageHistory(req: Request, res: Response) {
    try {
      const { limit = 50, offset = 0 } = req.query

      const result = await db.query(
        `SELECT * FROM telegram_messages 
         ORDER BY sent_at DESC 
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      )

      const countResult = await db.query('SELECT COUNT(*) FROM telegram_messages')
      const total = parseInt(countResult.rows[0].count)

      res.json({
        messages: result.rows,
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: total > parseInt(offset as string) + parseInt(limit as string)
        }
      })
    } catch (error) {
      console.error('Error getting message history:', error)
      res.status(500).json({
        error: 'Failed to get message history',
        details: (error as Error).message
      })
    }
  }

  // Health check
  async healthCheck(req: Request, res: Response) {
    try {
      const health: {
        service: string
        status: string
        timestamp: string
        telegram: {
          enabled: boolean
          configured: boolean
          botStatus?: string
          error?: string
        }
        database: {
          connected: boolean
        }
      } = {
        service: 'telegram-bot',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        telegram: {
          enabled: telegramConfig.enabled,
          configured: !!telegramConfig.botToken
        },
        database: {
          connected: true
        }
      }

      if (telegramConfig.enabled) {
        try {
          await bot!.getMe()
          health.telegram.botStatus = 'active'
        } catch (error) {
          health.telegram.botStatus = 'error'
          health.telegram.error = (error as Error).message
          health.status = 'degraded'
        }
      }

      res.json(health)
    } catch (error) {
      console.error('Health check error:', error)
      res.status(500).json({
        service: 'telegram-bot',
        status: 'unhealthy',
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      })
    }
  }

  // Utility method to format wallet addresses
  private formatWalletAddress(address: string): string {
    if (!address || address.length < 8) return address
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }
} 