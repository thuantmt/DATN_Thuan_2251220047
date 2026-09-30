import type { ErrorRequestHandler } from 'express';
import type { Logger } from 'pino';
import { ZodError } from 'zod';
import { AppError } from '../shared/app-error.js';

export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (error: unknown, request, response, _next) => {
    if (error instanceof ZodError) {
      response.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dữ liệu không hợp lệ.',
          details: error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })),
          requestId: request.requestId,
        },
      });
      return;
    }

    if (error instanceof AppError) {
      response.status(error.statusCode).json({
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          requestId: request.requestId,
        },
      });
      return;
    }

    logger.error({ requestId: request.requestId, code: 'UNHANDLED_ERROR' }, 'request_failed');
    response.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Máy chủ gặp lỗi ngoài dự kiến.',
        details: [],
        requestId: request.requestId,
      },
    });
  };
}
