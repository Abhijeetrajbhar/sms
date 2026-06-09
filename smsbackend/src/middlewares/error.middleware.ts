import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';

// Handle specific Prisma errors
function handlePrismaError(error: {
  code?: string;
  message: string;
  meta?: { target?: string[] };
}): AppError {
  switch (error.code) {
    case 'P2002':
      // Unique constraint violation
      const field = error.meta?.target?.join(', ') || 'field';
      return AppError.conflict(`A record with this ${field} already exists`);

    case 'P2025':
      // Record not found
      return AppError.notFound('Record not found');

    case 'P2003':
      // Foreign key constraint failure
      return AppError.badRequest('Related record not found');

    case 'P2014':
      // Required relation violation
      return AppError.badRequest('Required relation not found');

    default:
      return AppError.internal('Database operation failed');
  }
}

export function errorMiddleware(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  let appError: AppError;

  // Prisma errors
  if (error.constructor.name === 'PrismaClientKnownRequestError') {
    appError = handlePrismaError(
      error as unknown as { code?: string; message: string; meta?: { target?: string[] } }
    );
  } else if (error.constructor.name === 'PrismaClientValidationError') {
    appError = AppError.badRequest('Invalid identifier or request data');
  } else if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof SyntaxError && 'body' in error) {
    appError = AppError.badRequest('Invalid JSON request body');
  } else if (error.name === 'JsonWebTokenError') {
    appError = AppError.unauthorized('Invalid token');
  } else if (error.name === 'TokenExpiredError') {
    appError = AppError.unauthorized('Token expired');
  } else if (error.name === 'MulterError') {
    appError = AppError.badRequest(`File upload error: ${error.message}`);
  } else {
    appError = AppError.internal();
    // Log unexpected errors
    logger.error('Unexpected error:', {
      message: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
    });
  }

  // Log operational errors in development
  if (process.env.NODE_ENV === 'development') {
    logger.error(`[${req.method}] ${req.url}`, {
      statusCode: appError.statusCode,
      message: appError.message,
    });
  }

  res.status(appError.statusCode).json({
    success: false,
    message: appError.message,
    data: null,
    error: appError.errors ?? { message: appError.message },
    ...(appError.errors !== undefined && { errors: appError.errors }),
    ...(process.env.NODE_ENV === 'development' && {
      stack: appError.stack,
    }),
  });
}

export function notFoundMiddleware(req: Request, _res: Response, next: NextFunction): void {
  next(AppError.notFound(`Route ${req.originalUrl} not found`));
}
