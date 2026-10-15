import { Role, UserStatus, AuditAction } from '@prisma/client';
import { UserRepository } from './repository';
import { AppError } from '../../utils/AppError';
import { buildPaginationMeta } from '../../utils/apiResponse';
import { getPaginationOptions } from '../../utils/pagination';
import { auditLog } from '../auditLog/service';
import { uploadToCloudinary } from '../../middlewares/upload.middleware';
import { cacheDelPattern } from '../../config/redis';
import { Request } from 'express';
import prisma from '../../config/database';
import { generateRandomToken, hashPassword, hashToken } from '../../utils/password';
import { ADMIN_PERMISSIONS, isAdminPermission } from '../admin/permissions';
import { buildAccountActivationUrl, sendAccountInvitationEmail } from '../../utils/email';

const repo = new UserRepository();

export class UserService {
  private async getAdminActor(actorId: string) {
    const actor = await prisma.user.findUnique({
      where: { id: actorId },
      select: { id: true, role: true, permissions: true, isSuperAdmin: true },
    });
    if (!actor || actor.role !== Role.ADMIN) throw AppError.forbidden('Admin access required');
    return actor;
  }

  private async assertCanManageTarget(actorId: string, target: Awaited<ReturnType<UserRepository['findById']>>) {
    const actor = await this.getAdminActor(actorId);
    const actorIsSuper = actor.isSuperAdmin === true;
    if (target?.role === Role.ADMIN && !actorIsSuper) {
      throw AppError.forbidden('Only a super admin can manage another admin account');
    }
    if (target?.isSuperAdmin && !actorIsSuper) {
      throw AppError.forbidden('Only a super admin can manage a super admin account');
    }
    return actorIsSuper;
  }

