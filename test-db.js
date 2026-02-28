const { PrismaClient } = require('@prisma/client');
(async () => {
  const db = new PrismaClient();
  try {
    const participants = await db.participant.findMany();
    console.log('participants count', participants.length);
  } catch (e) {
    console.error('error', e);
  } finally {
    await db.$disconnect();
  }
})();