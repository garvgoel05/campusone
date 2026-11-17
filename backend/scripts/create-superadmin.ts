import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const [name, email, password] = process.argv.slice(2);
  if (!name || !email || !password) {
    console.error('Usage: npm run create-superadmin -- "Full Name" email password');
    process.exitCode = 1;
    return;
  }
  const e = email.trim().toLowerCase();
  if (await prisma.user.findUnique({ where: { email: e } })) {
    console.error(`${e} already exists. Use make-superadmin instead.`);
    process.exitCode = 1;
    return;
  }
  await prisma.user.create({ data: { name, email: e, passwordHash: await bcrypt.hash(password, 10), role: 'SUPERADMIN' } });
  console.log(`Created super admin ${name} (${e}).`);
}

main().finally(() => prisma.$disconnect());

