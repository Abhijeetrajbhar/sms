import { Request } from 'express';
import { AuthRepository } from './repository';
import { RegisterDto, LoginDto, ChangePasswordDto, AuthTokens, AuthUser } from './types';
import { hashPassword, comparePassword, generateRandomToken } from '../../utils/password';
import { generateTokenPair, verifyRefreshToken, getRefreshTokenExpiryDate } from '../../utils/jwt';
import { AppError } from '../../utils/AppError';
import { auditLog } from '../auditLog/service';
import { AuditAction } from '@prisma/client';

const repo = new AuthRepository();

export class AuthService {
  async register(dto: RegisterDto, req: Request): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    // Check existing user
    const existing = await repo.findUserByEmail(dto.email);
    if (existing) throw AppError.conflict('Email already registered');

    // Hash password
    const hashedPassword = await hashPassword(dto.password);

    // Create user
    const user = await repo.createUser({ ...dto, password: hashedPassword });

    // Generate tokens
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Create session
    await repo.createSession({
      userId: user.id,
      refreshToken: tokens.refreshToken,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      expiresAt: getRefreshTokenExpiryDate(),
    });

    // Audit log
    await auditLog({
      actorId: user.id,
      action: AuditAction.USER_CREATED,
      entity: 'User',
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { email: user.email, role: user.role },
    });

    return { user: user as AuthUser, tokens };
  }

  async login(dto: LoginDto, req: Request): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const user = await repo.findUserByEmail(dto.email);
    if (!user) throw AppError.unauthorized('Invalid email or password');
    if (user.deletedAt) throw AppError.unauthorized('Account not found');
    if (user.status === 'INACTIVE' || user.status === 'SUSPENDED') {
      throw AppError.forbidden('Account is inactive or suspended. Contact support.');
    }

    const isMatch = await comparePassword(dto.password, user.password);
    if (!isMatch) throw AppError.unauthorized('Invalid email or password');

    await repo.updateLastLogin(user.id);

    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await repo.createSession({
      userId: user.id,
      refreshToken: tokens.refreshToken,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      expiresAt: getRefreshTokenExpiryDate(),
    });

    await auditLog({
      actorId: user.id,
      action: AuditAction.LOGIN,
      entity: 'User',
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatarUrl: user.avatarUrl,
        isEmailVerified: user.isEmailVerified,
        permissions: user.permissions,
        isSuperAdmin: user.isSuperAdmin,
      },
      tokens,
    };
  }

  async logout(refreshToken: string, userId: string, req: Request): Promise<void> {
    await repo.invalidateSession(refreshToken);
    await auditLog({
      actorId: userId,
      action: AuditAction.LOGOUT,
      entity: 'User',
      entityId: userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  async refreshTokens(oldRefreshToken: string): Promise<AuthTokens> {
    // Verify token validity
    const payload = verifyRefreshToken(oldRefreshToken);

    // Find session
    const session = await repo.findSessionByToken(oldRefreshToken);
    if (!session || !session.isValid) {
      throw AppError.unauthorized('Invalid refresh token');
    }
    if (session.expiresAt < new Date()) {
      throw AppError.unauthorized('Refresh token expired');
    }

    // Token rotation — generate new pair
    const newTokens = generateTokenPair({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    });

    await repo.updateRefreshToken(
      oldRefreshToken,
      newTokens.refreshToken,
      getRefreshTokenExpiryDate()
    );

    return newTokens;
  }

  async getCurrentUser(userId: string): Promise<AuthUser> {
    const user = await repo.findUserById(userId);
    if (!user || user.deletedAt) throw AppError.notFound('User not found');
    return user as unknown as AuthUser;
  }

  async changePassword(userId: string, dto: ChangePasswordDto, req: Request): Promise<void> {
    const user = await repo.findUserByEmail(
      (await repo.findUserById(userId))!.email
    );
    if (!user) throw AppError.notFound('User not found');

    const isMatch = await comparePassword(dto.currentPassword, user.password);
    if (!isMatch) throw AppError.badRequest('Current password is incorrect');

    const hashed = await hashPassword(dto.newPassword);
    await repo.updatePassword(userId, hashed);

    // Invalidate all sessions (force re-login on other devices)
    await repo.invalidateAllUserSessions(userId);

    await auditLog({
      actorId: userId,
      action: AuditAction.PASSWORD_CHANGED,
      entity: 'User',
      entityId: userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await repo.findUserByEmail(email);
    // Always respond with success to prevent email enumeration
    if (!user || user.deletedAt) return;

    const token = generateRandomToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await repo.setPasswordResetToken(user.id, token, expiresAt);

    // TODO: Send email with reset link
    // await emailService.sendPasswordReset(user.email, token);
  }

  async resetPassword(token: string, newPassword: string, req: Request): Promise<void> {
    const user = await repo.findByPasswordResetToken(token);
    if (!user) throw AppError.badRequest('Invalid or expired reset token');

    const hashed = await hashPassword(newPassword);
    await repo.updatePassword(user.id, hashed);
    await repo.clearPasswordResetToken(user.id);
    await repo.invalidateAllUserSessions(user.id);

    await auditLog({
      actorId: user.id,
      action: AuditAction.PASSWORD_RESET,
      entity: 'User',
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
