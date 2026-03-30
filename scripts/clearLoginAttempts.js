const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const emailArg = process.argv[2];
    const ipArg = process.argv[3];

    const where = {};
    if (emailArg) where.email = String(emailArg).toLowerCase().trim();
    if (ipArg) where.ipAddress = String(ipArg).trim();
    where.success = false;

    const res = await prisma.loginAttempt.deleteMany({ where });
    console.log('Deleted failed login attempts:', res.count);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

