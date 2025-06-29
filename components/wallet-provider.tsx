"use client"

import type React from "react"

import { useMemo } from "react"
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base"
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from "@solana/wallet-adapter-react"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import { 
  PhantomWalletAdapter, 
  SolflareWalletAdapter,
  TrustWalletAdapter,
  CoinbaseWalletAdapter
} from "@solana/wallet-adapter-wallets"
import { clusterApiUrl } from "@solana/web3.js"
import { SOLANA_NETWORK, RPC_ENDPOINT } from "@/lib/solana"

// Import wallet adapter styles
import "@solana/wallet-adapter-react-ui/styles.css"

export function WalletProvider({ children }: { children: React.ReactNode }) {
  // Set network to devnet or mainnet-beta
  const network = SOLANA_NETWORK === "mainnet-beta" ? WalletAdapterNetwork.Mainnet : WalletAdapterNetwork.Devnet

  // Use custom RPC endpoint if available, otherwise use default
  const endpoint = useMemo(() => {
    // For production, use a faster RPC endpoint
    if (process.env.NEXT_PUBLIC_SOLANA_RPC) {
      return process.env.NEXT_PUBLIC_SOLANA_RPC
    }
    // For development, use our configured endpoint or fallback to cluster API
    return RPC_ENDPOINT || clusterApiUrl(network)
  }, [network])

  // Initialize comprehensive wallet adapters
  const wallets = useMemo(() => {
    const adapters = [
      // Most popular wallets first
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      
      // Additional popular wallets
      new TrustWalletAdapter(),
      new CoinbaseWalletAdapter(),
    ]

    return adapters
  }, [])

  return (
    <ConnectionProvider 
      endpoint={endpoint}
      config={{
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000,
      }}
    >
      <SolanaWalletProvider 
        wallets={wallets} 
        autoConnect={true}
        onError={(error) => {
          console.error('Wallet error:', error)
          // You could show a toast notification here
        }}
      >
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  )
}
