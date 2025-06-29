# Telegram Bot Setup for MWOR Tetris Raffle Announcements 📱

This guide explains how to set up Telegram announcements for exciting raffle events with suspenseful winner reveals.

## 🚀 Quick Setup

### 1. Create a Telegram Bot

1. **Message @BotFather** on Telegram
2. **Send `/newbot`** command
3. **Choose a name** for your bot (e.g., "MWOR Tetris Bot")
4. **Choose a username** (e.g., "mwor_tetris_bot")
5. **Copy the bot token** (looks like `123456789:ABCdefGHIjklMNOpqrSTUvwxyz`)

### 2. Create/Setup Your Telegram Channel

1. **Create a new channel** or group where announcements will be posted
2. **Add your bot** as an administrator with posting permissions
3. **Get the Chat ID**:
   - For public channels: Use `@your_channel_name`
   - For private channels/groups: Use numerical ID (e.g., `-1001234567890`)

#### Finding Chat ID for Private Channels:
1. Add your bot to the channel
2. Send a test message to the channel
3. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Look for the `chat.id` value in the response

### 3. Configure Environment Variables

Add these to your `.env` file:

```bash
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrSTUvwxyz
TELEGRAM_CHAT_ID=@your_channel_name
TELEGRAM_ANNOUNCEMENTS_ENABLED=true
```

## 🎪 Announcement Features

### Raffle Event Timeline

1. **🎪 Raffle Starting** - Announces when daily raffle begins
2. **⏰ Raffle Closing** - 5-minute warning before close
3. **🔮 Draw Starting** - VRF randomness generation begins
4. **🥁 Winner Reveals** - Suspenseful one-by-one announcements

### Winner Announcement Sequence

Winners are revealed in **reverse order** (lowest prize first) for maximum suspense:

- **🎯 10th Place** → **🏅 5th Place** → **🥉 3rd Place** → **🥈 2nd Place** → **🥇 1st Place**
- Each announcement includes:
  - 🏆 Winner wallet (formatted: `1234...5678`)
  - 💰 Prize amount and badge
  - 📊 Final score achieved
  - 🎫 Number of raffle tickets earned

### Suspense Features

- **🥁 Drum roll** introduction
- **⏱️ Progressive delays** (longer for higher positions)
- **🎊 Special formatting** for grand winner
- **🎉 Final celebration** message

## 🧪 Testing

### Test Connection
```bash
curl "http://localhost:3000/api/test-vrf?testTelegram=false"
```

### Test Full Announcement Sequence
```bash
curl "http://localhost:3000/api/test-vrf?testTelegram=true"
```

### Test Specific Features
```bash
curl -X POST http://localhost:3000/api/test-vrf \
  -H "Content-Type: application/json" \
  -d '{"testType": "telegram_test", "params": {"fullTest": true}}'
```

## 📱 Message Examples

### Raffle Starting
```
🎪 DAILY RAFFLE STARTING! 🎪

🎮 MWOR Tetris Championship
📊 Players competing: 247
💰 Prize pool: 1 Million MWOR Tokens + Daily Rewards

⏰ Raffle closes in 30 minutes!
🎯 Play now to secure your spot!

#MWORTetris #DailyRaffle #BlockchainGaming
```

### Winner Reveal (3rd Place)
```
🥉 Winner #3 Revealed!

🎯 1234...5678
💰 Prize: 100,000 MWOR + 3rd Place Badge
📊 Score: 100,000
🎫 Tickets: 15

⏳ Next winner coming up...
```

### Grand Winner
```
🎉 GRAND WINNER REVEALED! 🎉

👑 1st Place Winner:
🏆 9876...5432
💰 Prize: 500,000 MWOR + 1st Place Badge
📊 Score: 250,000
🎫 Tickets: 25

🎊 CONGRATULATIONS CHAMPION! 🎊

#GrandWinner #MWORTetris #Champion
```

## 🔧 Configuration Options

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather | Required |
| `TELEGRAM_CHAT_ID` | Channel/group ID or username | Required |
| `TELEGRAM_ANNOUNCEMENTS_ENABLED` | Enable/disable announcements | `false` |

### Customization

You can modify the announcement messages in `lib/telegram-bot.ts`:

- **Prize amounts** in `prepareWinnersForAnnouncement()`
- **Delay timing** in `revealWinnersWithSuspense()`
- **Message templates** in announcement methods

## 🎯 Integration Points

The Telegram announcements are integrated into:

1. **`DailyRaffleOrchestrator.executeDailyRaffle()`** - Main raffle flow
2. **VRF Test Endpoint** - `/api/test-vrf?testTelegram=true`
3. **Automated Raffle Schedule** - Daily at midnight UTC
4. **Manual Triggers** - Admin raffle execution

## 🚨 Troubleshooting

### Bot Not Sending Messages
- ✅ Check bot token is correct
- ✅ Verify chat ID is accurate
- ✅ Ensure bot is admin in channel
- ✅ Check `TELEGRAM_ANNOUNCEMENTS_ENABLED=true`

### Permission Errors
- ✅ Bot needs admin rights in channel
- ✅ Allow "Post Messages" permission
- ✅ For groups, disable "Restrict saving content"

### Rate Limiting
- Messages have built-in delays between announcements
- Telegram allows ~30 messages per second per bot
- Winner reveals use 3-4 second delays for suspense

## 🎊 Ready to Announce!

Once configured, your raffle announcements will create an exciting, engaging experience for your community with dramatic winner reveals that build suspense and celebrate achievements! 🎉

The system works completely automatically during raffle execution, or you can test it manually using the provided endpoints. 