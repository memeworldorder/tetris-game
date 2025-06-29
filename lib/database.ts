import type { UserData, PaymentData } from "@/types/wallet"

// Lazy initialization of database connection
let sql: any = null

async function getDbConnection() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set")
  }

  if (!sql) {
    try {
      const { neon } = await import("@neondatabase/serverless")
      sql = neon(process.env.DATABASE_URL)
    } catch (error) {
      console.error("Failed to initialize database connection:", error)
      throw new Error("Database connection failed")
    }
  }

  return sql
}

export async function createUser(walletAddress: string): Promise<UserData> {
  try {
    const db = await getDbConnection()

    const result = await db`
      INSERT INTO users (wallet_address, total_lives, last_life_lost)
      VALUES (${walletAddress}, 5, NOW())
      ON CONFLICT (wallet_address) DO NOTHING
      RETURNING *
    `

    if (result.length === 0) {
      // User already exists, fetch existing data
      return getUserByWallet(walletAddress)
    }

    return result[0] as UserData
  } catch (error) {
    console.error("Database error in createUser:", error)
    throw new Error(`Failed to create user: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export async function getUserByWallet(walletAddress: string): Promise<UserData> {
  try {
    const db = await getDbConnection()

    const result = await db`
      SELECT * FROM users WHERE wallet_address = ${walletAddress}
    `

    if (result.length === 0) {
      throw new Error("User not found")
    }

    return result[0] as UserData
  } catch (error) {
    console.error("Database error in getUserByWallet:", error)
    throw new Error(`Failed to get user: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export async function updateUserLives(walletAddress: string): Promise<UserData> {
  try {
    const db = await getDbConnection()

    // Calculate lives based on time passed (8 hours = 28800 seconds)
    const result = await db`
      UPDATE users 
      SET 
        total_lives = LEAST(5, total_lives + FLOOR(EXTRACT(EPOCH FROM (NOW() - last_life_lost)) / 28800)),
        updated_at = NOW()
      WHERE wallet_address = ${walletAddress}
      RETURNING *
    `

    if (result.length === 0) {
      throw new Error("User not found")
    }

    return result[0] as UserData
  } catch (error) {
    console.error("Database error in updateUserLives:", error)
    throw new Error(`Failed to update user lives: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export async function useLife(walletAddress: string): Promise<UserData> {
  try {
    const db = await getDbConnection()

    const result = await db`
      UPDATE users 
      SET 
        total_lives = GREATEST(0, total_lives - 1),
        last_life_lost = CASE 
          WHEN total_lives > 0 THEN NOW() 
          ELSE last_life_lost 
        END,
        updated_at = NOW()
      WHERE wallet_address = ${walletAddress} AND total_lives > 0
      RETURNING *
    `

    if (result.length === 0) {
      throw new Error("No lives available or user not found")
    }

    return result[0] as UserData
  } catch (error) {
    console.error("Database error in useLife:", error)
    throw new Error(`Failed to use life: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export async function addLives(walletAddress: string, livesToAdd: number): Promise<UserData> {
  try {
    const db = await getDbConnection()

    const result = await db`
      UPDATE users 
      SET 
        total_lives = LEAST(5, total_lives + ${livesToAdd}),
        updated_at = NOW()
      WHERE wallet_address = ${walletAddress}
      RETURNING *
    `

    if (result.length === 0) {
      throw new Error("User not found")
    }

    return result[0] as UserData
  } catch (error) {
    console.error("Database error in addLives:", error)
    throw new Error(`Failed to add lives: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export async function recordPayment(
  walletAddress: string,
  transactionHash: string,
  blockNumber: number,
  paymentType: "SOL" | "MWOR",
  amount: number,
  livesAdded: number,
): Promise<PaymentData> {
  try {
    const db = await getDbConnection()

    const amountSol = paymentType === "SOL" ? amount : null
    const amountMwor = paymentType === "MWOR" ? amount : null

    const result = await db`
      INSERT INTO payments (
        wallet_address, 
        transaction_hash, 
        block_number, 
        amount_sol, 
        amount_mwor, 
        payment_type, 
        lives_added
      )
      VALUES (
        ${walletAddress}, 
        ${transactionHash}, 
        ${blockNumber}, 
        ${amountSol}, 
        ${amountMwor}, 
        ${paymentType}, 
        ${livesAdded}
      )
      ON CONFLICT (transaction_hash) DO NOTHING
      RETURNING *
    `

    if (result.length === 0) {
      throw new Error("Payment already recorded")
    }

    return result[0] as PaymentData
  } catch (error) {
    console.error("Database error in recordPayment:", error)
    throw new Error(`Failed to record payment: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export async function getPaymentHistory(walletAddress: string): Promise<PaymentData[]> {
  try {
    const db = await getDbConnection()

    const result = await db`
      SELECT * FROM payments 
      WHERE wallet_address = ${walletAddress}
      ORDER BY created_at DESC
      LIMIT 10
    `

    return result as PaymentData[]
  } catch (error) {
    console.error("Database error in getPaymentHistory:", error)
    throw new Error(`Failed to get payment history: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export async function startGameSession(walletAddress: string): Promise<number> {
  try {
    const db = await getDbConnection()

    const result = await db`
      INSERT INTO game_sessions (wallet_address)
      VALUES (${walletAddress})
      RETURNING id
    `

    return result[0].id
  } catch (error) {
    console.error("Database error in startGameSession:", error)
    throw new Error(`Failed to start game session: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export async function endGameSession(
  sessionId: number,
  score: number,
  level: number,
  linesCleared: number,
): Promise<void> {
  try {
    const db = await getDbConnection()

    await db`
      UPDATE game_sessions 
      SET 
        score = ${score},
        level = ${level},
        lines_cleared = ${linesCleared},
        ended_at = NOW()
      WHERE id = ${sessionId}
    `
  } catch (error) {
    console.error("Database error in endGameSession:", error)
    throw new Error(`Failed to end game session: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}
