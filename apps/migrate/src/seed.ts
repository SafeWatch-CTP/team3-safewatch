// Seed script: creates the demo user and starter data.
// Safe to re-run once the data model exists.
// Run via: pnpm db:seed

import { prisma } from "@project/db";

// Matches the FALLBACK id in @project/auth's dev identity stub, so the user
// handed out by currentUserId() exists before anyone can log in (week 8).
const DEMO_USER_ID = "demo-user";

async function main() {
  const user = await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    update: {},
    create: {
      id: DEMO_USER_ID,
      email: "demo@safewatch.local",
      phoneNumber: "5555550100",
      password: "dev-placeholder-not-a-real-hash",
    },
  });

  console.log(`seed: demo user ready (${user.id})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
