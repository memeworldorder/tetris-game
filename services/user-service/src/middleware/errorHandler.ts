import { Request, Response, NextFunction } from 'express'
import { logger } from '../config/logger'

export interface AppError extends Error {
  statusCode?: number
  isOperational?: boolean
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = err.statusCode || 500
  const message = err.message || 'Internal Server Error'

  // Log the error
  logger.error({
    error: err.message,
    stack: err.stack,
    statusCode,
    path: req.path,
    method: req.method,
    requestId: req.id,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  })

  // Don't leak error details in production
  const isProduction = process.env.NODE_ENV === 'production'
  const responseMessage = isProduction && statusCode === 500 ? 'Internal Server Error' : message

  res.status(statusCode).json({
    success: false,
    error: responseMessage,
    requestId: req.id,
    timestamp: new Date().toISOString(),
    ...((!isProduction || statusCode !== 500) && { stack: err.stack }),
  })
}

export const createError = (message: string, statusCode: number = 500): AppError => {
  const error = new Error(message) as AppError
  error.statusCode = statusCode
  error.isOperational = true
  return error
}

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
} 