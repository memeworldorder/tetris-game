import { Request, Response, NextFunction } from 'express'

export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Admin Dashboard Error:', err)

  if (err.code === 'ECONNREFUSED') {
    return res.status(503).json({
      error: 'Service temporarily unavailable',
      message: 'Database connection failed'
    })
  }

  const status = err.status || 500
  const message = err.message || 'Internal server error'

  res.status(status).json({
    error: message,
    service: 'admin-dashboard',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
} 