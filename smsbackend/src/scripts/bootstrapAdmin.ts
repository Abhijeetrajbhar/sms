import { PrismaClient, Role, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { ADMIN_PERMISSIONS } from '../modules/admin/permissions';

const prisma = new PrismaClient();

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  if (arg) return arg.slice(prefix.length).trim();
  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1 && process.argv[index + 1]) {
    return process.argv[index + 1].trim();
  }
  return undefined;
}

async function main() {
  const email = getArg('email') || process.env.ADMIN_EMAIL;
  const password = getArg('password') || process.env.ADMIN_PASSWORD;
  const firstName = getArg('firstName') || 'System';
  const lastName = getArg('lastName') || 'Administrator';
  const schoolName = getArg('schoolName') || process.env.SCHOOL_NAME || 'CampusOryx Academy';

  if (!email || !password) {
    console.log(`
Usage:
  npm run admin:init -- --email=admin@yourdomain.com --password=YourStrongPassword123! [--firstName=John] [--lastName=Doe] [--schoolName="My School"]

Alternatively, set ADMIN_EMAIL and ADMIN_PASSWORD in your environment before running.
`);
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('❌ Password must be at least 8 characters long.');
    process.exit(1);
  }

  // Ensure default school exists
  let school = await prisma.school.findFirst({ where: { status: 'ACTIVE' } });
  if (!school) {
    const slug = schoolName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'main-school';
    school = await prisma.school.create({
      data: {
        slug,
        name: schoolName,
        domain: 'school.local',
        timezone: 'Asia/Kolkata',
        currency: 'INR',
        status: 'ACTIVE',
      },
    });
    console.log(`✓ Initialized School record: "${school.name}"`);
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    console.error(`❌ User with email "${email}" already exists.`);
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const admin = await prisma.user.create({
    data: {
      schoolId: school.id,
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
      isSuperAdmin: true,
      permissions: [...ADMIN_PERMISSIONS],
    },
  });

  console.log(`
🎉 Initial Super Admin account created successfully!
  • School:       ${school.name}
  • Admin Email:  ${admin.email}
  • Name:         ${admin.firstName} ${admin.lastName}
  • Role:         ${admin.role} (Super Administrator)
  • Status:       ${admin.status}
`);
}

main()
  .catch((err) => {
    console.error('Fatal initialization error:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
