import type { RequestHandler } from 'express';
import { AppError } from '../shared/app-error.js';

export const notFound: RequestHandler = (_request, _response, next) => {
  next(new AppError(404, 'ROUTE_NOT_FOUND', 'Không tìm thấy endpoint.'));
};
