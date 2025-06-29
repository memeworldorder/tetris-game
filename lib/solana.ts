import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js"

// Solana configuration
export const SOLANA_NETWORK = "mainnet-beta" as "devnet" | "mainnet-beta" // Production mainnet configuration
export const RPC_ENDPOINT = `https://api.${SOLANA_NETWORK}.solana.com`
export const connection = new Connection(RPC_ENDPOINT, "confirmed")

// Payment configuration
export const PAYMENT_WALLET = "2RdA2Dh39dBjdt5uS8kCr93vEgDyuWro8XKnqiKAr1Ts"
export const SOL_PRICE_PER_LIFE = 0.01 // 0.01 SOL per life
export const MWOR_PRICE_PER_LIFE = 100 // 100 MWOR per life

// MWOR token configuration (you'll need to replace with actual MWOR token mint)
export const MWOR_TOKEN_MINT = "YOUR_MWOR_TOKEN_MINT_ADDRESS"

export async function createSolPayment(fromPubkey: PublicKey, amount: number): Promise<Transaction> {
  const toPubkey = new PublicKey(PAYMENT_WALLET)
  const lamports = amount * LAMPORTS_PER_SOL

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey,
      toPubkey,
      lamports,
    }),
  )

  // Get recent blockhash
  const { blockhash } = await connection.getLatestBlockhash()
  transaction.recentBlockhash = blockhash
  transaction.feePayer = fromPubkey

  return transaction
}

export async function getTransactionDetails(signature: string) {
  try {
    const transaction = await connection.getTransaction(signature, {
      commitment: "confirmed",
    })
    return transaction
  } catch (error) {
    console.error("Error fetching transaction:", error)
    return null
  }
}

export async function pollForTransaction(signature: string, maxAttempts = 30, interval = 2000): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    const transaction = await getTransactionDetails(signature)
    if (transaction) {
      return transaction
    }
    await new Promise((resolve) => setTimeout(resolve, interval))
  }
  throw new Error("Transaction not found after polling")
}
