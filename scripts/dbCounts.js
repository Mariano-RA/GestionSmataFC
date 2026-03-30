const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const [
      users,
      teams,
      userTeams,
      participants,
      payments,
      expenses,
      configs,
      monthlyConfigs,
      monthlyStatuses,
      loginAttempts,
      auditLogs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.team.count(),
      prisma.userTeam.count(),
      prisma.participant.count(),
      prisma.payment.count(),
      prisma.expense.count(),
      prisma.config.count(),
      prisma.monthlyConfig.count(),
      prisma.participantMonthlyStatus.count(),
      prisma.loginAttempt.count(),
      prisma.auditLog.count(),
    ]);

    console.table({
      users,
      teams,
      userTeams,
      participants,
      payments,
      expenses,
      configs,
      monthlyConfigs,
      monthlyStatuses,
      loginAttempts,
      auditLogs,
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

