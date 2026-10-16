import { z } from 'zod';
import { loadEnvironment } from '../config/environment.js';
import { connectDatabase, disconnectDatabase } from '../database/mongoose.js';
import { createLogger } from '../shared/logger.js';
import { ensureAuthIndexes, User } from './models.js';
import { hashPassword } from './password.js';
import { passwordSchema } from './router.js';

async function seed() {
  const environment = loadEnvironment();
  if (environment.NODE_ENV === 'production') throw new Error('Seed demo bị chặn trong production.');
  // Validate all inputs before making any database changes.
  const inputs = ['learner', 'teacher', 'admin'].map(role => ({
    role,
    email: z.string().trim().toLowerCase().email().parse(process.env[`SEED_${role.toUpperCase()}_EMAIL`]),
    password: passwordSchema.parse(process.env[`SEED_${role.toUpperCase()}_PASSWORD`]),
  }));
  if (new Set(inputs.map(input => input.email)).size !== 3) throw new Error('Email seed phải khác nhau.');
  const logger = createLogger(environment);
  try {
    await connectDatabase(environment, logger);
    await ensureAuthIndexes();
    for (const input of inputs) {
      const existing = await User.findOne({ email: input.email });
      if (existing) {
        if (existing.role !== input.role) throw new Error('Tài khoản seed tồn tại với vai trò khác; không thay đổi quyền.');
        continue;
      }
      await User.updateOne({ email: input.email }, { $setOnInsert: {
        fullName: `Demo ${input.role}`, email: input.email, role: input.role,
        status: 'active', passwordHash: await hashPassword(input.password),
      } }, { upsert: true });
    }
    logger.info('seed_completed_without_overwriting_existing_accounts');
  } finally { await disconnectDatabase(logger); }
}
void seed().catch(() => { process.stderr.write('Seed failed. Check seed variables, database and existing roles.\n'); process.exitCode = 1; });
