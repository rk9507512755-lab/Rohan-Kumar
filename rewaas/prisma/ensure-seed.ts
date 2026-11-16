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
    if (!process.env.SEED_ADMIN_EMAIL || !process.env.SEED_ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD.length < 10) {
      throw new Error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (10+ characters) in the environment before the first deploy.");
    }
    console.log("Empty database — creating the REWAAS catalogue (no demo reviews, customers or orders)…");
    execSync("tsx prisma/seed.ts", { stdio: "inherit", env: { ...process.env, SEED_DEMO_DATA: process.env.SEED_DEMO_DATA ?? "false" } });
  } else {
    console.log(`Database already has data (${categories} categories) — skipping seed.`);
  }
})().catch((e) => { console.error(e); process.exit(1); });
