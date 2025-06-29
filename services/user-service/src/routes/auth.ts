import { Router, Request, Response } from 'express'
import { asyncHandler } from '../middleware/errorHandler'
import { db } from '../config/database'
import { publishEvent } from '../config/rabbitmq'
import { verifySignature, generateJWT } from '../utils/crypto-utils'

const router = Router()

interface LoginRequest {
  wallet: string
  signature: string
  message: string
  timestamp: number
}

interface RegisterRequest {
  wallet: string
  username?: string
  email?: string
}

router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const { wallet, signature, message, timestamp }: LoginRequest = req.body

  if (!wallet || !signature || !message) {
    return res.status(400).json({
      error: 'Missing required fields: wallet, signature, message'
    })
  }

  // Verify the timestamp is recent (within 5 minutes)
  const now = Date.now()
  if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
    return res.status(400).json({
      error: 'Message timestamp too old'
    })
  }

  // Verify the signature
  try {
    const isValidSignature = verifySignature(message, signature, wallet)
    if (!isValidSignature) {
      return res.status(401).json({
        error: 'Invalid signature'
      })
    }
  } catch (error) {
    return res.status(400).json({
      error: 'Signature verification failed'
    })
  }

  const client = await db.connect()
  try {
    // Check if user exists
    let userResult = await client.query(
      'SELECT * FROM users WHERE wallet_address = $1',
      [wallet]
    )

    let user = userResult.rows[0]

    if (!user) {
      // Create new user
      const insertResult = await client.query(
        `INSERT INTO users (wallet_address, created_at, last_login)
         VALUES ($1, NOW(), NOW())
         RETURNING *`,
        [wallet]
      )
      user = insertResult.rows[0]
    } else {
      // Update last login
      await client.query(
        'UPDATE users SET last_login = NOW() WHERE wallet_address = $1',
        [wallet]
      )
    }

    // Generate JWT token
    const token = generateJWT({
      userId: user.id,
      wallet: wallet,
      username: user.username
    })

    // Publish login event
    await publishEvent('user.logged_in', {
      userId: user.id,
      wallet,
      username: user.username,
      isNewUser: !userResult.rows.length
    })

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        wallet: user.wallet_address,
        username: user.username,
        createdAt: user.created_at,
        lastLogin: user.last_login
      }
    })

  } finally {
    client.release()
  }
}))

router.post('/register', asyncHandler(async (req: Request, res: Response) => {
  const { wallet, username, email }: RegisterRequest = req.body

  if (!wallet) {
    return res.status(400).json({
      error: 'Wallet address required'
    })
  }

  const client = await db.connect()
  try {
    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [wallet]
    )

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: 'User already exists'
      })
    }

    // Check if username is taken (if provided)
    if (username) {
      const existingUsername = await client.query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      )

      if (existingUsername.rows.length > 0) {
        return res.status(409).json({
          error: 'Username already taken'
        })
      }
    }

    // Create new user
    const newUser = await client.query(
      `INSERT INTO users (wallet_address, username, email, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [wallet, username || null, email || null]
    )

    const user = newUser.rows[0]

    // Publish registration event
    await publishEvent('user.registered', {
      userId: user.id,
      wallet,
      username: user.username,
      email: user.email
    })

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user.id,
        wallet: user.wallet_address,
        username: user.username,
        email: user.email,
        createdAt: user.created_at
      }
    })

  } finally {
    client.release()
  }
}))

router.get('/status', asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({
      authenticated: false
    })
  }

  try {
    const token = authHeader.substring(7)
    // TODO: Implement JWT verification
    // For now, just return a basic response
    res.json({
      authenticated: true,
      message: 'Token verification not yet implemented'
    })
  } catch (error) {
    res.json({
      authenticated: false,
      error: 'Invalid token'
    })
  }
}))

export { router as authRouter } 