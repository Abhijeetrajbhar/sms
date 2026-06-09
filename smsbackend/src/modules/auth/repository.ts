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
        status: UserStatus.ACTIVE, // Auto-activate for demo; use PENDING_VERIFICATION in production
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
      data: { password: hashedPassword },
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
}
