import prisma from '../../config/database';
import { Role, UserStatus } from '@prisma/client';

export class AuthRepository {
  async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async findUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        avatarUrl: true,
        isEmailVerified: true,
        permissions: true,
        isSuperAdmin: true,
        passwordResetToken: true,
        deletedAt: true,
      },
    });
  }

  async createUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: Role;
    phone?: string;
  }) {
    return prisma.user.create({
      data: {
        ...data,
        email: data.email.toLowerCase(),
        status: UserStatus.PENDING_VERIFICATION,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        avatarUrl: true,
        isEmailVerified: true,
        permissions: true,
        isSuperAdmin: true,
      },
    });
  }

  async updateLastLogin(userId: string) {
    return prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  }

  async registerFailedLogin(userId: string, maxAttempts: number, lockMinutes: number) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    const nextCount = (user.failedLoginCount ?? 0) + 1;
    const shouldLock = nextCount >= maxAttempts;
    return prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginCount: shouldLock ? 0 : nextCount,
        ...(shouldLock
          ? { lockedUntil: new Date(Date.now() + lockMinutes * 60 * 1000) }
          : {}),
      },
    });
  }

  async clearFailedLogins(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { failedLoginCount: 0, lockedUntil: null },
    });
  }

  async createSession(data: {
    userId: string;
    refreshToken: string;
    ipAddress?: string;
    userAgent?: string;
    deviceInfo?: string;
    expiresAt: Date;
  }) {
    return prisma.session.create({ data });
  }

  async findSessionByToken(refreshToken: string) {
    return prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });
  }

  async invalidateSession(refreshToken: string) {
    return prisma.session.updateMany({
      where: { refreshToken },
      data: { isValid: false },
    });
  }

  async invalidateAllUserSessions(userId: string) {
    return prisma.session.updateMany({
      where: { userId },
      data: { isValid: false },
    });
  }

  async updateRefreshToken(oldToken: string, newToken: string, expiresAt: Date) {
    return prisma.session.update({
      where: { refreshToken: oldToken },
      data: { refreshToken: newToken, expiresAt, isValid: true },
    });
  }

  async updatePassword(userId: string, hashedPassword: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });
  }

  async setPasswordResetToken(userId: string, token: string, expiresAt: Date) {
    return prisma.user.update({
      where: { id: userId },
      data: { passwordResetToken: token, passwordResetExpires: expiresAt },
    });
  }

  async findByPasswordResetToken(token: string) {
    return prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { gt: new Date() },
        deletedAt: null,
      },
    });
  }

  async clearPasswordResetToken(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { passwordResetToken: null, passwordResetExpires: null },
    });
  }

  async findByEmailVerificationToken(tokenHash: string) {
    return prisma.user.findFirst({
      where: {
        emailVerifyToken: tokenHash,
        emailVerifyExpires: { gt: new Date() },
        status: UserStatus.PENDING_VERIFICATION,
        deletedAt: null,
      },
    });
  }

  async setEmailVerificationToken(userId: string, token: string, expiresAt: Date) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        emailVerifyToken: token,
        emailVerifyExpires: expiresAt,
        isEmailVerified: false,
      },
    });
  }

  async activateUser(userId: string, hashedPassword: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpires: null,
      },
    });
  }
}
