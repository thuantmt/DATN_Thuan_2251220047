import { describe, expect, it } from 'vitest';
import { ConfigurationError, parseEnvironment } from '../src/config/environment.js';

describe('environment validation', () => {
  it('requires secure HTTPS configuration in production', () => {
    expect(() => parseEnvironment({ NODE_ENV: 'production', MONGODB_URI: 'mongodb://127.0.0.1/test' })).toThrow(ConfigurationError);
    expect(() => parseEnvironment({ MONGODB_URI: 'mongodb://127.0.0.1/test', COOKIE_SAME_SITE: 'none' })).toThrow(ConfigurationError);
    expect(() => parseEnvironment({ MONGODB_URI: 'mongodb://127.0.0.1/test', FRONTEND_ORIGIN: 'invalid' })).toThrow(ConfigurationError);
    expect(parseEnvironment({ NODE_ENV: 'production', MONGODB_URI: 'mongodb://127.0.0.1/test', COOKIE_SECURE: 'true', FRONTEND_ORIGIN: 'https://app.example.test' }).COOKIE_SECURE).toBe(true);
  });
  it('accepts Atlas configuration and applies safe defaults', () => {
    const environment = parseEnvironment({
      MONGODB_URI: 'mongodb+srv://example.invalid/ielts_writing',
      MONGODB_DB_NAME: 'ielts_writing',
    });
    expect(environment.PORT).toBe(3000);
    expect(environment.FRONTEND_ORIGIN).toBe('http://127.0.0.1:5173');
    expect(environment.COOKIE_SECURE).toBe(false);
  });

  it('reports only invalid key names and never echoes secret values', () => {
    const secret = 'do-not-echo-this-value';
    try {
      parseEnvironment({ MONGODB_URI: secret });
      throw new Error('Expected configuration parsing to fail.');
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError);
      expect((error as ConfigurationError).keys).toEqual(['MONGODB_URI']);
      expect((error as Error).message).not.toContain(secret);
    }
  });
});
