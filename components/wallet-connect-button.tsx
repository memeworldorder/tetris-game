"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Wallet, ExternalLink } from "lucide-react"
import { useWallet } from "@solana/wallet-adapter-react"
import { EnhancedWalletModal } from "./enhanced-wallet-modal"
import { connection } from "@/lib/solana"

interface WalletInfo {
  shortAddress: string
  balance: number
  solBalance: number
}

export default function WalletConnectButton() {
  const { publicKey, connected, wallet, disconnect } = useWallet()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Update wallet info when connection status changes
  useEffect(() => {
    const updateWalletInfo = async () => {
      if (connected && publicKey) {
        setIsLoading(true)
        try {
          const balance = await connection.getBalance(publicKey)
          const solBalance = balance / 1000000000 // Convert lamports to SOL
          
          setWalletInfo({
            shortAddress: `${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}`,
            balance,
            solBalance: Math.round(solBalance * 1000) / 1000 // Round to 3 decimals
          })
        } catch (error) {
          console.error("Error fetching wallet info:", error)
          setWalletInfo({
            shortAddress: `${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}`,
            balance: 0,
            solBalance: 0
          })
        } finally {
          setIsLoading(false)
        }
      } else {
        setWalletInfo(null)
      }
    }

    updateWalletInfo()
  }, [connected, publicKey])

  const handleOpenModal = () => {
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const handleDisconnect = async () => {
    try {
      await disconnect()
      setWalletInfo(null)
    } catch (error) {
      console.error("Disconnect error:", error)
    }
  }

  const openInExplorer = () => {
    if (publicKey) {
      const network = process.env.NODE_ENV === 'production' ? '' : '?cluster=devnet'
      window.open(`https://explorer.solana.com/address/${publicKey.toString()}${network}`, '_blank')
    }
  }

  if (connected && walletInfo) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 bg-gray-800/50 px-3 py-2 rounded-lg border border-green-500/30">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <div className="text-sm">
            <div className="text-green-400 font-medium">{walletInfo.shortAddress}</div>
            <div className="text-gray-400 text-xs">{walletInfo.solBalance} SOL</div>
          </div>
        </div>
        
        <Button
          onClick={openInExplorer}
          variant="outline"
          size="sm"
          className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
        >
          <ExternalLink className="h-3 w-3" />
        </Button>
        
        <Button
          onClick={handleOpenModal}
          variant="outline"
          size="sm"
          className="border-gray-500/30 text-gray-400 hover:bg-gray-500/10"
        >
          <Wallet className="h-3 w-3" />
        </Button>
        
        <EnhancedWalletModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        onClick={handleOpenModal}
        className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white"
        disabled={isLoading}
      >
        <Wallet className="h-4 w-4 mr-2" />
        {isLoading ? "Connecting..." : "Connect Wallet"}
      </Button>
      <EnhancedWalletModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  )
}
