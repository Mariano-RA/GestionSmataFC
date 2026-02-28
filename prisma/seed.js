const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Create default config
  await prisma.config.deleteMany({});
  
  await prisma.config.create({
    data: {
      key: 'monthlyTarget',
      value: '1510000'
    }
  });

  await prisma.config.create({
    data: {
      key: 'fieldRental',
      value: '310000'
    }
  });

  await prisma.config.create({
    data: {
      key: 'maxParticipants',
      value: '25'
    }
  });

  await prisma.config.create({
    data: {
      key: 'notes',
      value: ''
    }
  });

  console.log('✓ Database seeded with default config');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
