// Telegram Bot Integration for raffle announcements – migrated
/* eslint-disable */

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
      enabled: process.env.TELEGRAM_ANNOUNCEMENTS_ENABLED === 'true',
    }
    this.baseUrl = `https://api.telegram.org/bot${this.config.botToken}`
  }

  isConfigured(): boolean {
    return (
      this.config.enabled &&
      this.config.botToken.length > 0 &&
      this.config.chatId.length > 0
    )
  }

  private async sendMessage(text: string, parseMode: 'HTML' | 'Markdown' = 'HTML') {
    if (!this.isConfigured()) {
      console.log('📱 Telegram not configured, skipping message:', text.slice(0, 50))
      return false
    }
    try {
      const res = await fetch(`${this.baseUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.config.chatId,
          text,
          parse_mode: parseMode,
          disable_web_page_preview: true,
        }),
      })
      if (!res.ok) {
        console.error('❌ Failed to send Telegram message:', await res.text())
        return false
      }
      console.log('📱 Telegram message sent')
      return true
    } catch (error) {
      console.error('❌ Telegram API error:', error)
      return false
    }
  }

  async announceRaffleStarting(totalPlayers: number, prizePool: string) {
    const msg = `🎪 <b>DAILY RAFFLE STARTING!</b> 🎪\n\n🎮 <b>MWOR Tetris Championship</b>\n📊 Players competing: <b>${totalPlayers.toLocaleString()}</b>\n💰 Prize pool: <b>${prizePool}</b>\n\n⏰ <b>Raffle closes in 30 minutes!</b>\n🎯 Play now to secure your spot!\n\n#MWORTetris #DailyRaffle #BlockchainGaming`
    await this.sendMessage(msg)
  }

  async announceRaffleClosing(qualifiedPlayers: number, totalTickets: number) {
    const msg = `⏰ <b>RAFFLE CLOSING IN 5 MINUTES!</b> ⏰\n\n🎯 Qualified players: <b>${qualifiedPlayers}</b>\n🎫 Total raffle tickets: <b>${totalTickets}</b>\n\n📈 Higher scores = More tickets = Better chances!\n🚀 Last chance to improve your position!\n\n#LastCall #MWORRaffle`
    await this.sendMessage(msg)
  }

  async announceDrawStarting(qualifiedPlayers: number, totalTickets: number, numberOfWinners: number) {
    const msg = `🔮 <b>RAFFLE DRAW STARTING!</b> 🔮\n\n🎪 <b>Using Switchboard VRF for fair randomness</b>\n👥 Qualified players: <b>${qualifiedPlayers}</b>\n🎫 Total tickets: <b>${totalTickets}</b>\n🏆 Winners to select: <b>${numberOfWinners}</b>\n\n⚡ Generating cryptographic randomness...\n🎯 Winner selection in progress...\n\n<i>Stay tuned for the results! 🎊</i>\n\n#VRFDraw #FairPlay #BlockchainRandomness`
    await this.sendMessage(msg)
  }

  async revealWinnersWithSuspense(winners: WinnerReveal[], delayMs = 3000) {
    if (winners.length === 0) {
      await this.sendMessage('🤔 <b>No winners to announce...</b>')
      return
    }
    const sorted = [...winners].sort((a, b) => b.position - a.position)
    await this.sendMessage(`🥁 <b>DRUM ROLL PLEASE...</b> 🥁\n\n🎊 Ready to reveal our ${winners.length} lucky winners!\n⏰ Announcing results in 3... 2... 1...\n\n<i>Building suspense... 🎭</i>`)    
    await this.delay(2000)
    for (let i = 0; i < sorted.length; i++) {
      const w = sorted[i]
      const isGrand = i === sorted.length - 1 && w.position === 1
      const emoji = this.getPositionEmoji(w.position)
      const msg = isGrand
        ? `🎉 <b>GRAND WINNER REVEALED!</b> 🎉\n\n👑 <b>1st Place Winner:</b>\n🏆 ${this.formatWallet(w.winner)}\n💰 Prize: <b>${w.prize}</b>\n📊 Score: <b>${w.score?.toLocaleString() ?? 'N/A'}</b>\n🎫 Tickets: <b>${w.tickets ?? 'N/A'}</b>\n\n🎊 <b>CONGRATULATIONS CHAMPION!</b> 🎊\n\n#GrandWinner #MWORTetris #Champion`
        : `${emoji} <b>Winner #${w.position} Revealed!</b>\n\n🎯 ${this.formatWallet(w.winner)}\n💰 Prize: <b>${w.prize}</b>\n📊 Score: <b>${w.score?.toLocaleString() ?? 'N/A'}</b>\n🎫 Tickets: <b>${w.tickets ?? 'N/A'}</b>\n\n${i < sorted.length - 1 ? '⏳ <i>Next winner coming up...</i>' : ''}`
      await this.sendMessage(msg)
      if (i < sorted.length - 1) {
        await this.delay(w.position <= 3 ? delayMs * 1.5 : delayMs)
      }
    }
    await this.delay(1000)
    await this.sendMessage(`🎊 <b>DAILY RAFFLE COMPLETE!</b> 🎊\n\n✅ All ${winners.length} winners have been revealed!\n🎮 Congratulations to all participants!\n\n🚀 <b>Next raffle starts tomorrow!</b>\n💪 Keep playing to improve your chances!\n\n#RaffleComplete #MWORTetris #PlayToEarn`)
  }

  private formatWallet(w: string) {
    return !w || w.length < 8 ? w : `<code>${w.slice(0, 4)}...${w.slice(-4)}</code>`
  }
  private getPositionEmoji(pos: number) {
    return pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : pos <= 5 ? '🏅' : '🎯'
  }
  private delay(ms: number) {
    return new Promise((r) => setTimeout(r, ms))
  }

  async sendCustomAnnouncement(a: RaffleAnnouncement) {
    const msg = `<b>${a.title}</b>\n\n${a.message}\n\n${a.data ? `<pre>${JSON.stringify(a.data, null, 2)}</pre>` : ''}`
    return this.sendMessage(msg)
  }

  async testConnection() {
    if (!this.isConfigured()) return false
    try {
      const res = await fetch(`${this.baseUrl}/getMe`)
      if (res.ok) {
        const info = await res.json()
        console.log('✅ Telegram bot connected:', info.result.username)
        return true
      }
      return false
    } catch {
      return false
    }
  }

  getStatus() {
    return {
      configured: this.isConfigured(),
      botToken: this.config.botToken ? `${this.config.botToken.slice(0, 8)}...` : 'Not set',
      chatId: this.config.chatId ? `${this.config.chatId.slice(0, 8)}...` : 'Not set',
      enabled: this.config.enabled,
    }
  }
}

let telegramBotInstance: TelegramBotManager | null = null
export function getTelegramBot() {
  if (!telegramBotInstance) telegramBotInstance = new TelegramBotManager()
  return telegramBotInstance
}

export type { TelegramConfig, RaffleAnnouncement, WinnerReveal }
export { TelegramBotManager }