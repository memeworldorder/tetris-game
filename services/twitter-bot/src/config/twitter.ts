import { TwitterApi } from 'twitter-api-v2'

const API_KEY = process.env.TWITTER_API_KEY || ''
const API_SECRET = process.env.TWITTER_API_SECRET || ''
const ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN || ''
const ACCESS_SECRET = process.env.TWITTER_ACCESS_SECRET || ''

const isConfigured = !!(API_KEY && API_SECRET && ACCESS_TOKEN && ACCESS_SECRET)

export const twitterClient = isConfigured ? new TwitterApi({
  appKey: API_KEY,
  appSecret: API_SECRET,
  accessToken: ACCESS_TOKEN,
  accessSecret: ACCESS_SECRET,
}) : null

export const twitterConfig = {
  apiKey: API_KEY,
  enabled: isConfigured,
  maxTweetLength: 280,
  hashtagsEnabled: true,
  mediaEnabled: true
}

if (!isConfigured) {
  console.warn('⚠️  Twitter API not configured. Running in mock mode.')
}

// Tweet templates
export const tweetTemplates = {
  dailyWinner: `🎉 DAILY WINNER! 🎉

🏆 {walletAddress}
🎮 {gameName}
📊 {score:,} points
💰 {prize} $SOL

Congratulations! 🎊

#GameFi #P2E #Solana #Gaming`,

  weeklyLeaderboard: `📅 WEEKLY LEADERBOARD 📅

🥇 {first.wallet} - {first.score:,}
🥈 {second.wallet} - {second.score:,}
🥉 {third.wallet} - {third.score:,}

🎮 {gameName}
👥 {totalPlayers:,} players
💰 {totalPrizes} $SOL prizes

#Leaderboard #GameFi #P2E`,

  raffleWinner: `🎲 RAFFLE WINNER! 🎲

🎉 {walletAddress}
🎫 {ticketCount} tickets
💰 {prize} {prizeType}
🎯 Ticket #{winningTicket}

Lucky winner! 🍀

#Raffle #GameFi #Solana`,

  newGame: `🎮 NEW GAME LAUNCHED! 🎮

🚀 {gameName}
📝 {description}
💰 {prizePool} $SOL pool
🎯 {freeLives} free lives/day

Play now! 

#NewGame #GameFi #P2E`,

  milestone: `🎊 MILESTONE REACHED! 🎊

🚀 {milestone}
🎯 {description}
👥 {playerCount:,} players
💰 {totalRewards} $SOL distributed

Thank you community! 

#Milestone #GameFi`,

  maintenance: `🔧 MAINTENANCE NOTICE 🔧

⏰ {startTime}
⏳ {duration}
📋 {reason}

Back soon with improvements!

#Maintenance #Update`
}

export const formatTweet = (template: string, data: Record<string, any>): string => {
  let tweet = template.replace(/\{(\w+(?:\.\w+)*)\}/g, (match, path) => {
    const value = path.split('.').reduce((obj: any, key: string) => obj?.[key], data)
    
    if (typeof value === 'number') {
      return value.toLocaleString()
    }
    
    return value || match
  })

  // Ensure tweet doesn't exceed Twitter's character limit
  if (tweet.length > twitterConfig.maxTweetLength) {
    const excess = tweet.length - twitterConfig.maxTweetLength + 3
    const mainContent = tweet.split('\n')[0]
    if (mainContent.length > excess) {
      tweet = mainContent.substring(0, mainContent.length - excess) + '...'
    }
  }

  return tweet
}

export const formatWalletForTwitter = (address: string): string => {
  if (!address || address.length < 8) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
} 