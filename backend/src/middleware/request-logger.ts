import type { RequestHandler } from 'express';
import type { Logger } from 'pino';

export function requestLogger(logger: Logger): RequestHandler {
  return (request, response, next) => {
    const startedAt = performance.now();
    response.once('finish', () => {
      logger.info({
        requestId: request.requestId,
        method: request.method,
        path: request.path,
        statusCode: response.statusCode,
        durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
      }, 'request_completed');
    });
    next();
  };
}
