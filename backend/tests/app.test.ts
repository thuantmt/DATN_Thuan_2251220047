import pino from 'pino';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { DatabaseProbe } from '../src/database/mongoose.js';

const logger = pino({ level: 'silent' });
const probe = (ready: boolean, state = ready ? 'connected' : 'disconnected'): DatabaseProbe => ({
  isReady: () => ready,
  state: () => state,
});

describe('system API', () => {
  it('returns liveness without depending on MongoDB', async () => {
    const response = await request(createApp({ database: probe(false), logger })).get('/api/v1/health');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok', service: 'ielts-writing-api' });
    expect(response.headers['x-request-id']).toEqual(expect.any(String));
    expect(response.body.requestId).toBe(response.headers['x-request-id']);
  });

  it('returns ready only when MongoDB is connected', async () => {
    const response = await request(createApp({ database: probe(true), logger })).get('/api/v1/ready');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ready', checks: { mongodb: 'up' } });
  });

  it('returns a sanitized 503 response when MongoDB is unavailable', async () => {
    const response = await request(createApp({ database: probe(false, 'connecting'), logger })).get('/api/v1/ready');
    expect(response.status).toBe(503);
    expect(response.body.error).toMatchObject({ code: 'SERVICE_NOT_READY', details: [{ service: 'mongodb', status: 'connecting' }] });
    expect(response.body.error.requestId).toBe(response.headers['x-request-id']);
  });

  it('uses the standard error envelope for unknown routes', async () => {
    const response = await request(createApp({ database: probe(true), logger })).get('/api/v1/missing');
    expect(response.status).toBe(404);
    expect(response.body.error).toMatchObject({ code: 'ROUTE_NOT_FOUND', details: [] });
  });
});
