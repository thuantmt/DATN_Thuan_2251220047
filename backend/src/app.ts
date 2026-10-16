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
import { createAuthRouter, defaultAuthOptions, type AuthOptions } from './auth/router.js';

interface AppOptions {
  database: DatabaseProbe;
  frontendOrigin?: string;
  logger?: Logger;
  auth?: AuthOptions;
  trustProxyHops?: number;
}

export function createApp({
  database,
  frontendOrigin = 'http://127.0.0.1:5173',
  logger = pino({ level: 'silent' }),
  auth = defaultAuthOptions,
  trustProxyHops = 0,
}: AppOptions): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', trustProxyHops);
  app.use(requestContext);
  app.use(requestLogger(logger));
  app.use(helmet());
  app.use(cors({ origin: frontendOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb', strict: true }));
  app.use('/api/v1', createSystemRouter(database));
  app.use('/api/v1', createAuthRouter(database, frontendOrigin, auth));
  app.use(notFound);
  app.use(errorHandler(logger));
  return app;
}