  async createUser(data: {
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
    phone?: string;
    permissions?: string[];
    isSuperAdmin?: boolean;
    deferInvitation?: boolean;
  }, actorId: string, req: Request) {
    const actor = await this.getAdminActor(actorId);
    const actorIsSuper = actor.isSuperAdmin === true;
    if (data.role === Role.ADMIN && !actorIsSuper) {
      throw AppError.forbidden('Only a super admin can create admin accounts');
    }
    const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existing) throw AppError.conflict('Email already registered');
    const permissions = (data.permissions || []).filter(isAdminPermission);
    if (data.role === Role.ADMIN && !data.isSuperAdmin && permissions.length === 0) {
      permissions.push('dashboard:view');
    }
    const invitationDeferred = Boolean(data.deferInvitation || data.role !== Role.ADMIN);
    const invitationToken = invitationDeferred ? null : generateRandomToken();
    const invitationExpires = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        password: await hashPassword(generateRandomToken()),
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phone: data.phone?.trim() || undefined,
        role: data.role,
        status: UserStatus.PENDING_VERIFICATION,
        isEmailVerified: false,
        emailVerifyToken: invitationToken ? hashToken(invitationToken) : null,
        emailVerifyExpires: invitationToken ? invitationExpires : null,
        permissions: data.role === Role.ADMIN ? permissions : [],
        isSuperAdmin: data.role === Role.ADMIN && actorIsSuper && Boolean(data.isSuperAdmin),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        permissions: true,
        isSuperAdmin: true,
        createdAt: true,
      },
    });
    await auditLog({
      actorId,
      action: AuditAction.USER_CREATED,
      entity: 'User',
      entityId: user.id,
      metadata: { email: user.email, role: user.role, invitationDeferred },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    const invitationDelivered = invitationToken
      ? await sendAccountInvitationEmail(user.email, invitationToken, user.firstName)
      : false;
    return {
      ...user,
      invitationDelivered,
      invitationDeferred,
      ...(invitationToken ? { activationUrl: buildAccountActivationUrl(invitationToken) } : {}),
    };
  }

  async inviteUser(userId: string, actorId: string, req: Request) {
    const user = await repo.findById(userId);
    if (!user || user.deletedAt) throw AppError.notFound('User not found');
    await this.assertCanManageTarget(actorId, user);
    if (user.status !== UserStatus.PENDING_VERIFICATION) {
      throw AppError.badRequest('Only pending accounts can be invited. Use password reset for active accounts.');
    }
    if (user.role === Role.TEACHER && !user.teacherProfile) {
      throw AppError.unprocessable('Create the teacher profile before sending an invitation');
    }
    if (user.role === Role.STUDENT && !user.studentProfile) {
      throw AppError.unprocessable('Create the student admission profile before sending an invitation');
    }
    if (user.role === Role.PARENT) {
      if (!user.parentProfile) throw AppError.unprocessable('Create the parent profile before sending an invitation');
      const linkedStudents = await prisma.studentProfile.count({
        where: { parentIds: { has: user.parentProfile.id }, deletedAt: null },
      });
      if (!linkedStudents) throw AppError.unprocessable('Link the parent to at least one active student before sending an invitation');
    }

    const invitationToken = generateRandomToken();
    const invitationExpires = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerifyToken: hashToken(invitationToken),
        emailVerifyExpires: invitationExpires,
        isEmailVerified: false,
      },
    });
    await prisma.session.updateMany({ where: { userId }, data: { isValid: false } });

    const invitationDelivered = await sendAccountInvitationEmail(user.email, invitationToken, user.firstName);
    await auditLog({
      actorId,
      action: AuditAction.USER_UPDATED,
      entity: 'UserInvitation',
      entityId: userId,
      metadata: { email: user.email, invitationExpires, invitationDelivered },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return {
      invitationDelivered,
      expiresAt: invitationExpires,
      activationUrl: buildAccountActivationUrl(invitationToken),
    };
  }

  async getActivationLink(userId: string, actorId: string, req: Request) {
    const user = await repo.findById(userId);
    if (!user || user.deletedAt) throw AppError.notFound('User not found');
    await this.assertCanManageTarget(actorId, user);
    if (user.status !== UserStatus.PENDING_VERIFICATION) {
      throw AppError.badRequest('Only pending accounts have an activation link');
    }

    const invitationToken = generateRandomToken();
    const invitationExpires = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerifyToken: hashToken(invitationToken),
        emailVerifyExpires: invitationExpires,
        isEmailVerified: false,
      },
    });

    await auditLog({
      actorId,
      action: AuditAction.USER_UPDATED,
      entity: 'ActivationLinkRetrieved',
      entityId: userId,
      metadata: { email: user.email },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return {
      activationUrl: buildAccountActivationUrl(invitationToken),
      expiresAt: invitationExpires,
    };
  }

  getPermissionCatalog() {
    return ADMIN_PERMISSIONS;
  }

  async updatePermissions(userId: string, permissions: string[], isSuperAdminValue: boolean | undefined, actorId: string, req: Request) {
    const actor = await this.getAdminActor(actorId);
    const actorIsSuper = actor.isSuperAdmin === true;
    if (!actorIsSuper) throw AppError.forbidden('Only a super admin can change admin permissions');
    const user = await repo.findById(userId);
    if (!user || user.deletedAt) throw AppError.notFound('User not found');
    if (user.role !== Role.ADMIN) throw AppError.badRequest('Permissions can only be assigned to admin accounts');
    if (userId === actorId && isSuperAdminValue === false) {
      throw AppError.badRequest('You cannot remove your own super admin access');
    }
    const safePermissions = [...new Set(permissions.filter(isAdminPermission))];
    if (isSuperAdminValue !== true && safePermissions.length === 0) {
      throw AppError.badRequest('Restricted admins must have at least one permission');
    }
    const updated = await repo.update(userId, {
      permissions: safePermissions,
      ...(isSuperAdminValue !== undefined ? { isSuperAdmin: isSuperAdminValue } : {}),
    });
    await auditLog({
      actorId,
      action: AuditAction.USER_UPDATED,
      entity: 'UserPermission',
      entityId: userId,
      metadata: { permissions: safePermissions, isSuperAdmin: isSuperAdminValue },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return updated;
  }

  async getUsers(req: Request) {
    const { page, limit, skip, sortBy, sortOrder } = getPaginationOptions(req);
    const { role, status, search, profileMissing } = req.query;

    const where: Record<string, unknown> = {};

    if (role) where.role = role as Role;
    if (status) where.status = status as UserStatus;
    if (profileMissing === 'true' && role === Role.STUDENT) where.studentProfile = { is: null };
    if (profileMissing === 'true' && role === Role.TEACHER) where.teacherProfile = { is: null };
    if (profileMissing === 'true' && role === Role.PARENT) where.parentProfile = { is: null };
    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const { users, total } = await repo.findMany({
      skip,
      take: limit,
      where,
      orderBy: { [sortBy]: sortOrder },
    });

    return {
      data: users,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getUserById(id: string) {
    const user = await repo.findById(id);
    if (!user || user.deletedAt) throw AppError.notFound('User not found');
    return user;
  }

  async updateUser(id: string, data: Partial<{
    firstName: string;
    lastName: string;
    phone: string;
  }>, actorId: string, req: Request) {
    const user = await repo.findById(id);
    if (!user || user.deletedAt) throw AppError.notFound('User not found');
    await this.assertCanManageTarget(actorId, user);

    const safeData = {
      ...(data.firstName !== undefined ? { firstName: data.firstName.trim() } : {}),
      ...(data.lastName !== undefined ? { lastName: data.lastName.trim() } : {}),
      ...(data.phone !== undefined ? { phone: data.phone.trim() } : {}),
    };
    const updated = await repo.update(id, safeData);

    await auditLog({
      actorId,
      action: AuditAction.USER_UPDATED,
      entity: 'User',
      entityId: id,
      metadata: safeData,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    await cacheDelPattern(`analytics:*`);
    return updated;
  }

  async uploadAvatar(userId: string, file: Express.Multer.File, actorId: string) {
    const user = await repo.findById(userId);
    if (!user || user.deletedAt) throw AppError.notFound('User not found');

    // Delete old avatar
    if (user.studentProfile) {
      // attached via user model
    }
    // Would need to fetch avatarPublicId — simplified here
    const { url, publicId } = await uploadToCloudinary(file.buffer, 'avatars', 'image');

    await repo.update(userId, { avatarUrl: url, avatarPublicId: publicId });

    await auditLog({
      actorId,
      action: AuditAction.FILE_UPLOADED,
      entity: 'User',
      entityId: userId,
      metadata: { type: 'avatar', publicId },
    });

    return { avatarUrl: url };
  }

  async changeUserRole(userId: string, role: Role, actorId: string, req: Request) {
    const user = await repo.findById(userId);
    if (!user || user.deletedAt) throw AppError.notFound('User not found');
    const actorIsSuper = await this.assertCanManageTarget(actorId, user);
    if (userId === actorId) throw AppError.badRequest('You cannot change your own role');
    if (role === Role.ADMIN && !actorIsSuper) throw AppError.forbidden('Only a super admin can assign the admin role');

    const updated = await repo.update(userId, { role });

    await auditLog({
      actorId,
      action: AuditAction.ROLE_CHANGED,
      entity: 'User',
      entityId: userId,
      metadata: { oldRole: user.role, newRole: role },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return updated;
  }

  async setUserStatus(userId: string, status: UserStatus, actorId: string, req: Request) {
    const user = await repo.findById(userId);
    if (!user || user.deletedAt) throw AppError.notFound('User not found');
    await this.assertCanManageTarget(actorId, user);
    if (userId === actorId && status !== UserStatus.ACTIVE) {
      throw AppError.badRequest('You cannot deactivate or suspend your own account');
    }
    if (status === UserStatus.ACTIVE && !user.isEmailVerified) {
      throw AppError.badRequest('Unverified accounts must activate through an administrator invitation');
    }

    const updated = await repo.update(userId, { status });
    if (status !== UserStatus.ACTIVE) {
      await prisma.session.updateMany({ where: { userId }, data: { isValid: false } });
    }

    await auditLog({
      actorId,
      action: AuditAction.USER_UPDATED,
      entity: 'User',
      entityId: userId,
      metadata: { status },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return updated;
  }

  async deleteUser(userId: string, actorId: string, req: Request) {
    const user = await repo.findById(userId);
    if (!user || user.deletedAt) throw AppError.notFound('User not found');
    await this.assertCanManageTarget(actorId, user);
    if (userId === actorId) throw AppError.badRequest('You cannot delete your own account');

    await repo.softDelete(userId);

    await auditLog({
      actorId,
      action: AuditAction.USER_DELETED,
      entity: 'User',
      entityId: userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  async restoreUser(userId: string, actorId: string, req: Request) {
    const user = await repo.findById(userId);
    if (!user) throw AppError.notFound('User not found');
    if (!user.deletedAt) throw AppError.badRequest('User is not deleted');
    await this.assertCanManageTarget(actorId, user);

    await repo.restore(userId);

    await auditLog({
      actorId,
      action: AuditAction.USER_RESTORED,
      entity: 'User',
      entityId: userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
