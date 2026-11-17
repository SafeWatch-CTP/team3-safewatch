import {
  prisma,
  AlertSeverity,
  AlertLifecycleStatus,
  TargetAudience,
  DeliveryChannel,
  DeliveryStatus,
} from "@project/db";
import {
  ALERT_FEED_WINDOW_DAYS,
  NoEmergencyContactsError,
  type AlertFeedQuery,
  type AlertLogUpdateInput,
  type TriggerSosAlertInput,
} from "../zod_schemas/alerts";

export async function triggerSosAlert(userId: string, input: TriggerSosAlertInput) {
  return prisma.$transaction(async (tx) => {
    const contacts = await tx.emergencyContact.findMany({
      where: { userId },
      select: { id: true },
    });

    if (contacts.length === 0) {
      throw new NoEmergencyContactsError();
    }

    const coordinates = `${input.latitude}, ${input.longitude}`;
    const body = [
      `SOS triggered. Last known location: ${coordinates}`,
      `https://maps.google.com/?q=${input.latitude},${input.longitude}`,
      input.message,
    ]
      .filter(Boolean)
      .join("\n");

    return tx.alert.create({
      data: {
        title: "SOS alert",
        body,
        status: AlertLifecycleStatus.ACTIVE,
        severity: AlertSeverity.EMERGENCY,
        audience: TargetAudience.EMERGENCY_CONTACTS,
        logs: {
          create: contacts.map((contact) => ({
            emergencyContactId: contact.id,
            channel: DeliveryChannel.SMS,
            status: DeliveryStatus.PENDING,
          })),
        },
      },
      include: {
        logs: {
          select: { id: true, emergencyContactId: true, channel: true, status: true },
        },
      },
    });
  });
}

/**
 * THE ALERT FEED
 *
 * One user's own alerts, newest first — the rows behind /alerts and
 * GET /api/v1/alerts. See docs/specs/alerts/alert-feed.md.
 */

/**
 * Mirrors AlertSeverity in the schema, as string literals rather than the
 * Prisma enum: this type crosses into client components, and importing the
 * enum would pull Prisma into the browser bundle.
 */
export type AlertFeedSeverity = "EMERGENCY" | "CRITICAL" | "WARNING" | "INFO";

/** Mirrors IncidentCategory, plus SOS, which has no incident behind it. */
export type AlertFeedType =
  | "SOS"
  | "CRIME"
  | "FIRE"
  | "MEDICAL"
  | "SEVERE_WEATHER"
  | "TRAFFIC_HAZARD"
  | "CIVIL_UNREST"
  | "OTHER";

export type AlertFeedItem = {
  /** The AlertLog id — what a cursor and a PATCH address, not the Alert id. */
  id: string;
  title: string;
  body: string;
  severity: AlertFeedSeverity;
  type: AlertFeedType;
  /** ISO 8601. AlertLog.sentAt: when this alert reached this user. */
  receivedAt: string;
  /** False once the user has marked it read. Drives the unread dot. */
  unread: boolean;
};

export type AlertFeedPage = {
  alerts: AlertFeedItem[];
  /** The id to resume from, or null when the window holds nothing older. */
  nextCursor: string | null;
};

/** Thrown when a cursor or a log id is not one of this user's rows. */
export class AlertLogNotFoundError extends Error {
  readonly code = "NOT_FOUND";

  constructor() {
    super("Alert not found.");
  }
}

/**
 * An alert's type is its incident's category. An SOS has no incident, so it
 * falls back on who the alert was aimed at.
 */
const FEED_TYPES = new Set<string>([
  "CRIME",
  "FIRE",
  "MEDICAL",
  "SEVERE_WEATHER",
  "TRAFFIC_HAZARD",
  "CIVIL_UNREST",
  "OTHER",
]);

function feedType(
  incidentCategory: string | null | undefined,
  audience: TargetAudience,
): AlertFeedType {
  // UNCATEGORIZED is a category the feed has no glyph for, so it reads as
  // OTHER rather than rendering an empty icon.
  if (incidentCategory && FEED_TYPES.has(incidentCategory)) {
    return incidentCategory as AlertFeedType;
  }

  if (incidentCategory) return "OTHER";

  return audience === TargetAudience.EMERGENCY_CONTACTS ? "SOS" : "OTHER";
}

/**
 * The current user's undismissed alerts inside the window, newest first.
 *
 * Scoped by `userId` on every read — the caller passes the id from the
 * identity seam and nothing here trusts an id from a request. Paging is
 * keyset, not offset: the cursor row is looked up first (and has to belong to
 * this user, or it is a 404), and the page is everything strictly older than
 * it. An alert arriving between two pages therefore cannot shift the boundary.
 */
export async function listAlertFeed(
  userId: string,
  query: AlertFeedQuery,
): Promise<AlertFeedPage> {
  const cutoff = new Date(
    Date.now() - ALERT_FEED_WINDOW_DAYS[query.window] * 24 * 60 * 60 * 1000,
  );

  let before: { sentAt: Date; id: string } | undefined;

  if (query.cursor) {
    const cursorRow = await prisma.alertLog.findFirst({
      // userId in the filter, so another user's id is "not found" rather than
      // a readable position in their feed.
      where: { id: query.cursor, userId },
      select: { id: true, sentAt: true },
    });

    if (!cursorRow) throw new AlertLogNotFoundError();
    before = cursorRow;
  }

  const rows = await prisma.alertLog.findMany({
    where: {
      userId,
      dismissedAt: null,
      sentAt: { gte: cutoff },
      // Ties on sentAt are broken by id so that a page boundary never sits
      // inside a group of rows sharing a timestamp.
      ...(before
        ? {
            OR: [
              { sentAt: { lt: before.sentAt } },
              { sentAt: before.sentAt, id: { lt: before.id } },
            ],
          }
        : {}),
    },
    orderBy: [{ sentAt: "desc" }, { id: "desc" }],
    // One more than asked for: the extra row is how the caller knows another
    // page exists without a second count query.
    take: query.limit + 1,
    select: {
      id: true,
      sentAt: true,
      readAt: true,
      alert: {
        select: {
          title: true,
          body: true,
          severity: true,
          audience: true,
          incident: { select: { category: true } },
        },
      },
    },
  });

  const page = rows.slice(0, query.limit);

  return {
    alerts: page.map((row) => ({
      id: row.id,
      title: row.alert.title,
      body: row.alert.body,
      severity: row.alert.severity as AlertFeedSeverity,
      type: feedType(row.alert.incident?.category, row.alert.audience),
      receivedAt: row.sentAt.toISOString(),
      unread: row.readAt === null,
    })),
    nextCursor: rows.length > query.limit ? (page[page.length - 1]?.id ?? null) : null,
  };
}

/**
 * Marks one of the user's own alert logs read, dismissed, or both.
 *
 * updateMany rather than update: a missing or foreign id updates zero rows
 * instead of throwing, which is what makes a foreign id a 404 and not a 403.
 * Dismissing also marks read — an alert cannot be cleared without having been
 * seen, and leaving it unread would keep it counted as missed.
 */
export async function updateAlertLogState(
  userId: string,
  alertLogId: string,
  input: AlertLogUpdateInput,
): Promise<void> {
  const now = new Date();

  const { count } = await prisma.alertLog.updateMany({
    where: { id: alertLogId, userId },
    data: {
      ...(input.read || input.dismissed ? { readAt: now } : {}),
      ...(input.dismissed ? { dismissedAt: now } : {}),
    },
  });

  if (count === 0) throw new AlertLogNotFoundError();
}
