// Wallet Detection and Installation Helper
// Provides real-time detection of installed wallets and installation guidance

export interface WalletDetectionResult {
  name: string
  detected: boolean
  installed: boolean
  downloadUrl: string
  icon: string
  description: string
  mobile: boolean
  recommended: boolean
  installInstructions: string[]
}

export interface PlatformInfo {
  isMobile: boolean
  isIOS: boolean
  isAndroid: boolean
  isBrowser: boolean
  browserName: string
}

export function detectPlatform(): PlatformInfo {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isIOS: false,
      isAndroid: false,
      isBrowser: false,
      browserName: 'unknown'
    }
  }

  const userAgent = window.navigator.userAgent.toLowerCase()
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
  const isIOS = /iphone|ipad|ipod/i.test(userAgent)
  const isAndroid = /android/i.test(userAgent)
  
  let browserName = 'unknown'
  if (userAgent.includes('chrome')) browserName = 'chrome'
  else if (userAgent.includes('firefox')) browserName = 'firefox'
  else if (userAgent.includes('safari')) browserName = 'safari'
  else if (userAgent.includes('edge')) browserName = 'edge'

  return {
    isMobile,
    isIOS,
    isAndroid,
    isBrowser: !isMobile,
    browserName
  }
}

export function detectWallets(): WalletDetectionResult[] {
  const platform = detectPlatform()
  
  const wallets: WalletDetectionResult[] = [
    {
      name: 'Phantom',
      detected: typeof window !== 'undefined' && 'phantom' in window && !!window.phantom?.solana,
      installed: typeof window !== 'undefined' && 'phantom' in window && !!window.phantom?.solana?.isPhantom,
      downloadUrl: platform.isMobile 
        ? (platform.isIOS 
          ? 'https://apps.apple.com/app/phantom-solana-wallet/id1598432977'
          : 'https://play.google.com/store/apps/details?id=app.phantom')
        : 'https://phantom.app/',
      icon: 'https://phantom.app/img/phantom-icon.svg',
      description: 'The most popular Solana wallet with excellent mobile and browser support',
      mobile: true,
      recommended: true,
      installInstructions: platform.isMobile ? [
        'Download Phantom from your app store',
        'Create a new wallet or import existing',
        'Return to this page and tap "Connect Wallet"'
      ] : [
        'Visit phantom.app and install the browser extension',
        'Create a new wallet or import existing seed phrase',
        'Refresh this page and click "Connect Wallet"'
      ]
    },
    {
      name: 'Solflare',
      detected: typeof window !== 'undefined' && 'solflare' in window,
      installed: typeof window !== 'undefined' && 'solflare' in window && !!window.solflare?.isSolflare,
      downloadUrl: platform.isMobile
        ? (platform.isIOS
          ? 'https://apps.apple.com/app/solflare/id1580902717'
          : 'https://play.google.com/store/apps/details?id=com.solflare.mobile')
        : 'https://solflare.com/',
      icon: 'https://solflare.com/assets/logo.svg',
      description: 'Feature-rich wallet with hardware wallet support and built-in staking',
      mobile: true,
      recommended: true,
      installInstructions: platform.isMobile ? [
        'Download Solflare from your app store',
        'Set up your wallet with seed phrase',
        'Return to this page and tap "Connect Wallet"'
      ] : [
        'Visit solflare.com and install the browser extension',
        'Create or import your wallet',
        'Refresh this page and click "Connect Wallet"'
      ]
    },
    {
      name: 'Trust Wallet',
      detected: typeof window !== 'undefined' && 'trustwallet' in window,
      installed: typeof window !== 'undefined' && 'trustwallet' in window && !!window.trustwallet?.solana,
      downloadUrl: platform.isMobile
        ? (platform.isIOS
          ? 'https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409'
          : 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp')
        : 'https://trustwallet.com/',
      icon: 'https://trustwallet.com/assets/images/media/assets/TWT.png',
      description: 'Multi-chain mobile wallet with simple interface',
      mobile: true,
      recommended: false,
      installInstructions: platform.isMobile ? [
        'Download Trust Wallet from your app store',
        'Create wallet and enable Solana',
        'Return to this page and tap "Connect Wallet"'
      ] : [
        'Trust Wallet primarily works on mobile',
        'Download the mobile app instead',
        'Use Phantom or Solflare for desktop'
      ]
    },
    {
      name: 'Coinbase Wallet',
      detected: typeof window !== 'undefined' && 'coinbaseWallet' in window,
      installed: typeof window !== 'undefined' && 'coinbaseWallet' in window,
      downloadUrl: platform.isMobile
        ? (platform.isIOS
          ? 'https://apps.apple.com/app/coinbase-wallet-nfts-crypto/id1278383455'
          : 'https://play.google.com/store/apps/details?id=org.toshi')
        : 'https://www.coinbase.com/wallet',
      icon: 'https://wallet.coinbase.com/img/favicon.ico',
      description: 'Easy-to-use wallet from Coinbase exchange',
      mobile: true,
      recommended: false,
      installInstructions: platform.isMobile ? [
        'Download Coinbase Wallet from your app store',
        'Set up your wallet (separate from Coinbase exchange)',
        'Return to this page and tap "Connect Wallet"'
      ] : [
        'Visit coinbase.com/wallet for the browser extension',
        'Create your Coinbase Wallet account',
        'Refresh this page and click "Connect Wallet"'
      ]
    }
  ]

  return wallets
}

export function getRecommendedWallet(platform: PlatformInfo): WalletDetectionResult {
  const wallets = detectWallets()
  
  // First try to find an installed recommended wallet
  const installedRecommended = wallets.find(w => w.installed && w.recommended)
  if (installedRecommended) return installedRecommended

  // Otherwise return the most recommended for the platform
  if (platform.isMobile) {
    return wallets.find(w => w.name === 'Phantom') || wallets[0]
  } else {
    return wallets.find(w => w.name === 'Phantom') || wallets[0]
  }
}

export function getWalletInstallationGuide(walletName: string): string[] {
  const wallet = detectWallets().find(w => w.name === walletName)
  return wallet?.installInstructions || [
    'Visit the wallet\'s official website',
    'Download and install the wallet',
    'Create or import your wallet',
    'Return to this page and connect'
  ]
}

export function checkWalletAvailability(): {
  hasAnyWallet: boolean
  installedWallets: string[]
  availableWallets: string[]
  needsInstallation: boolean
} {
  const wallets = detectWallets()
  const installedWallets = wallets.filter(w => w.installed).map(w => w.name)
  const availableWallets = wallets.map(w => w.name)
  
  return {
    hasAnyWallet: installedWallets.length > 0,
    installedWallets,
    availableWallets,
    needsInstallation: installedWallets.length === 0
  }
}

// Utility to format wallet connection status messages
export function getConnectionMessage(platform: PlatformInfo, hasWallets: boolean): string {
  if (hasWallets) {
    return "Ready to connect! Choose your wallet below."
  }
  
  if (platform.isMobile) {
    return "Install a Solana wallet app to get started. We recommend Phantom for the best experience."
  } else {
    return "Install a Solana wallet extension to get started. Phantom is the most popular choice."
  }
}

// Enhanced type declarations for wallet detection
declare global {
  interface Window {
    phantom?: {
      solana?: {
        isPhantom?: boolean
        connect?: () => Promise<any>
        disconnect?: () => Promise<void>
      }
    }
    solflare?: {
      isSolflare?: boolean
      connect?: () => Promise<any>
      disconnect?: () => Promise<void>
    }
    trustwallet?: {
      solana?: {
        connect?: () => Promise<any>
        disconnect?: () => Promise<void>
      }
    }
    coinbaseWallet?: {
      connect?: () => Promise<any>
      disconnect?: () => Promise<void>
    }
  }
} 