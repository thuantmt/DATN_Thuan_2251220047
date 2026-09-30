import { Router } from 'express';
import type { DatabaseProbe } from '../database/mongoose.js';

export function createSystemRouter(database: DatabaseProbe): Router {
  const router = Router();

  router.get('/health', (request, response) => {
    response.json({
      status: 'ok',
      service: 'ielts-writing-api',
      timestamp: new Date().toISOString(),
      requestId: request.requestId,
    });
  });

  router.get('/ready', (request, response) => {
    const ready = database.isReady();
    if (!ready) {
      response.status(503).json({
        error: {
          code: 'SERVICE_NOT_READY',
          message: 'Dịch vụ chưa sẵn sàng nhận yêu cầu.',
          details: [{ service: 'mongodb', status: database.state() }],
          requestId: request.requestId,
        },
      });
      return;
    }

    response.json({
      status: 'ready',
      checks: { mongodb: 'up' },
      timestamp: new Date().toISOString(),
      requestId: request.requestId,
    });
  });

  return router;
}
