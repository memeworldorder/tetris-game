import { Router, Request, Response } from 'express'
import { asyncHandler } from '../middleware/errorHandler'

const router = Router()

router.get('/:userId', asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Profile get endpoint - to be implemented',
    data: { userId: req.params.userId }
  })
}))

router.put('/:userId', asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Profile update endpoint - to be implemented'
  })
}))

export { router as profileRouter } 