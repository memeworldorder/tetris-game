# 🛠️ QUICK SUPABASE CLI INSTALLATION

The automated npm installation failed because Node.js v24.1.0 doesn't support global Supabase CLI installation. Here are the working alternatives:

## 🐧 Linux Installation (Recommended)

```bash
# Method 1: Official installer script
curl -fsSL https://supabase.com/install.sh | sh

# Add to PATH (add this to your ~/.bashrc or ~/.zshrc)
export PATH="$HOME/.local/bin:$PATH"

# Reload your shell or run:
source ~/.bashrc  # or ~/.zshrc
```

## 🍎 macOS Installation

```bash
# Method 1: Homebrew (recommended)
brew install supabase/tap/supabase

# Method 2: Official installer script
curl -fsSL https://supabase.com/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
```

## 🪟 Windows Installation

```bash
# Using Scoop
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Or download binary from GitHub releases
# https://github.com/supabase/cli/releases
```

## ✅ Verify Installation

```bash
supabase --version
# Should output: supabase version 1.x.x
```

## 🚀 Quick Setup After Installation

```bash
# 1. Login to Supabase
supabase login

# 2. Link your project
supabase link --project-ref qtwmykpyhcvfavjgncty

# 3. Run the automated setup
./setup-supabase-functions.sh
```

## 🔧 Alternative: Manual Function Deployment

If you prefer to skip the automated script:

```bash
# 1. Initialize project
supabase init

# 2. Create functions manually
supabase functions new handle-game-start
supabase functions new handle-game-end
supabase functions new daily-reset
supabase functions new verify-wallet

# 3. Copy function code from supabase/functions/ directory

# 4. Set secrets
supabase secrets set JWT_SECRET="gamefi-tetris-production-secret-key-2024"
supabase secrets set SUPABASE_URL="https://qtwmykpyhcvfavjgncty.supabase.co"
supabase secrets set SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0d215a3B5aGN2ZmF2amduY3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNTU2MDcsImV4cCI6MjA2NjYzMTYwN30.lhpqOaxVxadQamtHT_vx3-JyoKyThV3uMGMLvOMHRyU"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0d215a3B5aGN2ZmF2amduY3R5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTA1NTYwNywiZXhwIjoyMDY2NjMxNjA3fQ.fwu/6tRriMFnAYMa2UH6HoKu2uMdCU8P8wScHcX3Us0kFbOl0pfQ0vjPUM34XRyRu82LZ0dVCmAiXUJjlVpC2A"

# 5. Deploy functions
supabase functions deploy

# 6. Test functions
./test-edge-functions.sh
```

## 🆘 Troubleshooting

### "command not found: supabase"
- Make sure `$HOME/.local/bin` is in your PATH
- Restart your terminal after installation
- Try running: `export PATH="$HOME/.local/bin:$PATH"`

### Permission errors
- Don't use `sudo` with the installer
- Make sure you have write permissions to `$HOME/.local/bin`

### Still having issues?
- Download the binary directly from: https://github.com/supabase/cli/releases
- Extract and place in your PATH manually

## 🎯 Once CLI is Working

Run the setup script:
```bash
./setup-supabase-functions.sh
```

This will handle the rest of the setup automatically! 