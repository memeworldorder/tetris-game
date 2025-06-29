'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface AdminUser {
  id: number
  username: string
  email: string
  role: string
  permissions: string[]
  last_login?: string
}

interface GameConfig {
  game_id: string
  name: string
  description?: string
  active: boolean
  lives_config: any
  scoring_rules: any
  leaderboard_config: any
  raffle_config: any
  payment_config: any
}

interface RealtimeStats {
  active_users_today: number
  games_started_today: number
  payments_today: number
  lives_used_today: number
  top_scores: Array<{ wallet_address: string; score: number; created_at: string }>
  recent_alerts: Array<{ alert_type: string; severity: string; title: string; created_at: string }>
}

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<AdminUser | null>(null)
  const [credentials, setCredentials] = useState({ username: '', password: '' })
  const [error, setError] = useState('')

  // Dashboard state
  const [games, setGames] = useState<GameConfig[]>([])
  const [realtimeStats, setRealtimeStats] = useState<RealtimeStats | null>(null)
  const [selectedGame, setSelectedGame] = useState<string>('')
  const [leaderboardOverview, setLeaderboardOverview] = useState<any[]>([])
  const [leaderboardSnapshots, setLeaderboardSnapshots] = useState<any[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<string>('daily')

  useEffect(() => {
    checkAuthStatus()
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData()
      // Set up real-time updates
      const interval = setInterval(loadRealtimeStats, 30000) // Update every 30 seconds
      return () => clearInterval(interval)
    }
  }, [isAuthenticated, selectedGame])

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      if (!token) {
        setLoading(false)
        return
      }

      const response = await fetch('/api/admin/auth', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setIsAuthenticated(true)
      } else {
        localStorage.removeItem('admin_token')
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      localStorage.removeItem('admin_token')
    }
    setLoading(false)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem('admin_token', data.token)
        setUser(data.user)
        setIsAuthenticated(true)
      } else {
        setError(data.error || 'Login failed')
      }
    } catch (error) {
      setError('Login failed. Please try again.')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    setIsAuthenticated(false)
    setUser(null)
  }

  const loadDashboardData = async () => {
    try {
      await Promise.all([
        loadGames(),
        loadRealtimeStats(),
        loadLeaderboardOverview()
      ])
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    }
  }

  const loadGames = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/games', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setGames(data.games)
        if (data.games.length > 0 && !selectedGame) {
          setSelectedGame(data.games[0].game_id)
        }
      }
    } catch (error) {
      console.error('Failed to load games:', error)
    }
  }

  const loadRealtimeStats = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      const gameParam = selectedGame ? `?gameId=${selectedGame}` : ''
      const response = await fetch(`/api/admin/analytics?period=realtime${gameParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setRealtimeStats(data.realtime)
      }
    } catch (error) {
      console.error('Failed to load real-time stats:', error)
    }
  }

  const loadLeaderboardOverview = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/leaderboards?action=overview', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setLeaderboardOverview(data.overview)
      }
    } catch (error) {
      console.error('Failed to load leaderboard overview:', error)
    }
  }

  const loadLeaderboardSnapshots = async (gameId: string, period: string) => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`/api/admin/leaderboards?action=snapshots&gameId=${gameId}&period=${period}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setLeaderboardSnapshots(data.snapshots)
      }
    } catch (error) {
      console.error('Failed to load leaderboard snapshots:', error)
    }
  }

  const createLeaderboardSnapshot = async (gameId: string, period: string) => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/leaderboards', {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'create_snapshot',
          gameId,
          period
        })
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Snapshot created: ${data.entriesCreated} entries, ${data.totalTickets} tickets distributed`)
        loadLeaderboardSnapshots(gameId, period)
        loadLeaderboardOverview()
      } else {
        const error = await response.json()
        alert(`Failed to create snapshot: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to create snapshot:', error)
      alert('Failed to create snapshot')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>GameFi Admin Dashboard</CardTitle>
            <CardDescription>Sign in to access the admin panel</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={credentials.username}
                  onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                  required
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full">
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">GameFi Admin Dashboard</h1>
              <p className="text-sm text-gray-500">Welcome back, {user?.username}</p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline">{user?.role}</Badge>
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="analytics" className="space-y-6">
                     <TabsList>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="games">Games</TabsTrigger>
            <TabsTrigger value="leaderboards">Leaderboards</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
          </TabsList>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Real-time Analytics</h2>
              <select
                value={selectedGame}
                onChange={(e) => setSelectedGame(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">All Games</option>
                {games.map(game => (
                  <option key={game.game_id} value={game.game_id}>
                    {game.name}
                  </option>
                ))}
              </select>
            </div>

            {realtimeStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Active Users Today</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{realtimeStats.active_users_today}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Games Started</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{realtimeStats.games_started_today}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Payments Today</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{realtimeStats.payments_today}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Lives Used</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{realtimeStats.lives_used_today}</div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Top Scores */}
            {realtimeStats?.top_scores && (
              <Card>
                <CardHeader>
                  <CardTitle>Today's Top Scores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {realtimeStats.top_scores.map((score, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b">
                        <span className="font-mono text-sm">
                          {score.wallet_address.slice(0, 8)}...{score.wallet_address.slice(-8)}
                        </span>
                        <span className="font-bold">{score.score.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Games Tab */}
          <TabsContent value="games" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Game Management</h2>
              <Button>Add New Game</Button>
            </div>

            <div className="grid gap-6">
              {games.map(game => (
                <Card key={game.game_id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{game.name}</CardTitle>
                        <CardDescription>{game.description}</CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={game.active ? "default" : "secondary"}>
                          {game.active ? "Active" : "Inactive"}
                        </Badge>
                        <Button variant="outline" size="sm">Edit</Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Max Lives</p>
                        <p className="text-gray-600">{game.lives_config.max_lives}</p>
                      </div>
                      <div>
                        <p className="font-medium">Free Lives/Day</p>
                        <p className="text-gray-600">{game.lives_config.free_lives_per_day}</p>
                      </div>
                      <div>
                        <p className="font-medium">Raffle Enabled</p>
                        <p className="text-gray-600">{game.raffle_config.enabled ? "Yes" : "No"}</p>
                      </div>
                      <div>
                        <p className="font-medium">Payments Enabled</p>
                        <p className="text-gray-600">{game.payment_config.enabled ? "Yes" : "No"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Leaderboards Tab */}
          <TabsContent value="leaderboards" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Leaderboard Management</h2>
              <div className="flex space-x-2">
                <select
                  value={selectedGame}
                  onChange={(e) => {
                    setSelectedGame(e.target.value)
                    if (e.target.value) {
                      loadLeaderboardSnapshots(e.target.value, selectedPeriod)
                    }
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select Game</option>
                  {games.map(game => (
                    <option key={game.game_id} value={game.game_id}>
                      {game.name}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedPeriod}
                  onChange={(e) => {
                    setSelectedPeriod(e.target.value)
                    if (selectedGame) {
                      loadLeaderboardSnapshots(selectedGame, e.target.value)
                    }
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>

            {/* Leaderboard Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Leaderboard Overview</CardTitle>
                <CardDescription>Summary of all leaderboard activities</CardDescription>
              </CardHeader>
              <CardContent>
                {leaderboardOverview.length > 0 ? (
                  <div className="grid gap-4">
                    {leaderboardOverview.map((overview, index) => (
                      <div key={index} className="flex justify-between items-center p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{overview.game_id}</p>
                          <p className="text-sm text-gray-600">{overview.period_type} leaderboard</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{overview.total_entries} entries</p>
                          <p className="text-sm text-gray-600">{overview.total_tickets} tickets</p>
                          <p className="text-sm text-gray-600">Top: {overview.top_score?.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No leaderboard data available</p>
                )}
              </CardContent>
            </Card>

            {/* Leaderboard Snapshots */}
            {selectedGame && (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>{selectedPeriod} Leaderboard Snapshots</CardTitle>
                      <CardDescription>Manage snapshots for {selectedGame}</CardDescription>
                    </div>
                    <Button 
                      onClick={() => createLeaderboardSnapshot(selectedGame, selectedPeriod)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Create Snapshot
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {leaderboardSnapshots.length > 0 ? (
                    <div className="space-y-3">
                      {leaderboardSnapshots.map((snapshot, index) => (
                        <div key={index} className="flex justify-between items-center p-3 border rounded">
                          <div>
                            <p className="font-medium">
                              {new Date(snapshot.period_start).toLocaleDateString()} - {new Date(snapshot.period_end).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-gray-600">
                              {snapshot.total_entries} players, {snapshot.total_tickets} tickets
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">Top Score: {snapshot.top_score?.toLocaleString()}</p>
                            <p className="text-sm text-gray-600">
                              Created: {new Date(snapshot.snapshot_created).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No snapshots found for this game and period</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common leaderboard management tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    variant="outline" 
                    onClick={() => loadLeaderboardOverview()}
                    className="h-20 flex flex-col"
                  >
                    <span className="font-medium">Refresh Overview</span>
                    <span className="text-sm text-gray-600">Update all statistics</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    disabled={!selectedGame}
                    onClick={() => {
                      if (selectedGame) {
                        // Trigger recalculate tickets
                        fetch('/api/admin/leaderboards', {
                          method: 'POST',
                          headers: { 
                            Authorization: `Bearer ${localStorage.getItem('admin_token')}`,
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({
                            action: 'recalculate_tickets',
                            gameId: selectedGame
                          })
                        }).then(async (response) => {
                          if (response.ok) {
                            const data = await response.json()
                            alert(`Tickets recalculated: ${data.entriesUpdated} entries updated`)
                            loadLeaderboardOverview()
                          }
                        })
                      }
                    }}
                    className="h-20 flex flex-col"
                  >
                    <span className="font-medium">Recalculate Tickets</span>
                    <span className="text-sm text-gray-600">Update ticket distribution</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      // Navigate to leaderboard configuration
                      alert('Leaderboard configuration coming soon!')
                    }}
                    className="h-20 flex flex-col"
                  >
                    <span className="font-medium">Configure Rules</span>
                    <span className="text-sm text-gray-600">Edit leaderboard settings</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage user accounts and view user activity</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">User management features coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts">
            <Card>
              <CardHeader>
                <CardTitle>System Alerts</CardTitle>
                <CardDescription>Monitor system health and resolve issues</CardDescription>
              </CardHeader>
              <CardContent>
                {realtimeStats?.recent_alerts && realtimeStats.recent_alerts.length > 0 ? (
                  <div className="space-y-3">
                    {realtimeStats.recent_alerts.map((alert, index) => (
                      <Alert key={index} variant={alert.severity === 'high' ? 'destructive' : 'default'}>
                        <AlertDescription>
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{alert.title}</p>
                              <p className="text-sm text-gray-600">{alert.alert_type}</p>
                            </div>
                            <Badge variant="outline">{alert.severity}</Badge>
                          </div>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No active alerts</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
} 