const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const email = (process.argv[2] || '').toLowerCase().trim();
    const password = process.argv[3] || '';
    const name = process.argv[4] || 'Admin';
    const role = process.argv[5] || 'super_admin'; // super_admin | admin | user

    if (!email || !password) {
      console.log('Usage: node scripts/createUser.js <email> <password> [name] [role]');
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log('User already exists:', existing.email);
      return;
    }

    const created = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        globalRole: role,
        active: true,
      },
      select: { id: true, email: true, name: true, globalRole: true, active: true },
    });

    console.log('Created user:', created);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

