import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { databaseProbe } from '../src/database/mongoose.js';
import { User, Session, ensureAuthIndexes } from '../src/auth/models.js';
import { hashPassword } from '../src/auth/password.js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const origin = 'http://127.0.0.1:5173';
const password = 'test-only-password-2026';
let mongo: MongoMemoryServer;
const app = () => createApp({ database: databaseProbe });
const mutation = (server: ReturnType<typeof app>, path: string, body: object) => request(server).post(path).set('Origin', origin).set('X-CSRF-Protection', '1').send(body);
async function createUser(role: 'learner' | 'teacher' | 'admin' = 'learner', status: 'active' | 'blocked' = 'active') {
  return User.create({ fullName: 'Test User', email: `${role}@example.test`, passwordHash: await hashPassword(password), role, status });
}
async function signIn(server: ReturnType<typeof app>, role = 'learner') {
  const result = await mutation(server, '/api/v1/auth/login', { email: `${role}@example.test`, password });
  expect(result.status).toBe(200);
  return (result.headers['set-cookie'] as unknown as string[])[0]!.split(';')[0]!;
}
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'week3_isolated_tests' });
  await ensureAuthIndexes();
}, 180000);
afterAll(async () => { await mongoose.disconnect(); await mongo?.stop(); });
beforeEach(async () => { await User.deleteMany({}); await Session.deleteMany({}); });

