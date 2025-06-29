import { type Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js"

export interface WalletInfo {
  address: string
  shortAddress: string
  balance: string
}

// Check if the user is on a mobile device
export function isMobile(): boolean {
  if (typeof window === "undefined") return false

  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
  return mobileRegex.test(userAgent) || window.innerWidth < 768
}

// Get SOL balance for a wallet address
export async function getWalletBalance(address: string, connection: Connection): Promise<string> {
  try {
    const publicKey = new PublicKey(address)
    const balance = await connection.getBalance(publicKey)
    return (balance / LAMPORTS_PER_SOL).toFixed(4)
  } catch (error) {
    console.error("Error fetching wallet balance:", error)
    return "0.0000"
  }
}

// Format wallet address for display
export function formatWalletAddress(address: string): string {
  if (!address || address.length < 10) return address
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}

// Get wallet info object
export async function getWalletInfo(address: string, connection: Connection): Promise<WalletInfo> {
  const balance = await getWalletBalance(address, connection)
  return {
    address,
    shortAddress: formatWalletAddress(address),
    balance,
  }
}
