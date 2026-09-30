import type { Server } from 'node:http';
import { createApp } from './app.js';
import { loadEnvironment } from './config/environment.js';
import { connectDatabase, databaseProbe, disconnectDatabase } from './database/mongoose.js';
import { createLogger } from './shared/logger.js';

async function bootstrap(): Promise<void> {
  const environment = loadEnvironment();
  const logger = createLogger(environment);
  await connectDatabase(environment, logger);

  const app = createApp({
    database: databaseProbe,
    frontendOrigin: environment.FRONTEND_ORIGIN,
    logger,
  });

  const server = app.listen(environment.PORT, '127.0.0.1', () => {
    logger.info({ port: environment.PORT, host: '127.0.0.1' }, 'server_started');
  });

  registerShutdown(server, logger);
}

function registerShutdown(server: Server, logger: ReturnType<typeof createLogger>): void {
  let stopping = false;
  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    logger.info({ signal }, 'server_stopping');
    server.close(async () => {
      await disconnectDatabase(logger);
      process.exitCode = 0;
    });
  };
  process.once('SIGINT', () => { void shutdown('SIGINT'); });
  process.once('SIGTERM', () => { void shutdown('SIGTERM'); });
}

void bootstrap().catch(() => {
  process.stderr.write('Backend initialization failed. Check environment and MongoDB Atlas configuration.\n');
  process.exitCode = 1;
});
