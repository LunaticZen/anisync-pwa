// ═══════════════════════════════════════════════════════════════
// Auth Service — JWT Authentication & User Management
// ═══════════════════════════════════════════════════════════════

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getDb } from '../db/client';
import { config } from '../config';
import type { AuthTokens, TokenPayload } from '@anisync/shared';

// ─── Validation Schemas ───────────────────────────────────────

export const registerSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, underscores'),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(50),
});

export const loginSchema = z.object({
  usernameOrEmail: z.string().min(1).max(255),
  password: z.string().min(1).max(128),
});

// ─── Token Generation ─────────────────────────────────────────

function generateTokens(userId: string, username: string): AuthTokens {
  const payload = { userId, username };
  const accessToken = jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_ACCESS_EXPIRY as jwt.SignOptions['expiresIn'],
  });
  const refreshToken = jwt.sign(payload, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRY as jwt.SignOptions['expiresIn'],
  });
  return { accessToken, refreshToken, expiresIn: 900 }; // 15 min
}

// ─── Service Functions ────────────────────────────────────────

export async function register(data: z.infer<typeof registerSchema>) {
  const db = getDb();

  // Check uniqueness
  const existing = await db.user.findFirst({
    where: { OR: [{ username: data.username }, { email: data.email }] },
  });
  if (existing) {
    if (existing.username === data.username) throw new AuthError('USERNAME_TAKEN', 'Bu kullanıcı adı alınmış');
    throw new AuthError('EMAIL_TAKEN', 'Bu email zaten kayıtlı');
  }

  const passwordHash = await bcrypt.hash(data.password, config.BCRYPT_ROUNDS);

  const user = await db.user.create({
    data: {
      username: data.username,
      email: data.email,
      passwordHash,
      displayName: data.displayName,
    },
    select: { id: true, username: true, displayName: true, avatarUrl: true, createdAt: true },
  });

  const tokens = generateTokens(user.id, user.username);
  return { user, tokens };
}

export async function login(data: z.infer<typeof loginSchema>) {
  const db = getDb();
  const user = await db.user.findFirst({
    where: {
      OR: [
        { username: data.usernameOrEmail },
        { email: data.usernameOrEmail },
      ],
    },
  });

  if (!user) throw new AuthError('INVALID_CREDENTIALS', 'Kullanıcı adı veya şifre hatalı');

  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) throw new AuthError('INVALID_CREDENTIALS', 'Kullanıcı adı veya şifre hatalı');

  // Update last seen
  await db.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } });

  const tokens = generateTokens(user.id, user.username);
  return {
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      email: user.email,
      createdAt: user.createdAt,
    },
    tokens,
  };
}

export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  try {
    const decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as TokenPayload;
    const user = await getDb().user.findUnique({ where: { id: decoded.userId } });
    if (!user) throw new AuthError('USER_NOT_FOUND', 'Kullanıcı bulunamadı');
    return generateTokens(user.id, user.username);
  } catch (err) {
    if (err instanceof AuthError) throw err;
    throw new AuthError('INVALID_TOKEN', 'Geçersiz refresh token');
  }
}

export function verifyAccessToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, config.JWT_SECRET) as TokenPayload;
  } catch {
    throw new AuthError('INVALID_TOKEN', 'Geçersiz veya süresi dolmuş token');
  }
}

export async function getUserProfile(userId: string) {
  const db = getDb();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true, username: true, displayName: true, avatarUrl: true,
      bio: true, createdAt: true, lastSeenAt: true,
      _count: { select: { sentFriendships: { where: { status: 'accepted' } }, watchHistory: true } },
    },
  });
  if (!user) throw new AuthError('USER_NOT_FOUND', 'Kullanıcı bulunamadı');
  return {
    ...user,
    friendCount: user._count.sentFriendships,
    watchCount: user._count.watchHistory,
  };
}

// ─── Error Class ──────────────────────────────────────────────

export class AuthError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'AuthError';
  }
}
