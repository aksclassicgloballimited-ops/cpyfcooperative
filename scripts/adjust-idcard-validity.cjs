// One-time: ID cards issued while validity was 3 years are shortened to 2 years. Idempotent via an audit event per card.
const { PrismaClient } = require("@prisma/client");

const CUTOFF = new Date("2026-11-01T11:15:00Z");
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } } });

async function run() {
  const cards = await prisma.idCard.findMany({ where: { createdAt: { lt: CUTOFF } } });
  let adjusted = 0;
  for (const card of cards) {
    const done = await prisma.idCardEvent.findFirst({ where: { cardId: card.id, action: "VALIDITY_ADJUSTED" } });
    if (done) continue;
    const expiryDate = new Date(card.expiryDate);
    const month = expiryDate.getUTCMonth();
    expiryDate.setUTCFullYear(expiryDate.getUTCFullYear() - 1);
    if (expiryDate.getUTCMonth() !== month) expiryDate.setUTCDate(0);
    await prisma.$transaction([
      prisma.idCard.update({ where: { id: card.id }, data: { expiryDate, status: card.status === "EXPIRED" && expiryDate > new Date() ? "ACTIVE" : card.status } }),
      prisma.idCardEvent.create({ data: { cardId: card.id, userId: card.userId, action: "VALIDITY_ADJUSTED", reason: "Card validity changed from 3 years to 2 years", expiryDate } }),
    ]);
    adjusted += 1;
  }
  if (adjusted) console.log(`Adjusted ${adjusted} ID card(s) to the 2-year validity.`);
}

run()
  .catch((error) => {
    // Never block a deployment on this data fix; it retries on the next build.
    console.error("ID card validity adjustment skipped.", error);
  })
  .finally(() => prisma.$disconnect());
