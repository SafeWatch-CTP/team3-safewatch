// Seed script: creates the demo user and starter data.
// Safe to re-run once the data model exists.
// Run via: pnpm db:seed

import { prisma } from "@project/db";

// A fixture user for local work and the starter rows below. Nothing hands it
// out any more: currentUserId() reads the Auth.js session, so a signed-in
// GitHub account owns its own rows and will not see this user's.
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
