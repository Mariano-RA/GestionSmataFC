const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, active: true, globalRole: true },
      orderBy: { id: 'asc' },
      take: 50,
    });
    console.table(users);
    console.log('Total users:', users.length);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

