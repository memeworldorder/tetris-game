import { type NextRequest, NextResponse } from "next/server"
import { Transaction } from "@solana/web3.js"
import { connection, PAYMENT_WALLET, SOL_PRICE_PER_LIFE, pollForTransaction } from "@/lib/solana"
import { recordPayment, addLives, getUserByWallet, createUser } from "@/lib/database"
import { getGameConfig, trackAnalyticsEvent } from "@/lib/enhanced-database"

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, paymentType, signedTransaction, gameId = 'tetris' } = await request.json()

    if (!walletAddress || !paymentType || !signedTransaction) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get game configuration
    const gameConfig = await getGameConfig(gameId)

    // Deserialize and send transaction
    const transaction = Transaction.from(Buffer.from(signedTransaction, "base64"))
    const signature = await connection.sendRawTransaction(transaction.serialize())

    // Poll for transaction confirmation
    const confirmedTransaction = await pollForTransaction(signature)

    if (!confirmedTransaction) {
      return NextResponse.json({ error: "Transaction not confirmed" }, { status: 400 })
    }

    // Verify transaction details
    const { meta, transaction: txData, blockTime, slot } = confirmedTransaction

    if (meta?.err) {
      return NextResponse.json({ error: "Transaction failed" }, { status: 400 })
    }

    // Verify payment amount and recipient
    let amountPaid = 0
    let livesToAdd = 0

    if (paymentType === "SOL") {
      // Check SOL transfer
      const preBalances = meta?.preBalances || []
      const postBalances = meta?.postBalances || []
      const accountKeys = txData?.message?.accountKeys || []

      const paymentWalletIndex = accountKeys.findIndex((key: any) => key.toString() === PAYMENT_WALLET)

      if (paymentWalletIndex === -1) {
        return NextResponse.json({ error: "Invalid payment recipient" }, { status: 400 })
      }

      const balanceChange = (postBalances[paymentWalletIndex] || 0) - (preBalances[paymentWalletIndex] || 0)
      amountPaid = balanceChange / 1e9 // Convert lamports to SOL

      if (amountPaid < SOL_PRICE_PER_LIFE) {
        return NextResponse.json({ error: "Insufficient payment amount" }, { status: 400 })
      }

      livesToAdd = Math.floor(amountPaid / SOL_PRICE_PER_LIFE)
    }

    // Ensure user exists
    try {
      await getUserByWallet(walletAddress)
    } catch {
      await createUser(walletAddress)
    }

    // Record payment in database
    await recordPayment(walletAddress, signature, slot, paymentType, amountPaid, livesToAdd)

    // Add lives to user account
    const updatedUser = await addLives(walletAddress, livesToAdd)

    // Track payment analytics
    await trackAnalyticsEvent({
      game_id: gameId,
      wallet_address: walletAddress,
      event_type: 'lives_purchased',
      event_data: {
        payment_type: paymentType,
        amount_paid: amountPaid,
        lives_added: livesToAdd,
        transaction_hash: signature
      }
    })

    return NextResponse.json({
      success: true,
      gameId,
      transactionHash: signature,
      livesAdded: livesToAdd,
      totalLives: updatedUser.totalLives,
      gameConfig: gameConfig ? {
        name: gameConfig.name,
        payment_enabled: gameConfig.payment_config?.enabled !== false
      } : null
    })
  } catch (error) {
    console.error("Payment processing error:", error)
    return NextResponse.json({ error: "Payment processing failed" }, { status: 500 })
  }
}
