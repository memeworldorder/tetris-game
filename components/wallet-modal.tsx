"use client"

import { useState, useEffect, useCallback } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Wallet, LogOut, ExternalLink, AlertCircle, CheckCircle, Smartphone, Loader2 } from "lucide-react"
import type { WalletInfo } from "@/lib/wallet-connect"
import { isMobile } from "@/lib/wallet-connect"

interface WalletModalProps {
  isOpen: boolean
  onClose: () => void
  walletInfo: WalletInfo | null
  onWalletInfoUpdate: (info: WalletInfo | null) => void
  isLoadingWallet?: boolean
}

export function WalletModal({ isOpen, onClose, walletInfo, onWalletInfoUpdate, isLoadingWallet }: WalletModalProps) {
  const { publicKey, connected, disconnect, connecting, disconnecting, wallet, select, wallets } = useWallet()
  const [error, setError] = useState<string | null>(null)
  const [isMobileDevice, setIsMobileDevice] = useState(false)
  const [localLoading, setLocalLoading] = useState(false)
  const [showWalletList, setShowWalletList] = useState(false)

  // Check if we're on mobile
  useEffect(() => {
    setIsMobileDevice(isMobile())
  }, [])

  // Handle wallet selection
  const handleWalletSelect = useCallback(
    async (walletName: string) => {
      try {
        setLocalLoading(true)
        setError(null)

        const selectedWallet = wallets.find((w) => w.adapter.name === walletName)
        if (selectedWallet) {
          await select(selectedWallet.adapter.name)
          setShowWalletList(false)
        }
      } catch (err) {
        console.error("Failed to select wallet:", err)
        setError(`Failed to select ${walletName}. Please try again.`)
      } finally {
        setLocalLoading(false)
      }
    },
    [wallets, select],
  )

  // Handle wallet connection for mobile
  const handleWalletConnect = useCallback(() => {
    // Show wallet selection for both mobile and desktop
    setShowWalletList(true)
  }, [])

  // Handle disconnect
  const handleDisconnect = useCallback(async () => {
    try {
      setLocalLoading(true)
      await disconnect()
      onWalletInfoUpdate(null)
      setError(null)
    } catch (err) {
      console.error("Error disconnecting wallet:", err)
      setError("Failed to disconnect wallet")
    } finally {
      setLocalLoading(false)
    }
  }, [disconnect, onWalletInfoUpdate])

  // Clear error when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setError(null)
      setShowWalletList(false)
    }
  }, [isOpen])

  // Format balance to 4 decimal places
  const formatBalance = (balance: string) => {
    return Number.parseFloat(balance).toFixed(4)
  }

  // Get Solana explorer URL
  const getExplorerUrl = (address: string) => {
    return `https://explorer.solana.com/address/${address}`
  }

  // Determine if we're in a loading state
  const isLoading = isLoadingWallet || localLoading || connecting || disconnecting

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-black border-purple-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
            {isMobileDevice ? (
              <Smartphone className="h-6 w-6 text-amber-400" />
            ) : (
              <Wallet className="h-6 w-6 text-amber-400" />
            )}
            <span className="text-amber-400 font-extrabold">Solana Wallet</span>
          </DialogTitle>
          <DialogDescription className="text-center text-purple-300">
            {walletInfo ? "Your wallet is connected" : "Connect your Solana wallet to play and earn"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Loading State */}
          {isLoading && (
            <div className="p-3 rounded-lg bg-blue-900/20 border border-blue-800/50 text-blue-300 flex items-center gap-2">
              <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin" />
              <p className="text-sm">
                {connecting && "Connecting to wallet..."}
                {disconnecting && "Disconnecting wallet..."}
                {localLoading && "Processing wallet action..."}
                {isLoadingWallet && !connecting && !disconnecting && !localLoading && "Loading wallet information..."}
              </p>
            </div>
          )}

          {/* Connection Status Messages */}
          {error && !isLoading && (
            <div className="p-3 rounded-lg bg-amber-900/20 border border-amber-800/50 text-amber-300 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Connection Warning</p>
                <p className="text-xs">{error}</p>
              </div>
            </div>
          )}

          {walletInfo && !isLoading && (
            <div className="p-3 rounded-lg bg-green-900/20 border border-green-800/50 text-green-300 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">Wallet connected successfully!</p>
            </div>
          )}

          {walletInfo && !isLoading ? (
            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-purple-900/20 border border-purple-800/50">
                <div className="flex flex-col space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-purple-300">Wallet:</span>
                    <span className="text-sm text-white">{wallet?.adapter.name || "Unknown"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-purple-300">Address:</span>
                    <span className="text-sm font-mono text-white">{walletInfo.shortAddress}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-purple-300">SOL Balance:</span>
                    <span className="text-sm font-mono text-white">
                      {formatBalance(walletInfo.balance)} SOL
                      {walletInfo.balance === "0.0000" && (
                        <span className="text-xs text-amber-400 ml-1">(Unable to fetch)</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-purple-300">Network:</span>
                    <span className="text-sm text-white">Solana Mainnet</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between gap-2">
                <Button
                  onClick={() => window.open(getExplorerUrl(walletInfo.address), "_blank")}
                  variant="outline"
                  className="flex-1 bg-transparent border-blue-700 text-blue-300 hover:bg-blue-900/30 hover:text-blue-200"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Explorer
                </Button>
                <Button
                  onClick={handleDisconnect}
                  variant="outline"
                  disabled={localLoading || disconnecting}
                  className="flex-1 bg-transparent border-red-700 text-red-300 hover:bg-red-900/30 hover:text-red-200"
                >
                  {localLoading || disconnecting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="mr-2 h-4 w-4" />
                  )}
                  {localLoading || disconnecting ? "Disconnecting..." : "Disconnect"}
                </Button>
              </div>
            </div>
          ) : !isLoading ? (
            <div className="space-y-4">
              <p className="text-sm text-purple-300 text-center">
                Connect your Solana wallet to track progress, submit scores, and purchase game items with SOL.
              </p>

              {/* Wallet Selection */}
              {showWalletList ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-white">Choose a wallet:</h3>
                    <Button
                      onClick={() => setShowWalletList(false)}
                      variant="ghost"
                      size="sm"
                      className="text-purple-300 hover:text-white"
                    >
                      Back
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {wallets.map((wallet) => (
                      <Button
                        key={wallet.adapter.name}
                        onClick={() => handleWalletSelect(wallet.adapter.name)}
                        disabled={connecting || localLoading}
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                      >
                        {wallet.adapter.icon && (
                          <img
                            src={wallet.adapter.icon || "/placeholder.svg"}
                            alt={wallet.adapter.name}
                            className="w-5 h-5"
                          />
                        )}
                        {wallet.adapter.name}
                        {(connecting || localLoading) && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <Button
                    onClick={handleWalletConnect}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
                    disabled={connecting || localLoading}
                  >
                    {connecting || localLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        {isMobileDevice ? <Smartphone className="mr-2 h-4 w-4" /> : <Wallet className="mr-2 h-4 w-4" />}
                        Connect Wallet
                      </>
                    )}
                  </Button>

                  {/* Fallback to standard wallet adapter button */}
                  <div className="text-center">
                    <p className="text-xs text-purple-400 mb-2">Or use the standard wallet selector:</p>
                    <div className="flex justify-center">
                      <WalletMultiButton className="wallet-adapter-button-custom" />
                    </div>
                  </div>
                </div>
              )}

              <div className="text-center space-y-1">
                <p className="text-xs text-purple-300">🔗 Real Solana blockchain connection</p>
                <p className="text-xs text-purple-400">Transactions are processed on Solana Mainnet</p>
                <p className="text-xs text-purple-400">Real SOL required for purchases</p>
                {isMobileDevice && (
                  <>
                    <p className="text-xs text-blue-400">✨ Optimized for mobile wallet apps</p>
                    <p className="text-xs text-green-400">📱 Tap "Connect Wallet" to get started</p>
                  </>
                )}
                <p className="text-xs text-amber-400">⚠️ Balance display may be limited due to RPC restrictions</p>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full bg-transparent border-purple-700 text-purple-300 hover:bg-purple-900/30 hover:text-purple-200"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
