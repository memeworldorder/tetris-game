"use client"

import { useEffect, useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { WalletName } from "@solana/wallet-adapter-base"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { X, ExternalLink, Download, Smartphone, Wallet } from "lucide-react"

interface EnhancedWalletModalProps {
  isOpen: boolean
  onClose: () => void
}

interface WalletInfo {
  name: string
  icon: string
  installed: boolean
  downloadUrl: string
  description: string
  mobile: boolean
  popular: boolean
}

export function EnhancedWalletModal({ isOpen, onClose }: EnhancedWalletModalProps) {
  const { wallets, select, connecting, connected, disconnect } = useWallet()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleWalletSelect = async (walletName: WalletName) => {
    try {
      select(walletName)
      onClose()
    } catch (error) {
      console.error('Wallet selection error:', error)
    }
  }

  const handleDisconnect = async () => {
    try {
      await disconnect()
      onClose()
    } catch (error) {
      console.error('Wallet disconnect error:', error)
    }
  }

  // Enhanced wallet information
  const getWalletInfo = (wallet: any): WalletInfo => {
    const walletInfoMap: Record<string, Partial<WalletInfo>> = {
      'Phantom': {
        description: 'The most popular Solana wallet with great mobile and browser support',
        downloadUrl: 'https://phantom.app/',
        popular: true,
        mobile: true
      },
      'Solflare': {
        description: 'Feature-rich wallet with hardware wallet support and staking',
        downloadUrl: 'https://solflare.com/',
        popular: true,
        mobile: true
      },
      'Trust': {
        description: 'Multi-chain mobile wallet with simple interface',
        downloadUrl: 'https://trustwallet.com/',
        popular: false,
        mobile: true
      },
      'Coinbase': {
        description: 'Easy-to-use wallet from Coinbase exchange',
        downloadUrl: 'https://www.coinbase.com/wallet',
        popular: false,
        mobile: true
      }
    }

    const info = walletInfoMap[wallet.adapter.name] || {}
    
    return {
      name: wallet.adapter.name,
      icon: wallet.adapter.icon,
      installed: wallet.readyState === 'Installed',
      downloadUrl: info.downloadUrl || 'https://solana.com/ecosystem/explore?categories=wallet',
      description: info.description || 'Solana-compatible wallet',
      mobile: info.mobile || false,
      popular: info.popular || false
    }
  }

  if (!mounted) return null

  const walletInfos = wallets.map(getWalletInfo)
  const installedWallets = walletInfos.filter(w => w.installed)
  const notInstalledWallets = walletInfos.filter(w => !w.installed)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-purple-500/30 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Wallet className="h-6 w-6 text-purple-400" />
            {connected ? 'Wallet Connected' : 'Connect Your Wallet'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {connected ? (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center w-16 h-16 mx-auto bg-green-500/20 rounded-full">
                <Wallet className="h-8 w-8 text-green-400" />
              </div>
              <p className="text-green-400">Wallet successfully connected!</p>
              <Button
                onClick={handleDisconnect}
                variant="outline"
                className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10"
              >
                Disconnect Wallet
              </Button>
            </div>
          ) : (
            <>
              {/* Connecting state */}
              {connecting && (
                <div className="text-center py-4">
                  <div className="animate-spin w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-purple-400">Connecting...</p>
                </div>
              )}

              {/* Installed wallets */}
              {installedWallets.length > 0 && !connecting && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                    Installed Wallets
                  </h3>
                  {installedWallets.map((wallet) => (
                    <WalletOption
                      key={wallet.name}
                      wallet={wallet}
                      onSelect={() => handleWalletSelect(wallet.name as WalletName)}
                      installed={true}
                    />
                  ))}
                </div>
              )}

              {/* Not installed wallets */}
              {notInstalledWallets.length > 0 && !connecting && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                    Available Wallets
                  </h3>
                  {notInstalledWallets.map((wallet) => (
                    <WalletOption
                      key={wallet.name}
                      wallet={wallet}
                      onSelect={() => window.open(wallet.downloadUrl, '_blank')}
                      installed={false}
                    />
                  ))}
                </div>
              )}

              {/* Help text */}
              <div className="text-xs text-gray-400 space-y-2 pt-4 border-t border-gray-700">
                <p>💡 <strong>New to Solana?</strong> We recommend starting with Phantom wallet</p>
                <p>📱 All wallets work on both desktop and mobile</p>
                <p>🔒 Your wallet keys never leave your device</p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface WalletOptionProps {
  wallet: WalletInfo
  onSelect: () => void
  installed: boolean
}

function WalletOption({ wallet, onSelect, installed }: WalletOptionProps) {
  return (
    <button
      onClick={onSelect}
      className="w-full p-3 rounded-lg border border-gray-700 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all duration-200 text-left group"
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <img 
            src={wallet.icon} 
            alt={wallet.name}
            className="w-8 h-8 rounded-lg"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
          {wallet.popular && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center">
              <span className="text-xs">⭐</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-white">{wallet.name}</h4>
            {wallet.mobile && <Smartphone className="h-3 w-3 text-gray-400" />}
            {installed && <span className="w-2 h-2 bg-green-400 rounded-full"></span>}
          </div>
          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{wallet.description}</p>
        </div>

        <div className="flex items-center gap-2">
          {installed ? (
            <div className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
              Connect
            </div>
          ) : (
            <div className="flex items-center gap-1 text-purple-400 group-hover:text-purple-300">
              <Download className="h-4 w-4" />
              <span className="text-xs">Install</span>
            </div>
          )}
          <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-purple-400" />
        </div>
      </div>
    </button>
  )
} 