describe('real HTTP and isolated MongoDB authentication', () => {
  it('seeds three roles idempotently without changing existing passwords', async () => {
    const env = { ...process.env, NODE_ENV: 'test', MONGODB_URI: mongo.getUri(), MONGODB_DB_NAME: 'week3_isolated_tests' };
    for (const role of ['LEARNER', 'TEACHER', 'ADMIN']) {
      Object.assign(env, { [`SEED_${role}_EMAIL`]: `${role.toLowerCase()}@example.test`, [`SEED_${role}_PASSWORD`]: password });
    }
    const run = () => promisify(execFile)(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'src/auth/seed.ts'], { env });
    await run();
    const before = await User.find().select('+passwordHash').sort({ email: 1 }).lean();
    await run();
    const after = await User.find().select('+passwordHash').sort({ email: 1 }).lean();
    expect(after).toEqual(before);
    expect(after.map(user => user.role).sort()).toEqual(['admin', 'learner', 'teacher']);
  }, 30000);
  it('sets hardened production cookies and rotates prior session on login', async () => {
    const server = createApp({ database: databaseProbe, auth: { secure: true, sameSite: 'lax', sessionSeconds: 60 } });
    await createUser();
    const result = await mutation(server, '/api/v1/auth/login', { email: 'learner@example.test', password });
    const header = (result.headers['set-cookie'] as unknown as string[])[0]!;
    expect(header).toContain('__Host-ielts_session='); expect(header).toContain('Secure');
    expect(header).toContain('HttpOnly'); expect(header).toContain('SameSite=Lax'); expect(header).not.toContain('Domain=');
    const cookie = header.split(';')[0]!;
    await mutation(server, '/api/v1/auth/login', { email: 'learner@example.test', password }).set('Cookie', cookie);
    expect(await Session.countDocuments()).toBe(1);
    expect((await request(server).get('/api/v1/auth/me').set('Cookie', cookie)).status).toBe(401);
  });
  it('registers learner, hashes password and normalizes unique email', async () => {
    const server = app();
    const body = { fullName: 'Learner Test', email: ' STUDENT@EXAMPLE.TEST ', password };
    const result = await mutation(server, '/api/v1/auth/register', body);
    expect(result.status).toBe(201);
    expect(result.body.data.user).toMatchObject({ role: 'learner', email: 'student@example.test' });
    expect(JSON.stringify(result.body)).not.toContain('password');
    const stored = await User.findOne({ email: 'student@example.test' }).select('+passwordHash');
    expect(stored!.passwordHash).not.toBe(password);
    expect((await mutation(server, '/api/v1/auth/register', body)).status).toBe(409);
  });
  it.each(['admin', 'teacher'])('rejects registration privilege injection %s', async role => {
    expect((await mutation(app(), '/api/v1/auth/register', { fullName: 'Test User', email: 'test@example.test', password, role })).status).toBe(422);
    expect(await User.countDocuments()).toBe(0);
  });
  it.each([{ email: 'bad', password }, { email: 'a@example.test', password: 'short' }])('rejects invalid input %j', async fields => {
    expect((await mutation(app(), '/api/v1/auth/register', { fullName: 'Test User', ...fields })).status).toBe(422);
  });
  it('handles concurrent duplicate registrations', async () => {
    const server = app();
    const body = { fullName: 'Test User', email: 'a@example.test', password };
    const results = await Promise.all([mutation(server, '/api/v1/auth/register', body), mutation(server, '/api/v1/auth/register', body)]);
    expect(results.map(result => result.status).sort()).toEqual([201, 409]);
  });
  it('rejects wrong password and unknown user', async () => {
    await createUser();
    for (const email of ['learner@example.test', 'unknown@example.test']) {
      expect((await mutation(app(), '/api/v1/auth/login', { email, password: 'wrong-password' })).status).toBe(401);
    }
  });
  it.each(['learner', 'teacher', 'admin'])('enforces all dashboard permissions for %s', async role => {
    const server = app(); await createUser(role as 'learner' | 'teacher' | 'admin'); const cookie = await signIn(server, role);
    const me = await request(server).get('/api/v1/auth/me').set('Cookie', cookie);
    expect(me.status).toBe(200); expect(me.body.data.user.role).toBe(role);
    expect(JSON.stringify(me.body)).not.toContain('passwordHash');
    for (const target of ['learner', 'teacher', 'admin']) {
      expect((await request(server).get(`/api/v1/${target}/dashboard`).set('Cookie', cookie)).status).toBe(target === role ? 200 : 403);
    }
  });
  it('rejects absent, malformed, forged and expired sessions', async () => {
    const server = app(); await createUser();
    for (const cookie of ['', 'ielts_session=bad', `ielts_session=${'a'.repeat(64)}`]) {
      expect((await request(server).get('/api/v1/auth/me').set('Cookie', cookie)).status).toBe(401);
    }
    const cookie = await signIn(server);
    await Session.updateMany({}, { expiresAt: new Date(0) });
    expect((await request(server).get('/api/v1/auth/me').set('Cookie', cookie)).status).toBe(401);
  });
  it('checks blocked status and changed roles on existing sessions', async () => {
    const server = app(); const user = await createUser(); const cookie = await signIn(server);
    await User.updateOne({ _id: user._id }, { role: 'teacher' });
    expect((await request(server).get('/api/v1/learner/dashboard').set('Cookie', cookie)).status).toBe(403);
    expect((await request(server).get('/api/v1/teacher/dashboard').set('Cookie', cookie)).status).toBe(200);
    await User.updateOne({ _id: user._id }, { status: 'blocked' });
    expect((await request(server).get('/api/v1/auth/me').set('Cookie', cookie)).status).toBe(403);
    expect((await mutation(server, '/api/v1/auth/login', { email: user.email, password })).status).toBe(403);
  });
  it('restores persisted sessions in a new app and revokes them on logout', async () => {
    await createUser(); const cookie = await signIn(app()); const restarted = app();
    expect((await request(restarted).get('/api/v1/auth/me').set('Cookie', cookie)).status).toBe(200);
    const result = await mutation(restarted, '/api/v1/auth/logout', {}).set('Cookie', cookie);
    expect(result.status).toBe(200); expect(await Session.countDocuments()).toBe(0);
    expect((await request(restarted).get('/api/v1/auth/me').set('Cookie', cookie)).status).toBe(401);
    expect((result.headers['set-cookie'] as unknown as string[])[0]!).toContain('HttpOnly');
  });
  it('rejects untrusted Origin or missing CSRF header and limits attempts', async () => {
    const server = createApp({ database: databaseProbe, auth: { secure: false, sameSite: 'lax', sessionSeconds: 60, rateLimitMax: 1 } });
    expect((await request(server).post('/api/v1/auth/login').set('Origin', origin).send({})).status).toBe(403);
    expect((await request(server).post('/api/v1/auth/login').set('Origin', 'https://evil.example').set('X-CSRF-Protection', '1').send({})).status).toBe(403);
    await mutation(server, '/api/v1/auth/login', {});
    expect((await mutation(server, '/api/v1/auth/login', {})).status).toBe(429);
    const cors = await request(server).options('/api/v1/auth/login').set('Origin', 'https://evil.example');
    expect(cors.headers['access-control-allow-origin']).not.toBe('https://evil.example');
  });
  it('returns 503 rather than mock auth when database is unavailable', async () => {
    const server = createApp({ database: { isReady: () => false, state: () => 'disconnected' } });
    expect((await request(server).get('/api/v1/auth/me')).status).toBe(503);
  });
});
