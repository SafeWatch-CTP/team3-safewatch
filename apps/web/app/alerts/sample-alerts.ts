/**
 * PLACEHOLDER DATA FOR THE ALERTS FEED
 *
 * These rows stand in for the query that will serve /alerts for real
 * (`AlertLog where userId = <current user>` joined to its parent `Alert` —
 * see packages/db/prisma/schema/alerts.prisma). The feed components are
 * written against AlertFeedItem and nothing else, so landing the real query
 * means changing one import in page.tsx and deleting this file.
 *
 * FEED_NOW is a fixed instant, not Date.now(), on purpose: the relative
 * timestamps ("12m ago") are rendered on the server and hydrated on the
 * client, and a clock that moved between the two renders different text in
 * each, which React reports as a hydration mismatch. A real feed has the same
 * problem and solves it with the row's own timestamp; fake data solves it by
 * standing still.
 */

// Mirrors the AlertSeverity enum in alerts.prisma. Declared locally rather
// than imported from @project/db so the client bundle never pulls in Prisma.
export type AlertSeverity = "EMERGENCY" | "CRITICAL" | "WARNING" | "INFO";

/**
 * What kind of emergency the alert is about — the pill on each row.
 *
 * Mirrors the IncidentCategory enum in incident.prisma, which is where this
 * comes from once alerts are read for real: an alert's type is its incident's
 * category. SOS is the one value with no incident behind it, because an SOS
 * alert is raised by the user rather than by a reported event.
 */
export type AlertType =
    | "SOS"
    | "CRIME"
    | "FIRE"
    | "MEDICAL"
    | "SEVERE_WEATHER"
    | "TRAFFIC_HAZARD"
    | "CIVIL_UNREST"
    | "OTHER";

export type AlertFeedItem = {
    id: string;
    title: string;
    body: string;
    /** Drives the row's glow. */
    severity: AlertSeverity;
    /** Shown in the pill. */
    type: AlertType;
    /** ISO 8601. When this alert reached the user — AlertLog.sentAt. */
    receivedAt: string;
};

export const FEED_NOW = new Date("2026-11-10T18:42:00.000Z");

const minutesAgo = (minutes: number) =>
    new Date(FEED_NOW.getTime() - minutes * 60_000).toISOString();

const hoursAgo = (hours: number) => minutesAgo(hours * 60);
const daysAgo = (days: number) => hoursAgo(days * 24);

// Newest first, the order the feed renders in.
export const SAMPLE_ALERTS: AlertFeedItem[] = [
    {
        id: "alert-sample-01",
        title: "SOS sent to your contacts",
        body: "Your SOS reached 3 emergency contacts with your last known location on Amsterdam Ave.",
        severity: "EMERGENCY",
        type: "SOS",
        receivedAt: minutesAgo(8),
    },
    {
        id: "alert-sample-02",
        title: "Armed robbery reported nearby",
        body: "Reported 0.3 mi away near W 110th St & Broadway. Police on scene. Avoid the area until cleared.",
        severity: "CRITICAL",
        type: "CRIME",
        receivedAt: minutesAgo(41),
    },
    {
        id: "alert-sample-03",
        title: "Structure fire on your route",
        body: "FDNY working a 2nd-alarm fire at 2850 Broadway. Expect smoke and closed sidewalks for several hours.",
        severity: "CRITICAL",
        type: "FIRE",
        receivedAt: hoursAgo(3),
    },
    {
        id: "alert-sample-04",
        title: "Flash flood warning until 11 PM",
        body: "Heavy rain across Manhattan. Streets and underpasses may flood quickly — do not drive through standing water.",
        severity: "WARNING",
        type: "SEVERE_WEATHER",
        receivedAt: hoursAgo(7),
    },
    {
        id: "alert-sample-05",
        title: "Protest march closing Broadway",
        body: "Rolling street closures between W 96th and W 125th St this evening. Expect detours and heavy foot traffic.",
        severity: "INFO",
        type: "CIVIL_UNREST",
        receivedAt: hoursAgo(21),
    },
    {
        id: "alert-sample-06",
        title: "Traffic hazard cleared",
        body: "The multi-vehicle collision on Henry Hudson Pkwy at W 96th St has been cleared. Lanes are open.",
        severity: "INFO",
        type: "TRAFFIC_HAZARD",
        receivedAt: daysAgo(2),
    },
    {
        id: "alert-sample-07",
        title: "Assault reported on campus",
        body: "Reported near Pupin Hall around 11:40 PM. Public Safety is investigating and asks for witnesses.",
        severity: "WARNING",
        type: "CRIME",
        receivedAt: daysAgo(3),
    },
    {
        id: "alert-sample-08",
        title: "Power outage in your area",
        body: "Con Edison reports roughly 1,200 customers without power between W 103rd and W 116th St. Traffic signals may be dark.",
        severity: "WARNING",
        type: "OTHER",
        receivedAt: daysAgo(5),
    },
    {
        id: "alert-sample-09",
        title: "Ambulance staging on W 112th St",
        body: "FDNY EMS is working a medical call mid-block. The south sidewalk is closed while crews are on scene.",
        severity: "INFO",
        type: "MEDICAL",
        receivedAt: daysAgo(9),
    },
];
