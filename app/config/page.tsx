'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { 
  Settings, 
  Bot, 
  Database, 
  Coins, 
  GamepadIcon, 
  DollarSign, 
  Shield, 
  TestTube,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle
} from 'lucide-react'

interface ConfigData {
  telegram: {
    botToken: string
    chatId: string
    enabled: boolean
  }
  database: {
    supabaseUrl: string
    supabaseServiceKey: string
    databaseUrl: string
  }
  solana: {
    rpc: string
    mworMint: string
    mworgovMint: string
    priceOracleFeed: string
    vrfQueue: string
  }
  game: {
    freeLifeLimitPerIp: number
    paidLifeCap: number
    bonusDivisor: number
    bonusCap: number
  }
  pricing: {
    cheapUsd: number
    midUsd: number
    highUsd: number
  }
  security: {
    cronSecret: string
    heliusWebhookSecret: string
  }
}

interface ConfigStatus {
  telegram: { connected: boolean; error: string | null }
  database: { healthy: boolean; error: string | null }
}

export default function ConfigPage() {
  const [config, setConfig] = useState<ConfigData | null>(null)
  const [status, setStatus] = useState<ConfigStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/config')
      const data = await response.json()
      
      if (data.success) {
        setConfig(data.config)
        setStatus(data.status)
      } else {
        toast({
          title: 'Failed to load configuration',
          description: data.error,
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error loading configuration',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async (section: keyof ConfigData, updates: any) => {
    if (!config) return

    setSaving(true)
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: { [section]: updates }
        })
      })

      const data = await response.json()
      
      if (data.success) {
        toast({
          title: 'Configuration saved',
          description: data.message
        })
        // Reload config to get updated status
        await loadConfig()
      } else {
        toast({
          title: 'Failed to save configuration',
          description: data.error,
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error saving configuration',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const testConnection = async (type: 'telegram' | 'database') => {
    setTesting(type)
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: type === 'telegram' ? 'test-telegram' : 'test-database'
        })
      })

      const data = await response.json()
      
      toast({
        title: data.success ? 'Test successful' : 'Test failed',
        description: data.message,
        variant: data.success ? 'default' : 'destructive'
      })

      // Reload config to get updated status
      await loadConfig()
    } catch (error) {
      toast({
        title: 'Test error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    } finally {
      setTesting(null)
    }
  }

  const initializeDatabase = async (action: string) => {
    setTesting('database')
    try {
      const response = await fetch('/api/init-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      const data = await response.json()
      
      toast({
        title: data.success ? 'Database operation successful' : 'Database operation failed',
        description: data.success ? data.result?.message || 'Operation completed' : data.error,
        variant: data.success ? 'default' : 'destructive'
      })

      // Reload config to get updated status
      await loadConfig()
    } catch (error) {
      toast({
        title: 'Database operation error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    } finally {
      setTesting(null)
    }
  }

  const updateConfig = (section: keyof ConfigData, field: string, value: any) => {
    if (!config) return
    setConfig({
      ...config,
      [section]: {
        ...config[section],
        [field]: value
      }
    })
  }

  const StatusIcon = ({ status }: { status: boolean | undefined }) => {
    if (status === undefined) return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    return status ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!config) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load configuration. Please check your server setup.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">MWOR Tetris Configuration</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <span className="font-medium">Telegram Bot</span>
              <StatusIcon status={status?.telegram.connected} />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {status?.telegram.connected ? 'Connected' : 'Not connected'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              <span className="font-medium">Database</span>
              <StatusIcon status={status?.database.healthy} />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {status?.database.healthy ? 'Healthy' : 'Not connected'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              <span className="font-medium">Solana RPC</span>
              <StatusIcon status={!!config.solana.rpc} />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {config.solana.rpc ? 'Configured' : 'Not configured'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="telegram" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="telegram" className="flex items-center gap-1">
            <Bot className="h-4 w-4" />
            Telegram
          </TabsTrigger>
          <TabsTrigger value="database" className="flex items-center gap-1">
            <Database className="h-4 w-4" />
            Database
          </TabsTrigger>
          <TabsTrigger value="solana" className="flex items-center gap-1">
            <Coins className="h-4 w-4" />
            Solana
          </TabsTrigger>
          <TabsTrigger value="game" className="flex items-center gap-1">
            <GamepadIcon className="h-4 w-4" />
            Game
          </TabsTrigger>
          <TabsTrigger value="pricing" className="flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            Pricing
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-1">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Telegram Configuration */}
        <TabsContent value="telegram">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Telegram Bot Configuration
              </CardTitle>
              <CardDescription>
                Configure your Telegram bot for raffle announcements and winner reveals.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {status?.telegram.error && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{status.telegram.error}</AlertDescription>
                </Alert>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="telegram-enabled"
                  checked={config.telegram.enabled}
                  onCheckedChange={(enabled) => updateConfig('telegram', 'enabled', enabled)}
                />
                <Label htmlFor="telegram-enabled">Enable Telegram Announcements</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bot-token">Bot Token</Label>
                <Input
                  id="bot-token"
                  type="password"
                  placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxyz"
                  value={config.telegram.botToken}
                  onChange={(e) => updateConfig('telegram', 'botToken', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Get this from @BotFather on Telegram
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="chat-id">Chat ID</Label>
                <Input
                  id="chat-id"
                  placeholder="@your_channel_name or -1001234567890"
                  value={config.telegram.chatId}
                  onChange={(e) => updateConfig('telegram', 'chatId', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Channel username or chat ID where announcements will be sent
                </p>
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button
                  onClick={() => saveConfig('telegram', config.telegram)}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Telegram Config
                </Button>
                <Button
                  variant="outline"
                  onClick={() => testConnection('telegram')}
                  disabled={testing === 'telegram' || !config.telegram.botToken || !config.telegram.chatId}
                >
                  {testing === 'telegram' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <TestTube className="h-4 w-4 mr-2" />}
                  Test Connection
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Database Configuration */}
        <TabsContent value="database">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Configuration
              </CardTitle>
              <CardDescription>
                Configure your Supabase database connection and initialize tables.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {status?.database.error && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{status.database.error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="supabase-url">Supabase URL</Label>
                <Input
                  id="supabase-url"
                  placeholder="https://your-project.supabase.co"
                  value={config.database.supabaseUrl}
                  onChange={(e) => updateConfig('database', 'supabaseUrl', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supabase-key">Supabase Service Key</Label>
                <Input
                  id="supabase-key"
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={config.database.supabaseServiceKey}
                  onChange={(e) => updateConfig('database', 'supabaseServiceKey', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="database-url">Database URL (Optional)</Label>
                <Input
                  id="database-url"
                  placeholder="postgresql://user:pass@host:port/database"
                  value={config.database.databaseUrl}
                  onChange={(e) => updateConfig('database', 'databaseUrl', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Direct PostgreSQL connection (optional, for advanced use)
                </p>
              </div>

              <Separator />

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => saveConfig('database', config.database)}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Database Config
                </Button>
                <Button
                  variant="outline"
                  onClick={() => testConnection('database')}
                  disabled={testing === 'database'}
                >
                  {testing === 'database' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <TestTube className="h-4 w-4 mr-2" />}
                  Test Connection
                </Button>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">Database Operations</h4>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => initializeDatabase('init')}
                    disabled={testing === 'database'}
                  >
                    Initialize Empty DB
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => initializeDatabase('mock_data')}
                    disabled={testing === 'database'}
                  >
                    Add Mock Data
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => initializeDatabase('clear')}
                    disabled={testing === 'database'}
                  >
                    Clear All Data
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => initializeDatabase('status')}
                    disabled={testing === 'database'}
                  >
                    Check Status
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Solana Configuration */}
        <TabsContent value="solana">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5" />
                Solana Configuration
              </CardTitle>
              <CardDescription>
                Configure Solana RPC connection and token addresses.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="solana-rpc">Solana RPC URL</Label>
                <Input
                  id="solana-rpc"
                  placeholder="https://api.mainnet-beta.solana.com"
                  value={config.solana.rpc}
                  onChange={(e) => updateConfig('solana', 'rpc', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mwor-mint">MWOR Token Mint</Label>
                <Input
                  id="mwor-mint"
                  placeholder="Token mint address"
                  value={config.solana.mworMint}
                  onChange={(e) => updateConfig('solana', 'mworMint', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mworgov-mint">MWORGOV Token Mint</Label>
                <Input
                  id="mworgov-mint"
                  placeholder="Governance token mint address"
                  value={config.solana.mworgovMint}
                  onChange={(e) => updateConfig('solana', 'mworgovMint', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price-oracle">Price Oracle Feed</Label>
                <Input
                  id="price-oracle"
                  placeholder="Price oracle feed address"
                  value={config.solana.priceOracleFeed}
                  onChange={(e) => updateConfig('solana', 'priceOracleFeed', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vrf-queue">VRF Queue</Label>
                <Input
                  id="vrf-queue"
                  placeholder="Switchboard VRF queue address"
                  value={config.solana.vrfQueue}
                  onChange={(e) => updateConfig('solana', 'vrfQueue', e.target.value)}
                />
              </div>

              <Button
                onClick={() => saveConfig('solana', config.solana)}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Solana Config
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Game Configuration */}
        <TabsContent value="game">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GamepadIcon className="h-5 w-5" />
                Game Configuration
              </CardTitle>
              <CardDescription>
                Configure game rules and limits.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="free-life-limit">Free Life Limit per IP</Label>
                  <Input
                    id="free-life-limit"
                    type="number"
                    value={config.game.freeLifeLimitPerIp}
                    onChange={(e) => updateConfig('game', 'freeLifeLimitPerIp', parseInt(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paid-life-cap">Paid Life Cap</Label>
                  <Input
                    id="paid-life-cap"
                    type="number"
                    value={config.game.paidLifeCap}
                    onChange={(e) => updateConfig('game', 'paidLifeCap', parseInt(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bonus-divisor">Bonus Divisor</Label>
                  <Input
                    id="bonus-divisor"
                    type="number"
                    value={config.game.bonusDivisor}
                    onChange={(e) => updateConfig('game', 'bonusDivisor', parseInt(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bonus-cap">Bonus Cap</Label>
                  <Input
                    id="bonus-cap"
                    type="number"
                    value={config.game.bonusCap}
                    onChange={(e) => updateConfig('game', 'bonusCap', parseInt(e.target.value))}
                  />
                </div>
              </div>

              <Button
                onClick={() => saveConfig('game', config.game)}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Game Config
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pricing Configuration */}
        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Pricing Configuration
              </CardTitle>
              <CardDescription>
                Configure life pricing tiers in USD.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cheap-usd">Cheap Price (USD)</Label>
                  <Input
                    id="cheap-usd"
                    type="number"
                    step="0.01"
                    value={config.pricing.cheapUsd}
                    onChange={(e) => updateConfig('pricing', 'cheapUsd', parseFloat(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mid-usd">Mid Price (USD)</Label>
                  <Input
                    id="mid-usd"
                    type="number"
                    step="0.01"
                    value={config.pricing.midUsd}
                    onChange={(e) => updateConfig('pricing', 'midUsd', parseFloat(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="high-usd">High Price (USD)</Label>
                  <Input
                    id="high-usd"
                    type="number"
                    step="0.01"
                    value={config.pricing.highUsd}
                    onChange={(e) => updateConfig('pricing', 'highUsd', parseFloat(e.target.value))}
                  />
                </div>
              </div>

              <Button
                onClick={() => saveConfig('pricing', config.pricing)}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Pricing Config
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Configuration */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Configuration
              </CardTitle>
              <CardDescription>
                Configure security settings and API secrets.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cron-secret">CRON Secret</Label>
                <Input
                  id="cron-secret"
                  type="password"
                  placeholder="Secure secret for CRON endpoints"
                  value={config.security.cronSecret}
                  onChange={(e) => updateConfig('security', 'cronSecret', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="helius-secret">Helius Webhook Secret</Label>
                <Input
                  id="helius-secret"
                  type="password"
                  placeholder="Webhook secret from Helius"
                  value={config.security.heliusWebhookSecret}
                  onChange={(e) => updateConfig('security', 'heliusWebhookSecret', e.target.value)}
                />
              </div>

              <Button
                onClick={() => saveConfig('security', config.security)}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Security Config
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 