import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['learner', 'teacher', 'admin'], default: 'learner', required: true },
  status: { type: String, enum: ['active', 'blocked'], default: 'active', required: true },
}, { timestamps: true, bufferCommands: false });

const sessionSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true, bufferCommands: false });

export const User = mongoose.model('User', userSchema);
export const Session = mongoose.model('Session', sessionSchema);
export async function ensureAuthIndexes(): Promise<void> {
  await User.createIndexes();
  await Session.createIndexes();
}
