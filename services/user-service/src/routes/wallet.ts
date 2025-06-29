import { Router, Request, Response } from 'express'
import { asyncHandler } from '../middleware/errorHandler'

const router = Router()

router.post('/verify', asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Wallet verify endpoint - to be implemented'
  })
}))

router.get('/balance/:address', asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Wallet balance endpoint - to be implemented',
    data: { address: req.params.address, balance: 0 }
  })
}))

export { router as walletRouter } 