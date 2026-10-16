import { createHash, randomBytes } from 'node:crypto';
import { Router, type CookieOptions, type RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import type { DatabaseProbe } from '../database/mongoose.js';
import { AppError } from '../shared/app-error.js';
import { Session, User } from './models.js';
import { hashPassword, verifyPassword } from './password.js';

export interface AuthOptions {
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  sessionSeconds: number;
  rateLimitMax?: number;
}
export const defaultAuthOptions: AuthOptions = { secure: false, sameSite: 'lax', sessionSeconds: 604800 };
const email = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z.string().min(10).max(128);
const registration = z.object({ fullName: z.string().trim().min(2).max(100), email, password: passwordSchema }).strict();
const login = z.object({ email, password: z.string().min(1).max(128) }).strict();
const digest = (value: string) => createHash('sha256').update(value).digest('hex');

export function createAuthRouter(database: DatabaseProbe, origin: string, options: AuthOptions): Router {
  const router = Router();
  const cookieName = options.secure ? '__Host-ielts_session' : 'ielts_session';
  const cookieOptions: CookieOptions = { httpOnly: true, secure: options.secure, sameSite: options.sameSite, path: '/' };
  router.use((_request, response, next) => { response.setHeader('Cache-Control', 'no-store'); next(); });
  router.use((_request, _response, next) => {
    if (!database.isReady()) throw new AppError(503, 'DATABASE_UNAVAILABLE', 'Cơ sở dữ liệu chưa sẵn sàng.');
    next();
  });
  // Require trusted Origin and a custom header for every mutation, including login.
  router.use((request, _response, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
      (request.get('origin') !== origin || request.get('x-csrf-protection') !== '1')) {
      throw new AppError(403, 'CSRF_REJECTED', 'Nguồn yêu cầu không được phép.');
    }
    next();
  });
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: options.rateLimitMax ?? 20,
    standardHeaders: 'draft-8', legacyHeaders: false,
    handler: (request, response) => response.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Quá nhiều lần thử. Vui lòng thử lại sau.', details: [], requestId: request.requestId } }),
  });
  router.post('/auth/register', limiter, async (request, response) => {
    const input = registration.parse(request.body);
    try {
      const user = await User.create({ fullName: input.fullName, email: input.email, passwordHash: await hashPassword(input.password), role: 'learner' });
      response.status(201).json({ data: { user: publicUser(user) } });
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
        throw new AppError(409, 'EMAIL_EXISTS', 'Email đã được sử dụng.');
      }
      throw error;
    }
  });
  router.post('/auth/login', limiter, async (request, response) => {
    const input = login.parse(request.body);
    const user = await User.findOne({ email: input.email }).select('+passwordHash');
    // Run a hash even for unknown users to reduce obvious timing differences.
    const valid = user ? await verifyPassword(input.password, user.passwordHash) : (await hashPassword(input.password), false);
    if (!user || !valid) throw new AppError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng.');
    if (user.status !== 'active') throw new AppError(403, 'ACCOUNT_BLOCKED', 'Tài khoản đã bị khóa.');
    const token = randomBytes(32).toString('hex');
    await Session.create({ userId: user._id, tokenHash: digest(token), expiresAt: new Date(Date.now() + options.sessionSeconds * 1000) });
    // Re-login revokes the previous cookie session without affecting other devices.
    const previous = sessionToken(request.headers.cookie, cookieName);
    if (previous) await Session.deleteOne({ tokenHash: digest(previous) });
    response.cookie(cookieName, token, { ...cookieOptions, maxAge: options.sessionSeconds * 1000 });
    response.json({ data: { user: publicUser(user) } });
  });
  router.post('/auth/logout', async (request, response) => {
    const token = sessionToken(request.headers.cookie, cookieName);
    if (token) await Session.deleteOne({ tokenHash: digest(token) });
    response.clearCookie(cookieName, cookieOptions);
    response.json({ data: { loggedOut: true } });
  });
  const authenticate: RequestHandler = async (request, response, next) => {
    const token = sessionToken(request.headers.cookie, cookieName);
    const session = token ? await Session.findOne({ tokenHash: digest(token), expiresAt: { $gt: new Date() } }) : null;
    if (!session) throw new AppError(401, 'UNAUTHENTICATED', 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
    const user = await User.findById(session.userId);
    if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'Tài khoản không tồn tại.');
    if (user.status !== 'active') throw new AppError(403, 'ACCOUNT_BLOCKED', 'Tài khoản đã bị khóa.');
    response.locals.user = publicUser(user);
    next();
  };
  router.get('/auth/me', authenticate, (_request, response) => response.json({ data: { user: response.locals.user } }));
  for (const role of ['learner', 'teacher', 'admin']) {
    router.get(`/${role}/dashboard`, authenticate, (_request, response) => {
      if (response.locals.user.role !== role) throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền truy cập.');
      response.json({ data: { user: response.locals.user, message: 'Thông tin tài khoản được xác minh từ backend. Chưa có dữ liệu học tập trên server.' } });
    });
  }
  return router;
}
function sessionToken(header: string | undefined, name: string): string | undefined {
  const token = header?.split(';').map(part => part.trim()).find(part => part.startsWith(`${name}=`))?.slice(name.length + 1);
  return token && /^[a-f0-9]{64}$/.test(token) ? token : undefined;
}
function publicUser(user: { _id: unknown; fullName: string; email: string; role: string; status: string }) {
  return { id: String(user._id), fullName: user.fullName, email: user.email, role: user.role, status: user.status };
}
