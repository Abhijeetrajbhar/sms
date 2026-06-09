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
    return prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: UserStatus.INACTIVE },
    });
  }

  async restore(id: string) {
    return prisma.user.update({
      where: { id },
      data: { deletedAt: null, status: UserStatus.ACTIVE },
    });
  }

  async countByRole() {
    return prisma.user.groupBy({
      by: ['role'],
      where: { deletedAt: null },
      _count: true,
    });
  }
}
