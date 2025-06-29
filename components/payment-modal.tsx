"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { X, Loader2 } from "lucide-react"
import { useWallet } from "@solana/wallet-adapter-react"
import { createSolPayment, SOL_PRICE_PER_LIFE, MWOR_PRICE_PER_LIFE } from "@/lib/solana"
import { PublicKey } from "@solana/web3.js"

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onPaymentSuccess: () => void
}

export default function PaymentModal({ isOpen, onClose, onPaymentSuccess }: PaymentModalProps) {
  const { connected, publicKey, signTransaction } = useWallet()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSolPayment = async () => {
    if (!connected || !publicKey) {
      setError("Please connect your wallet first")
      return
    }

    setProcessing(true)
    setError(null)

    try {
      // Create transaction
      const transaction = await createSolPayment(new PublicKey(publicKey.toString()), SOL_PRICE_PER_LIFE)

      // Sign transaction
      const signedTransaction = await signTransaction(transaction)

      // Send transaction
      const response = await fetch("/api/payments/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
          paymentType: "SOL",
          signedTransaction: signedTransaction.serialize().toString("base64"),
        }),
      })

      const result = await response.json()

      if (result.success) {
        onPaymentSuccess()
        onClose()
      } else {
        setError(result.error || "Payment failed")
      }
    } catch (err) {
      console.error("Payment error:", err)
      setError("Payment failed. Please try again.")
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900/95 rounded-xl border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.3)] w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-purple-500/20">
          <h3 className="text-xl font-bold text-amber-400">Buy Lives</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-800 transition-colors" aria-label="Close">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            <div className="bg-gray-800/50 p-4 rounded-lg border border-purple-500/20">
              <h4 className="text-lg font-semibold text-white mb-2">Refill Lives</h4>
              <p className="text-gray-300 text-sm mb-4">
                Get instant lives to continue playing. Your lives will be refilled to maximum (5 lives).
              </p>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                  <div>
                    <p className="text-white font-medium">Pay with SOL</p>
                    <p className="text-gray-400 text-sm">{SOL_PRICE_PER_LIFE} SOL</p>
                  </div>
                  <Button
                    onClick={handleSolPayment}
                    disabled={processing || !connected}
                    className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Pay with SOL"
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg opacity-50">
                  <div>
                    <p className="text-white font-medium">Pay with MWOR</p>
                    <p className="text-gray-400 text-sm">{MWOR_PRICE_PER_LIFE} MWOR</p>
                  </div>
                  <Button disabled className="bg-gray-600">
                    Coming Soon
                  </Button>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-500/30 p-3 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="bg-gray-800/30 p-3 rounded-lg">
              <p className="text-gray-400 text-xs">
                • Lives regenerate automatically (1 life every 8 hours)
                <br />• Maximum 5 lives at any time
                <br />• 75% of payments go to rewards pool, 25% burned
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
