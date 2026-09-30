import mongoose from 'mongoose';
import type { Logger } from 'pino';
import type { Environment } from '../config/environment.js';

const stateNames: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

export interface DatabaseProbe {
  isReady(): boolean;
  state(): string;
}

export const databaseProbe: DatabaseProbe = {
  isReady: () => mongoose.connection.readyState === 1,
  state: () => stateNames[mongoose.connection.readyState] ?? 'unknown',
};

export class DatabaseConnectionError extends Error {
  constructor() {
    super('Không thể kết nối MongoDB Atlas.');
    this.name = 'DatabaseConnectionError';
  }
}

function safeErrorMetadata(error: unknown): Record<string, string | number> {
  if (typeof error !== 'object' || error === null) return { errorName: 'UnknownError' };
  const value = error as { name?: unknown; code?: unknown; cause?: unknown };
  const metadata: Record<string, string | number> = {
    errorName: typeof value.name === 'string' ? value.name : 'UnknownError',
  };
  if (typeof value.code === 'string' || typeof value.code === 'number') metadata.errorCode = value.code;
  if (typeof value.cause === 'object' && value.cause !== null && 'code' in value.cause) {
    const causeCode = (value.cause as { code?: unknown }).code;
    if (typeof causeCode === 'string' || typeof causeCode === 'number') metadata.causeCode = causeCode;
  }
  return metadata;
}

export async function connectDatabase(environment: Environment, logger: Logger): Promise<void> {
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(environment.MONGODB_URI, {
      dbName: environment.MONGODB_DB_NAME,
      serverSelectionTimeoutMS: 5_000,
      autoIndex: environment.NODE_ENV !== 'production',
      bufferCommands: false,
    });
    logger.info({ database: environment.MONGODB_DB_NAME }, 'database_connected');
  } catch (error) {
    logger.error(safeErrorMetadata(error), 'database_connection_failed');
    throw new DatabaseConnectionError();
  }
}

export async function disconnectDatabase(logger: Logger): Promise<void> {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  logger.info('database_disconnected');
}
