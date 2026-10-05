const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL },
  },
});

async function migrateAdminRoleToPresident() {
  const roleType = await prisma.$queryRaw`
    SELECT enumlabel
    FROM pg_enum
    WHERE enumtypid = to_regtype('"Role"')
  `;
  const roles = roleType.map(({ enumlabel }) => enumlabel);

  if (!roles.includes("ADMIN")) return;
  if (roles.includes("PRESIDENT")) {
    throw new Error('Both "ADMIN" and "PRESIDENT" exist in the database Role enum. Resolve the duplicate role before deploying.');
  }

  await prisma.$executeRaw`ALTER TYPE "Role" RENAME VALUE 'ADMIN' TO 'PRESIDENT'`;
  console.log('Renamed the database role "ADMIN" to "PRESIDENT".');
}

migrateAdminRoleToPresident()
  .catch((error) => {
    console.error("Unable to migrate the ADMIN role to PRESIDENT.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
