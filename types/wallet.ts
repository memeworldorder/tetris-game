export interface WalletContextType {
  wallet: any
  connected: boolean
  connecting: boolean
  publicKey: string | null
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  signTransaction: (transaction: any) => Promise<any>
}

export interface UserData {
  walletAddress: string
  totalLives: number
  lastLifeLost: string
  createdAt: string
  updatedAt: string
}

export interface PaymentData {
  id: number
  walletAddress: string
  transactionHash: string
  blockNumber: number
  amountSol?: number
  amountMwor?: number
  paymentType: "SOL" | "MWOR"
  livesAdded: number
  createdAt: string
}

export interface PaymentRequest {
  walletAddress: string
  paymentType: "SOL" | "MWOR"
  amount: number
}
