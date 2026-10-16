import dotenv from 'dotenv';
import { z } from 'zod';

const booleanString = z.preprocess(
  value => typeof value === 'string' ? value.toLowerCase() : value,
  z.union([z.literal('true'), z.literal('false')]).transform(value => value === 'true'),
);

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  MONGODB_URI: z.string().min(1).refine(
    value => value.startsWith('mongodb://') || value.startsWith('mongodb+srv://'),
    'MONGODB_URI phải dùng giao thức MongoDB hợp lệ.',
  ),
  MONGODB_DB_NAME: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/).default('ielts_writing'),
  FRONTEND_ORIGIN: z.string().url().default('http://127.0.0.1:5173'),
  ACCESS_TOKEN_SECRET: z.string().default(''),
  REFRESH_TOKEN_SECRET: z.string().default(''),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL: z.string().default('7d'),
  COOKIE_SECURE: booleanString.default(false),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  SESSION_TTL_SECONDS: z.coerce.number().int().min(60).max(2_592_000).default(604800),
  HOST: z.enum(['127.0.0.1', '0.0.0.0']).default('127.0.0.1'),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(2).default(0),
  GEMINI_API_KEY: z.string().default(''),
  GEMINI_MODEL: z.string().default(''),
  GEMINI_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(120_000).default(30_000),
  GEMINI_MAX_RETRIES: z.coerce.number().int().min(0).max(3).default(1),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
}).superRefine((value, context) => {
  if ((value.NODE_ENV === 'production' || value.COOKIE_SAME_SITE === 'none') && !value.COOKIE_SECURE) {
    context.addIssue({ code: 'custom', path: ['COOKIE_SECURE'], message: 'Cookie production/cross-site cần HTTPS.' });
  }
  let url: URL;
  try { url = new URL(value.FRONTEND_ORIGIN); } catch { return; }
  if (url.origin !== value.FRONTEND_ORIGIN || (value.NODE_ENV === 'production' && url.protocol !== 'https:')) {
    context.addIssue({ code: 'custom', path: ['FRONTEND_ORIGIN'], message: 'Origin phải chính xác; production cần HTTPS.' });
  }
});

export type Environment = z.infer<typeof environmentSchema>;

export class ConfigurationError extends Error {
  readonly keys: string[];

  constructor(keys: string[]) {
    super(`Cấu hình backend không hợp lệ ở ${keys.length} biến môi trường.`);
    this.name = 'ConfigurationError';
    this.keys = keys;
  }
}

export function parseEnvironment(input: NodeJS.ProcessEnv): Environment {
  const result = environmentSchema.safeParse(input);
  if (!result.success) {
    const keys = [...new Set(result.error.issues.map(issue => String(issue.path[0] ?? 'UNKNOWN')))].sort();
    throw new ConfigurationError(keys);
  }
  return result.data;
}

export function loadEnvironment(): Environment {
  dotenv.config({ quiet: true });
  return parseEnvironment(process.env);
}
