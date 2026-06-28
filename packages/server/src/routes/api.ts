// ═══════════════════════════════════════════════════════════════
// REST API Routes — Express Router
// ═══════════════════════════════════════════════════════════════

import { Router } from 'express';
import * as authService from '../auth/auth-service';
import * as roomService from '../rooms/room-service';
import * as chatService from '../chat/chat-service';
import { authMiddleware, authRateLimitMiddleware, type AuthenticatedRequest } from '../middleware';
import { getDb } from '../db/client';

const router = Router();

// ─── Auth Routes ──────────────────────────────────────────────

router.post('/auth/register', authRateLimitMiddleware(), async (req, res, next) => {
  try {
    const data = authService.registerSchema.parse(req.body);
    const result = await authService.register(data);
    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(400).json({ success: false, error: { code: 'VALIDATION', message: err.errors[0]?.message ?? 'Geçersiz veri' } });
      return;
    }
    if (err.name === 'AuthError') {
      res.status(409).json({ success: false, error: { code: err.code, message: err.message } });
      return;
    }
    next(err);
  }
});

router.post('/auth/login', authRateLimitMiddleware(), async (req, res, next) => {
  try {
    const data = authService.loginSchema.parse(req.body);
    const result = await authService.login(data);
    res.json({ success: true, data: result });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Geçersiz veri' } });
      return;
    }
    if (err.name === 'AuthError') {
      res.status(401).json({ success: false, error: { code: err.code, message: err.message } });
      return;
    }
    next(err);
  }
});

router.post('/auth/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) { res.status(400).json({ success: false, error: { code: 'MISSING_TOKEN', message: 'Refresh token gerekli' } }); return; }
    const tokens = await authService.refreshTokens(refreshToken);
    res.json({ success: true, data: tokens });
  } catch (err: any) {
    if (err.name === 'AuthError') { res.status(401).json({ success: false, error: { code: err.code, message: err.message } }); return; }
    next(err);
  }
});

// ─── User Routes ──────────────────────────────────────────────

router.get('/users/me', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const profile = await authService.getUserProfile(req.user!.userId);
    res.json({ success: true, data: profile });
  } catch (err) { next(err); }
});

router.patch('/users/me', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { displayName, bio, avatarUrl } = req.body;
    const updated = await getDb().user.update({
      where: { id: req.user!.userId },
      data: {
        ...(displayName && { displayName: String(displayName).slice(0, 50) }),
        ...(bio !== undefined && { bio: String(bio).slice(0, 200) }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
      select: { id: true, username: true, displayName: true, avatarUrl: true, bio: true },
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// ─── Room Routes ──────────────────────────────────────────────

router.get('/rooms/discover', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const pageSize = Math.min(Number(req.query.pageSize) || 20, 50);
    const sort = (req.query.sort as any) || 'trending';
    const result = await roomService.discoverRooms(page, pageSize, sort);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.post('/rooms/:roomId/invite', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const token = await roomService.generateInviteLink(req.params.roomId, req.user!.userId);
    res.json({ success: true, data: { inviteToken: token } });
  } catch (err) { next(err); }
});

router.get('/rooms/:roomId/messages', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const before = req.query.before as string | undefined;
    const messages = await chatService.getRoomMessages(req.params.roomId, limit, before);
    res.json({ success: true, data: messages });
  } catch (err) { next(err); }
});

// ─── Friend Routes ────────────────────────────────────────────

router.get('/friends', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = getDb();
    const friends = await db.friendship.findMany({
      where: {
        OR: [
          { senderId: req.user!.userId, status: 'accepted' },
          { receiverId: req.user!.userId, status: 'accepted' },
        ],
      },
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        receiver: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });
    const friendList = friends.map((f: any) => f.senderId === req.user!.userId ? f.receiver : f.sender);
    res.json({ success: true, data: friendList });
  } catch (err) { next(err); }
});

router.post('/friends/request', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { username } = req.body;
    const db = getDb();
    const target = await db.user.findUnique({ where: { username } });
    if (!target) { res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'Kullanıcı bulunamadı' } }); return; }
    if (target.id === req.user!.userId) { res.status(400).json({ success: false, error: { code: 'SELF_REQUEST', message: 'Kendinize istek gönderemezsiniz' } }); return; }

    const existing = await db.friendship.findFirst({
      where: { OR: [
        { senderId: req.user!.userId, receiverId: target.id },
        { senderId: target.id, receiverId: req.user!.userId },
      ]},
    });
    if (existing) { res.status(409).json({ success: false, error: { code: 'ALREADY_EXISTS', message: 'Zaten arkadaşsınız veya istek mevcut' } }); return; }

    const friendship = await db.friendship.create({
      data: { senderId: req.user!.userId, receiverId: target.id },
    });
    res.status(201).json({ success: true, data: friendship });
  } catch (err) { next(err); }
});

router.get('/friends/requests', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const requests = await getDb().friendship.findMany({
      where: { receiverId: req.user!.userId, status: 'pending' },
      include: { sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });
    res.json({ success: true, data: requests });
  } catch (err) { next(err); }
});

router.post('/friends/requests/:id/accept', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const friendship = await getDb().friendship.update({
      where: { id: req.params.id, receiverId: req.user!.userId },
      data: { status: 'accepted' },
    });
    res.json({ success: true, data: friendship });
  } catch (err) { next(err); }
});

router.post('/friends/requests/:id/reject', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    await getDb().friendship.delete({ where: { id: req.params.id, receiverId: req.user!.userId } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ─── Health Check ─────────────────────────────────────────────

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now(), uptime: process.uptime() });
});

export default router;
