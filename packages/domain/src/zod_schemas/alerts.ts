import { z } from "zod";

export const triggerSosAlertSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  message: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export type TriggerSosAlertInput = z.infer<typeof triggerSosAlertSchema>;

// Thrown when the current user has no one to notify; the route maps it to 409.
export class NoEmergencyContactsError extends Error {
  readonly code = "NO_EMERGENCY_CONTACTS";

  constructor() {
    super("Add at least one emergency contact before triggering an SOS alert.");
  }
}

/**
 * The feed's query string: which window, how many rows, and where to resume.
 *
 * Coerced because these arrive as strings from a URL, and strict because a
 * window nobody recognises is a bug in the caller, not a reason to silently
 * serve the default (see docs/specs/alerts/alert-feed.md).
 */
export const alertFeedQuerySchema = z.object({
  window: z.enum(["24h", "7d"]).default("24h"),
  limit: z.coerce.number().int().min(1).max(50).default(5),
  cursor: z.string().min(1).optional(),
});

export type AlertFeedQuery = z.infer<typeof alertFeedQuerySchema>;

/** How many days back each window reaches. */
export const ALERT_FEED_WINDOW_DAYS: Record<AlertFeedQuery["window"], number> = {
  "24h": 1,
  "7d": 7,
};

/**
 * What a PATCH may change about one of the caller's own alert logs.
 *
 * Both flags are one-way: an alert can be marked read or dismissed, not unread
 * or undismissed. There is no screen for undoing either, and a schema that
 * accepts `false` would imply there is.
 */
export const alertLogUpdateSchema = z
  .object({
    read: z.literal(true).optional(),
    dismissed: z.literal(true).optional(),
  })
  .refine((value) => value.read || value.dismissed, {
    message: "Send read: true, dismissed: true, or both.",
  });

export type AlertLogUpdateInput = z.infer<typeof alertLogUpdateSchema>;
