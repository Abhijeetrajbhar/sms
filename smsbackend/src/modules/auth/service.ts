import { Request } from 'express';
import { AuthRepository } from './repository';
import { RegisterDto, LoginDto, ChangePasswordDto, AuthTokens, AuthUser } from './types';
import { hashPassword, comparePassword, generateRandomToken, hashToken } from '../../utils/password';
import { generateTokenPair, verifyRefreshToken, getRefreshTokenExpiryDate } from '../../utils/jwt';
import { AppError } from '../../utils/AppError';
import { auditLog } from '../auditLog/service';
import { AuditAction } from '@prisma/client';
import { sendAccountInvitationEmail, sendPasswordResetEmail } from '../../utils/email';

const repo = new AuthRepository();

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export class AuthService {
  private assertLoginAllowed(user: { status: string; deletedAt?: Date | null }): void {
    if (user.deletedAt) throw AppError.unauthorized('Account not found');
    if (user.status === 'PENDING_VERIFICATION') {
      throw AppError.forbidden('Account is pending verification. Contact school administration.');
    }
    if (user.status !== 'ACTIVE') {
      throw AppError.forbidden('Account is inactive or suspended. Contact support.');
    }
  }

  async register(dto: RegisterDto, req: Request): Promise<{ user: AuthUser; tokens?: AuthTokens }> {
    // Check existing user
    const existing = await repo.findUserByEmail(dto.email);
    if (existing) throw AppError.conflict('Email already registered');

    // Access requests do not choose a usable password. The user sets one only
    // after an administrator approves and sends a one-time invitation.
    const hashedPassword = await hashPassword(generateRandomToken());

    // Create user
    const user = await repo.createUser({ ...dto, password: hashedPassword });

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

    return { user: user as AuthUser };
  }

  async activateAccount(token: string, password: string, req: Request): Promise<void> {
    const user = await repo.findByEmailVerificationToken(hashToken(token));
    if (!user) throw AppError.badRequest('Activation link is invalid or expired');

    await repo.activateUser(user.id, await hashPassword(password));
    await repo.invalidateAllUserSessions(user.id);

    await auditLog({
      actorId: user.id,
      action: AuditAction.USER_UPDATED,
      entity: 'UserActivation',
      entityId: user.id,
      metadata: { status: 'ACTIVE', role: user.role },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  async resendActivation(email: string, req: Request): Promise<{ delivered: boolean }> {
    const cleanEmail = email ? email.toLowerCase().trim() : '';
    if (!cleanEmail) return { delivered: false };

    const user = await repo.findUserByEmail(cleanEmail);
    if (!user || user.deletedAt || user.status !== 'PENDING_VERIFICATION') {
      return { delivered: false };
    }

    const token = generateRandomToken();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await repo.setEmailVerificationToken(user.id, hashToken(token), expiresAt);

    const delivered = await sendAccountInvitationEmail(user.email, token, user.firstName);
    await auditLog({
      actorId: user.id,
      action: AuditAction.USER_UPDATED,
      entity: 'ActivationResend',
      entityId: user.id,
      metadata: { delivered },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return { delivered };
  }

  async login(dto: LoginDto, req: Request): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const user = await repo.findUserByEmail(dto.email);

    // Always run a dummy comparison when the account does not exist so that
    // response timing does not leak which emails are registered.
    const dummyHash = user ? user.password : '$2a$12$invalid';
    const isMatch = user ? await comparePassword(dto.password, user.password) : false;
    await comparePassword(dto.password, dummyHash).catch(() => false);

    if (user && user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw AppError.tooManyRequests(
        `Too many failed attempts. Account locked for ${minutesLeft} more minute(s).`
      );
    }

    if (!user) throw AppError.unauthorized('Invalid email or password');
    this.assertLoginAllowed(user);

    if (!isMatch) {
      await repo.registerFailedLogin(user.id, MAX_LOGIN_ATTEMPTS, LOCKOUT_MINUTES);
      throw AppError.unauthorized('Invalid email or password');
    }

    await repo.clearFailedLogins(user.id);
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
        status: user.status,
        avatarUrl: user.avatarUrl,
        isEmailVerified: user.isEmailVerified,
        permissions: user.permissions,
        isSuperAdmin: user.isSuperAdmin,
        mustChangePassword: user.passwordResetToken === 'MUST_CHANGE_PASSWORD',
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
    verifyRefreshToken(oldRefreshToken);

    // Find session
    const session = await repo.findSessionByToken(oldRefreshToken);
    if (!session || !session.isValid) {
      throw AppError.unauthorized('Invalid refresh token');
    }
    if (session.expiresAt < new Date()) {
      throw AppError.unauthorized('Refresh token expired');
    }
    this.assertLoginAllowed(session.user);

    // Token rotation — generate new pair
    const newTokens = generateTokenPair({
      userId: session.user.id,
      email: session.user.email,
      role: session.user.role,
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
    this.assertLoginAllowed(user);
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      avatarUrl: user.avatarUrl,
      isEmailVerified: user.isEmailVerified,
      permissions: user.permissions,
      isSuperAdmin: user.isSuperAdmin,
      mustChangePassword: (user as any).passwordResetToken === 'MUST_CHANGE_PASSWORD',
    };
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

    await repo.setPasswordResetToken(user.id, hashToken(token), expiresAt);

    await sendPasswordResetEmail(user.email, token);
  }

  async resetPassword(token: string, newPassword: string, req: Request): Promise<void> {
    const user = await repo.findByPasswordResetToken(hashToken(token));
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
