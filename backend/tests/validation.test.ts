import express from 'express';
import pino from 'pino';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { errorHandler } from '../src/middleware/error-handler.js';
import { requestContext } from '../src/middleware/request-context.js';
import { validateRequest } from '../src/middleware/validate-request.js';

describe('request validation foundation', () => {
  it('returns the common 422 error envelope for invalid input', async () => {
    const app = express();
    app.use(requestContext, express.json());
    app.post('/example', validateRequest(z.object({
      body: z.object({ name: z.string().min(2) }),
      params: z.object({}),
      query: z.object({}),
    })), (_request, response) => response.status(204).end());
    app.use(errorHandler(pino({ level: 'silent' })));

    const response = await request(app).post('/example').send({ name: '' });
    expect(response.status).toBe(422);
    expect(response.body.error).toMatchObject({ code: 'VALIDATION_ERROR', message: 'Dữ liệu không hợp lệ.' });
    expect(response.body.error.requestId).toEqual(expect.any(String));
  });
});
