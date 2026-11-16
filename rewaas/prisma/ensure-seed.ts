/**
 * Runs during the Vercel build: seeds the demo store only when the database is empty,
 * so later deploys never overwrite real products or orders.
 */
import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";

(async () => {
  const db = new PrismaClient();
  const [categories, admins] = await Promise.all([db.category.count(), db.user.count({ where: { role: "ADMIN" } })]);
  await db.$disconnect();
  if (categories === 0 && admins === 0) {
    console.log("Empty database — seeding the REWAAS demo store…");
    execSync("tsx prisma/seed.ts", { stdio: "inherit" });
  } else {
    console.log(`Database already has data (${categories} categories) — skipping seed.`);
  }
})().catch((e) => { console.error(e); process.exit(1); });
