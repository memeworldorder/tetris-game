import TelegramBot from 'node-telegram-bot-api'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || ''
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || ''

if (!BOT_TOKEN) {
  console.warn('⚠️  No Telegram bot token provided. Running in mock mode.')
}

export const bot = BOT_TOKEN ? new TelegramBot(BOT_TOKEN, { polling: false }) : null

export const telegramConfig = {
  botToken: BOT_TOKEN,
  chatId: CHAT_ID,
  channelId: CHANNEL_ID,
  enabled: !!BOT_TOKEN,
  parseMode: 'HTML' as const,
  disableWebPagePreview: false,
  disableNotification: false
}

// Message templates
export const messageTemplates = {
  dailyWinner: `
🎉 <b>Daily Winner Announcement!</b>

🏆 <b>Winner:</b> {walletAddress}
🎮 <b>Game:</b> {gameName}
📊 <b>Score:</b> {score:,}
💰 <b>Prize:</b> {prize} SOL

Congratulations! 🎊

<i>Want to be the next winner? Play now at our GameFi platform!</i>
  `,

  weeklyLeaderboard: `
📅 <b>Weekly Leaderboard Update</b>

🥇 <b>1st Place:</b> {first.wallet} - {first.score:,} points
🥈 <b>2nd Place:</b> {second.wallet} - {second.score:,} points  
🥉 <b>3rd Place:</b> {third.wallet} - {third.score:,} points

🎮 <b>Game:</b> {gameName}
📊 <b>Total Players:</b> {totalPlayers:,}
💰 <b>Total Prizes:</b> {totalPrizes} SOL

Keep playing to climb the leaderboard! 🚀
  `,

  raffleWinner: `
🎲 <b>Raffle Winner!</b>

🎉 <b>Winner:</b> {walletAddress}
🎫 <b>Tickets:</b> {ticketCount}
💰 <b>Prize:</b> {prize} {prizeType}
🎯 <b>Winning Ticket:</b> #{winningTicket}

🎊 Congratulations on your win!

<i>Daily raffles happen every 24 hours. Keep playing to earn more tickets!</i>
  `,

  newGame: `
🎮 <b>New Game Launched!</b>

🚀 <b>Game:</b> {gameName}
📝 <b>Description:</b> {description}
💰 <b>Prize Pool:</b> {prizePool} SOL
🎯 <b>Lives:</b> {freeLives} free per day

<i>Start playing now and climb the leaderboard!</i>
  `,

  maintenance: `
🔧 <b>Maintenance Notice</b>

⏰ <b>Start Time:</b> {startTime}
⏳ <b>Duration:</b> {duration}
📋 <b>Reason:</b> {reason}

<i>We'll be back soon with improvements! Thank you for your patience.</i>
  `,

  systemAlert: `
🚨 <b>System Alert</b>

⚠️ <b>Type:</b> {alertType}
📋 <b>Message:</b> {message}
🕐 <b>Time:</b> {timestamp}

<i>Our team is investigating. Updates will follow.</i>
  `
}

export const formatMessage = (template: string, data: Record<string, any>): string => {
  return template.replace(/\{(\w+(?:\.\w+)*)\}/g, (match, path) => {
    const value = path.split('.').reduce((obj: any, key: string) => obj?.[key], data)
    
    if (typeof value === 'number') {
      return value.toLocaleString()
    }
    
    return value || match
  })
} 