import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { prisma } from '@adventure/database';
import { TURN_CONSTANTS, SkillType } from '@adventure/shared';
import { AppError } from '../middleware/errorHandler';
import {
  generateAccessToken,
  generateRefreshToken,
  refreshTokenExpiresAt,
  verifyRefreshToken,
} from '../middleware/auth';

export const authRouter = Router();

const registerSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const ALL_SKILLS: SkillType[] = [
  'melee', 'ranged', 'magic',
  'mining', 'foraging', 'woodcutting',
  'refining', 'tanning', 'weaving',
  'weaponsmithing', 'armorsmithing', 'leatherworking', 'tailoring', 'alchemy',
];

authRouter.post('/register', async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);

    // Check if user exists
    const existing = await prisma.player.findFirst({
      where: {
        OR: [
          { email: body.email },
          { username: body.username },
        ],
      },
    });

    if (existing) {
      throw new AppError(409, 'Username or email already taken', 'USER_EXISTS');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(body.password, 10);

    // Create player with all related records
    const player = await prisma.player.create({
      data: {
        username: body.username,
        email: body.email,
        passwordHash,
        turnBank: {
          create: {
            currentTurns: TURN_CONSTANTS.STARTING_TURNS,
          },
        },
        skills: {
          create: ALL_SKILLS.map(skill => ({
            skillType: skill,
            level: 1,
            xp: BigInt(0),
          })),
        },
      },
      include: {
        turnBank: true,
        skills: true,
      },
    });

    // Generate tokens
    const payload = { playerId: player.id, username: player.username };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        playerId: player.id,
        token: refreshToken,
        expiresAt: refreshTokenExpiresAt(),
      },
    });

    res.status(201).json({
      player: {
        id: player.id,
        username: player.username,
        email: player.email,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);

    const player = await prisma.player.findUnique({
      where: { email: body.email },
    });

    if (!player) {
      throw new AppError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    const validPassword = await bcrypt.compare(body.password, player.passwordHash);
    if (!validPassword) {
      throw new AppError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // Update last active
    await prisma.player.update({
      where: { id: player.id },
      data: { lastActiveAt: new Date() },
    });

    // Generate tokens
    const payload = { playerId: player.id, username: player.username };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        playerId: player.id,
        token: refreshToken,
        expiresAt: refreshTokenExpiresAt(),
      },
    });

    res.json({
      player: {
        id: player.id,
        username: player.username,
        email: player.email,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError(400, 'Refresh token required', 'MISSING_TOKEN');
    }

    // Verify token
    const payload = verifyRefreshToken(refreshToken);

    // Check if token exists in DB
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new AppError(401, 'Invalid or expired refresh token', 'INVALID_TOKEN');
    }

    // Delete old token
    await prisma.refreshToken.delete({
      where: { id: storedToken.id },
    });

    // Generate new tokens
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    // Store new refresh token
    await prisma.refreshToken.create({
      data: {
        playerId: payload.playerId,
        token: newRefreshToken,
        expiresAt: refreshTokenExpiresAt(),
      },
    });

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
