import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

export function validateRequest(schema: ZodType): RequestHandler {
  return (request, _response, next) => {
    try {
      request.validated = schema.parse({
        body: request.body,
        params: request.params,
        query: request.query,
      });
      next();
    } catch (error) {
      next(error);
    }
  };
}
