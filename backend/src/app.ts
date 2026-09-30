import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import pino, { type Logger } from 'pino';
import type { DatabaseProbe } from './database/mongoose.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFound } from './middleware/not-found.js';
import { requestContext } from './middleware/request-context.js';
import { requestLogger } from './middleware/request-logger.js';
import { createSystemRouter } from './routes/system.js';

interface AppOptions {
  database: DatabaseProbe;
  frontendOrigin?: string;
  logger?: Logger;
}

export function createApp({
  database,
  frontendOrigin = 'http://127.0.0.1:5173',
  logger = pino({ level: 'silent' }),
}: AppOptions): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(requestContext);
  app.use(requestLogger(logger));
  app.use(helmet());
  app.use(cors({ origin: frontendOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb', strict: true }));
  app.use('/api/v1', createSystemRouter(database));
  app.use(notFound);
  app.use(errorHandler(logger));
  return app;
}
