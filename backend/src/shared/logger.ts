import pino, { type Logger } from 'pino';
import type { Environment } from '../config/environment.js';

const secretPaths = [
  'authorization',
  'cookie',
  'password',
  'passwordHash',
  'refreshToken',
  'accessToken',
  'MONGODB_URI',
  'GEMINI_API_KEY',
  'ACCESS_TOKEN_SECRET',
  'REFRESH_TOKEN_SECRET',
];

export function createLogger(environment: Pick<Environment, 'LOG_LEVEL'>): Logger {
  return pino({
    level: environment.LOG_LEVEL,
    base: { service: 'ielts-writing-api' },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: { paths: secretPaths, censor: '[REDACTED]' },
  });
}
