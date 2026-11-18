import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const [emailArg, previousEmailArg] = args;
  if (!emailArg || args.length > 2) {
    console.error('Usage: npm run make-superadmin -- <existing-account-email> [previous-superadmin-email]');
    process.exitCode = 1;
    return;
  }

  const email = emailArg.trim().toLowerCase();
  const previousEmail = previousEmailArg?.trim().toLowerCase();
  if (previousEmail && previousEmail === email) {
    console.error('The target and previous Super Admin accounts must be different.');
    process.exitCode = 1;
    return;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { email }, select: { id: true, name: true, role: true } });
      if (!user) throw new Error(`No user with the email ${email}. Create the account first.`);

      let previous = null;
      if (previousEmail) {
        previous = await tx.user.findUnique({ where: { email: previousEmail }, select: { id: true, name: true, role: true } });
        if (!previous) throw new Error(`No previous Super Admin with the email ${previousEmail}. No changes made.`);
        if (previous.role !== 'SUPERADMIN') throw new Error(`${previousEmail} is not currently a SUPERADMIN. No changes made.`);
        await tx.user.update({ where: { id: previous.id }, data: { role: 'ADMIN' } });
      }

      const promoted = user.role === 'SUPERADMIN'
        ? user
        : await tx.user.update({ where: { id: user.id }, data: { role: 'SUPERADMIN' }, select: { id: true, name: true, role: true } });

      return { promoted, demoted: previous };
    });

    console.log(`${result.promoted.name} (${email}) is now a SUPERADMIN.`);
    if (result.demoted) console.log(`${result.demoted.name} (${previousEmail}) is now an ADMIN.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

main().finally(() => prisma.$disconnect());
