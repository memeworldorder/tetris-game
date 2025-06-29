// Telegram Bot Integration for MWOR Tetris Game
// Handles raffle announcements and winner reveals with suspense

interface TelegramConfig {
  botToken: string
  chatId: string
  enabled: boolean
}

interface RaffleAnnouncement {
  type: 'raffle_starting' | 'raffle_closing' | 'draw_starting' | 'winner_reveal' | 'raffle_complete'
  title: string
  message: string
  data?: any
}

interface WinnerReveal {
  position: number
  winner: string
  prize: string
  score?: number
  tickets?: number
}

class TelegramBotManager {
  private config: TelegramConfig
  private baseUrl: string

  constructor() {
    this.config = {
      botToken: process.env.TELEGRAM_BOT_TOKEN || '',
      chatId: process.env.TELEGRAM_CHAT_ID || '',
      enabled: process.env.TELEGRAM_ANNOUNCEMENTS_ENABLED === 'true'
    }
    this.baseUrl = `https://api.telegram.org/bot${this.config.botToken}`
  }

  // Check if Telegram integration is properly configured
  isConfigured(): boolean {
    return this.config.enabled && 
           this.config.botToken.length > 0 && 
           this.config.chatId.length > 0
  }

  // Send a message to the configured Telegram chat
  private async sendMessage(text: string, parseMode: 'HTML' | 'Markdown' = 'HTML'): Promise<boolean> {
    if (!this.isConfigured()) {
      console.log('📱 Telegram not configured, skipping message:', text.slice(0, 50) + '...')
      return false
    }

    try {
      const response = await fetch(`${this.baseUrl}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: this.config.chatId,
          text,
          parse_mode: parseMode,
          disable_web_page_preview: true
        })
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('❌ Failed to send Telegram message:', error)
        return false
      }

      console.log('📱 Telegram message sent successfully')
      return true
    } catch (error) {
      console.error('❌ Telegram API error:', error)
      return false
    }
  }

  // Announce raffle starting
  async announceRaffleStarting(totalPlayers: number, prizePool: string): Promise<void> {
    const message = `
🎪 <b>DAILY RAFFLE STARTING!</b> 🎪

🎮 <b>MWOR Tetris Championship</b>
📊 Players competing: <b>${totalPlayers.toLocaleString()}</b>
💰 Prize pool: <b>${prizePool}</b>

⏰ <b>Raffle closes in 30 minutes!</b>
🎯 Play now to secure your spot!

#MWORTetris #DailyRaffle #BlockchainGaming
    `.trim()

    await this.sendMessage(message)
  }

  // Announce raffle closing soon
  async announceRaffleClosing(qualifiedPlayers: number, totalTickets: number): Promise<void> {
    const message = `
⏰ <b>RAFFLE CLOSING IN 5 MINUTES!</b> ⏰

🎯 Qualified players: <b>${qualifiedPlayers}</b>
🎫 Total raffle tickets: <b>${totalTickets}</b>

📈 Higher scores = More tickets = Better chances!
🚀 Last chance to improve your position!

#LastCall #MWORRaffle
    `.trim()

    await this.sendMessage(message)
  }

  // Announce draw is starting
  async announceDrawStarting(qualifiedPlayers: number, totalTickets: number, numberOfWinners: number): Promise<void> {
    const message = `
🔮 <b>RAFFLE DRAW STARTING!</b> 🔮

🎪 <b>Using Switchboard VRF for fair randomness</b>
👥 Qualified players: <b>${qualifiedPlayers}</b>
🎫 Total tickets: <b>${totalTickets}</b>
🏆 Winners to select: <b>${numberOfWinners}</b>

⚡ Generating cryptographic randomness...
🎯 Winner selection in progress...

<i>Stay tuned for the results! 🎊</i>

#VRFDraw #FairPlay #BlockchainRandomness
    `.trim()

    await this.sendMessage(message)
  }

  // Reveal winners one by one with suspense
  async revealWinnersWithSuspense(winners: WinnerReveal[], delayMs: number = 3000): Promise<void> {
    if (winners.length === 0) {
      await this.sendMessage('🤔 <b>No winners to announce...</b>')
      return
    }

    // Sort by position (lowest prize first for suspense)
    const sortedWinners = [...winners].sort((a, b) => b.position - a.position)

    // Initial suspense message
    await this.sendMessage(`
🥁 <b>DRUM ROLL PLEASE...</b> 🥁

🎊 Ready to reveal our ${winners.length} lucky winners!
⏰ Announcing results in 3... 2... 1...

<i>Building suspense... 🎭</i>
    `.trim())

    // Wait for initial suspense
    await this.delay(2000)

    // Reveal each winner with delay
    for (let i = 0; i < sortedWinners.length; i++) {
      const winner = sortedWinners[i]
      const isLastWinner = i === sortedWinners.length - 1
      
      let message = ''
      
      if (isLastWinner && winner.position === 1) {
        // Grand winner announcement
        message = `
🎉 <b>GRAND WINNER REVEALED!</b> 🎉

👑 <b>1st Place Winner:</b>
🏆 ${this.formatWallet(winner.winner)}
💰 Prize: <b>${winner.prize}</b>
📊 Score: <b>${winner.score?.toLocaleString() || 'N/A'}</b>
🎫 Tickets: <b>${winner.tickets || 'N/A'}</b>

🎊 <b>CONGRATULATIONS CHAMPION!</b> 🎊

#GrandWinner #MWORTetris #Champion
        `.trim()
      } else {
        // Regular winner announcement
        const positionEmoji = this.getPositionEmoji(winner.position)
        message = `
${positionEmoji} <b>Winner #${winner.position} Revealed!</b>

🎯 ${this.formatWallet(winner.winner)}
💰 Prize: <b>${winner.prize}</b>
📊 Score: <b>${winner.score?.toLocaleString() || 'N/A'}</b>
🎫 Tickets: <b>${winner.tickets || 'N/A'}</b>

${i < sortedWinners.length - 1 ? '⏳ <i>Next winner coming up...</i>' : ''}
        `.trim()
      }

      await this.sendMessage(message)
      
      // Add suspenseful delay between winners (longer for higher positions)
      if (i < sortedWinners.length - 1) {
        const suspenseDelay = winner.position <= 3 ? delayMs * 1.5 : delayMs
        await this.delay(suspenseDelay)
      }
    }

    // Final celebration message
    await this.delay(1000)
    await this.sendMessage(`
🎊 <b>DAILY RAFFLE COMPLETE!</b> 🎊

✅ All ${winners.length} winners have been revealed!
🎮 Congratulations to all participants!

🚀 <b>Next raffle starts tomorrow!</b>
💪 Keep playing to improve your chances!

#RaffleComplete #MWORTetris #PlayToEarn
    `.trim())
  }

  // Format wallet address for display
  private formatWallet(wallet: string): string {
    if (!wallet || wallet.length < 8) return wallet
    return `<code>${wallet.slice(0, 4)}...${wallet.slice(-4)}</code>`
  }

  // Get emoji for position
  private getPositionEmoji(position: number): string {
    switch (position) {
      case 1: return '🥇'
      case 2: return '🥈' 
      case 3: return '🥉'
      case 4: case 5: return '🏅'
      default: return '🎯'
    }
  }

  // Utility delay function
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Send custom announcement
  async sendCustomAnnouncement(announcement: RaffleAnnouncement): Promise<boolean> {
    const message = `
<b>${announcement.title}</b>

${announcement.message}

${announcement.data ? `<pre>${JSON.stringify(announcement.data, null, 2)}</pre>` : ''}
    `.trim()

    return await this.sendMessage(message)
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    if (!this.isConfigured()) {
      console.log('❌ Telegram bot not configured')
      return false
    }

    try {
      const response = await fetch(`${this.baseUrl}/getMe`)
      if (response.ok) {
        const botInfo = await response.json()
        console.log('✅ Telegram bot connected:', botInfo.result.username)
        return true
      } else {
        console.error('❌ Failed to connect to Telegram bot')
        return false
      }
    } catch (error) {
      console.error('❌ Telegram connection error:', error)
      return false
    }
  }

  // Get configuration status
  getStatus(): {
    configured: boolean
    botToken: string
    chatId: string
    enabled: boolean
  } {
    return {
      configured: this.isConfigured(),
      botToken: this.config.botToken ? `${this.config.botToken.slice(0, 8)}...` : 'Not set',
      chatId: this.config.chatId ? `${this.config.chatId.slice(0, 8)}...` : 'Not set',
      enabled: this.config.enabled
    }
  }
}

// Singleton instance
let telegramBotInstance: TelegramBotManager | null = null

export function getTelegramBot(): TelegramBotManager {
  if (!telegramBotInstance) {
    telegramBotInstance = new TelegramBotManager()
  }
  return telegramBotInstance
}

export type { TelegramConfig, RaffleAnnouncement, WinnerReveal }
export { TelegramBotManager } 