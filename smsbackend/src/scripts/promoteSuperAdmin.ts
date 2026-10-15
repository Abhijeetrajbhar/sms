import { PrismaClient, Role } from '@prisma/client';
import { ADMIN_PERMISSIONS } from '../modules/admin/permissions';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) throw new Error('Usage: npm run admin:promote -- admin@example.com');

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.deletedAt) throw new Error(`Active user not found: ${email}`);
  if (user.role !== Role.ADMIN) throw new Error(`User is not an admin: ${email}`);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isSuperAdmin: true,
      permissions: [...ADMIN_PERMISSIONS],
      status: 'ACTIVE',
    },
  });

  await prisma.session.updateMany({
    where: { userId: user.id },
    data: { isValid: false },
  });

  console.log(`Super admin access restored for ${email}. Sign in again.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
