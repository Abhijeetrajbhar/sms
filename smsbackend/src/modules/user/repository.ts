import prisma from '../../config/database';
import { Role, UserStatus } from '@prisma/client';

export class UserRepository {
  async findMany(params: {
    skip: number;
    take: number;
    where: Record<string, unknown>;
    orderBy: Record<string, string>;
  }) {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: { ...params.where, deletedAt: null },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          phone: true,
          avatarUrl: true,
          isEmailVerified: true,
          emailVerifyExpires: true,
          permissions: true,
          isSuperAdmin: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
        skip: params.skip,
        take: params.take,
        orderBy: params.orderBy as never,
      }),
      prisma.user.count({ where: { ...params.where, deletedAt: null } }),
    ]);
    return { users, total };
  }

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        phone: true,
        avatarUrl: true,
        isEmailVerified: true,
        emailVerifyExpires: true,
        permissions: true,
        isSuperAdmin: true,
        lastLoginAt: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        studentProfile: true,
        teacherProfile: true,
        parentProfile: true,
      },
    });
  }

  async update(id: string, data: Partial<{
    firstName: string;
    lastName: string;
    phone: string;
    avatarUrl: string;
    avatarPublicId: string;
    status: UserStatus;
    role: Role;
    permissions: string[];
    isSuperAdmin: boolean;
  }>) {
    return prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        phone: true,
        avatarUrl: true,
        permissions: true,
        isSuperAdmin: true,
        lastLoginAt: true,
      },
    });
  }

  async softDelete(id: string) {
    const deletedAt = new Date();
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: { deletedAt, status: UserStatus.INACTIVE },
      });
      await Promise.all([
        tx.studentProfile.updateMany({ where: { userId: id }, data: { deletedAt } }),
        tx.teacherProfile.updateMany({ where: { userId: id }, data: { deletedAt } }),
        tx.parentProfile.updateMany({ where: { userId: id }, data: { deletedAt } }),
        tx.session.updateMany({ where: { userId: id }, data: { isValid: false } }),
      ]);
      return user;
    });
  }

  async restore(id: string) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: { deletedAt: null, status: UserStatus.ACTIVE },
      });
      await Promise.all([
        tx.studentProfile.updateMany({ where: { userId: id }, data: { deletedAt: null } }),
        tx.teacherProfile.updateMany({ where: { userId: id }, data: { deletedAt: null } }),
        tx.parentProfile.updateMany({ where: { userId: id }, data: { deletedAt: null } }),
      ]);
      return user;
    });
  }
}
