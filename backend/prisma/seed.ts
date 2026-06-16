import 'dotenv/config';
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import { hashPassword } from '../src/auth/passwords';

const prisma = new PrismaClient();

async function main() {
  const username = process.env.MASTER_USERNAME ?? 'master';
  const password = process.env.MASTER_PASSWORD ?? 'change-me-master';

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return;
  }

  await prisma.user.create({
    data: {
      username,
      passwordHash: await hashPassword(password),
      role: UserRole.MASTER,
      status: UserStatus.ACTIVE,
      permissions: []
    }
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
