// Seed script: creates the demo user and starter data.
// Safe to re-run once the data model exists.
// Run via: pnpm db:seed

import { prisma } from "@project/db";

// A fixture user for local work and the starter rows below. Nothing hands it
// out any more: currentUserId() reads the Auth.js session, so a signed-in
// GitHub account owns its own rows and will not see this user's.
const DEMO_USER_ID = "demo-user";

// Marks the incidents this script owns, so a re-run reuses them instead of
// piling duplicate pins onto the map.
const SEED_SOURCE = "SEED";

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

  await seedAlertFeed();
}

/**
 * Gives every user in the database a feed to look at.
 *
 * Every user, not just the demo one: currentUserId() reads the Auth.js
 * session, so a developer signed in with GitHub owns rows under their own id
 * and would otherwise open /alerts to an empty screen. Nothing else writes an
 * AlertLog addressed to a user yet — trigger-sos writes logs for emergency
 * contacts, and no worker delivers anything — so without this the finished
 * feed is indistinguishable from a broken one.
 *
 * Users who already have alert logs are skipped, so this is safe to re-run.
 */
async function seedAlertFeed() {
  const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);
  const hoursAgo = (hours: number) => minutesAgo(hours * 60);
  const daysAgo = (days: number) => hoursAgo(days * 24);

  // Spread across both windows on purpose: five inside 24 hours, three more
  // inside 7 days, and one outside both so the window drill has something to
  // prove.
  const rows = [
    {category: "CRIME", severity: "CRITICAL", title: "Armed robbery reported nearby",
     body: "Reported 0.3 mi away near W 110th St & Broadway. Police on scene. Avoid the area until cleared.",
     at: minutesAgo(8), read: false,
     lat: 40.8035, lng: -73.9665, address: "W 110th St & Broadway"},
    {category: "FIRE", severity: "CRITICAL", title: "Structure fire on your route",
     body: "FDNY working a 2nd-alarm fire at 2850 Broadway. Expect smoke and closed sidewalks for several hours.",
     at: minutesAgo(41), read: false,
     lat: 40.8019, lng: -73.9674, address: "2850 Broadway"},
    {category: "SEVERE_WEATHER", severity: "WARNING", title: "Flash flood warning until 11 PM",
     body: "Heavy rain across Manhattan. Streets and underpasses may flood quickly - do not drive through standing water.",
     at: hoursAgo(3), read: false,
     lat: 40.809, lng: -73.96, address: "Morningside Heights"},
    {category: "TRAFFIC_HAZARD", severity: "INFO", title: "Traffic hazard cleared",
     body: "The multi-vehicle collision on Henry Hudson Pkwy at W 96th St has been cleared. Lanes are open.",
     at: hoursAgo(7), read: true,
     lat: 40.795, lng: -73.972, address: "Henry Hudson Pkwy at W 96th St"},
    {category: "CIVIL_UNREST", severity: "INFO", title: "Protest march closing Broadway",
     body: "Rolling street closures between W 96th and W 125th St this evening. Expect detours and heavy foot traffic.",
     at: hoursAgo(21), read: true,
     lat: 40.811, lng: -73.958, address: "Broadway at W 120th St"},
    {category: "CRIME", severity: "WARNING", title: "Assault reported on campus",
     body: "Reported near Pupin Hall around 11:40 PM. Public Safety is investigating and asks for witnesses.",
     at: daysAgo(2), read: false,
     lat: 40.8102, lng: -73.9615, address: "Pupin Hall, Columbia University"},
    {category: "MEDICAL", severity: "INFO", title: "Ambulance staging on W 112th St",
     body: "FDNY EMS is working a medical call mid-block. The south sidewalk is closed while crews are on scene.",
     at: daysAgo(3), read: true,
     lat: 40.8043, lng: -73.9637, address: "W 112th St"},
    {category: "OTHER", severity: "WARNING", title: "Power outage in your area",
     body: "Con Edison reports roughly 1,200 customers without power between W 103rd and W 116th St.",
     at: daysAgo(5), read: false,
     lat: 40.8004, lng: -73.9641, address: "W 103rd to W 116th St"},
    {category: "SEVERE_WEATHER", severity: "INFO", title: "Wind advisory ended",
     body: "The wind advisory for Manhattan has expired. Gusts are back under 20 mph.",
     at: daysAgo(9), read: true,
     lat: 40.8068, lng: -73.9699, address: "Riverside Dr at W 113th St"},
  ] as const;

  const users = await prisma.user.findMany({select: {id: true}});

  // One incident and one alert per event, shared by everyone. A fire is one
  // incident however many people are told about it, and only the AlertLog is
  // per user. Seeding an incident per user per alert also piles duplicate
  // pins on the map, which reads this same Incident table.
  const seeded = await prisma.alert.findMany({
    where: {incident: {source: SEED_SOURCE}},
    select: {id: true},
    orderBy: {createdAt: "asc"},
  });

  let alertIds = seeded.map((alert) => alert.id);

  if (alertIds.length === 0) {
    for (const row of rows) {
      const incident = await prisma.incident.create({
        data: {
          title: row.title,
          category: row.category,
          severity: row.severity === "CRITICAL" ? "HIGH" : row.severity === "WARNING" ? "MEDIUM" : "LOW",
          source: SEED_SOURCE,
          latitude: row.lat,
          longitude: row.lng,
          address: row.address,
        },
      });

      const alert = await prisma.alert.create({
        data: {
          title: row.title,
          body: row.body,
          severity: row.severity,
          audience: "GEOFENCED_ZONE",
          incidentId: incident.id,
        },
      });

      alertIds.push(alert.id);
    }

    console.log(`seed: ${rows.length} incidents and alerts created`);
  } else {
    console.log(`seed: reusing ${alertIds.length} seeded alerts`);
  }

  for (const {id: userId} of users) {
    const existing = await prisma.alertLog.count({where: {userId}});

    if (existing > 0) {
      console.log(`seed: ${userId} already has ${existing} alert logs - skipping`);
      continue;
    }

    await prisma.alertLog.createMany({
      data: rows.map((row, index) => ({
        alertId: alertIds[index]!,
        userId,
        channel: "IN_APP" as const,
        status: "DELIVERED" as const,
        sentAt: row.at,
        receivedAt: row.at,
        readAt: row.read ? row.at : null,
      })),
    });

    console.log(`seed: ${rows.length} alerts ready for ${userId}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
