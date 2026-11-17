/**
 * THE ALERTS FEED LIST
 *
 * Takes the alerts it should show and renders them. Picking the time window,
 * paging and loading data are the caller's job (alerts-panel.tsx), so this
 * can be reused for the short alerts strip on the home page.
 *
 * Rows use the same card as the contacts list so the two screens match. The
 * pill says the emergency type; the color says the severity.
 *
 * A row carries two controls — Mark read and Dismiss — and the caller owns
 * what they do, so this file stays free of fetching. Marking read keeps the
 * row and drops its dot; dismissing takes the row out of the feed.
 *
 * `now` is the server's render instant and is passed straight through to
 * RelativeTime, which owns the "8m ago" label and keeps it current.
 *
 * The row is opaque: one glass layer per view, and the panel it sits in is
 * already the glass. Stacking translucency desaturated the severity colors.
 */

import type {AlertFeedItem, AlertFeedSeverity, AlertFeedType} from '@project/domain';
import {AlertTypeIcon} from './alert-type-icon';
import {RelativeTime} from './relative-time-label';

/**
 * One color per severity, from the `--color-alert-*` tokens in globals.css.
 * Colour is used for the badge fill, the card border and the glow, never for
 * text, so a pale hue never has to carry something a reader must read.
 */
const SEVERITY_GLOW: Record<AlertFeedSeverity, {card: string; badge: string}> = {
    EMERGENCY: {
        card: "border-alert-emergency/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_4px_16px_-4px_var(--color-alert-emergency)]",
        badge: "bg-alert-emergency",
    },
    CRITICAL: {
        card: "border-alert-critical/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_4px_16px_-4px_var(--color-alert-critical)]",
        badge: "bg-alert-critical",
    },
    WARNING: {
        card: "border-alert-warning/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_4px_16px_-4px_var(--color-alert-warning)]",
        badge: "bg-alert-warning",
    },
    INFO: {
        card: "border-alert-info/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_4px_16px_-4px_var(--color-alert-info)]",
        badge: "bg-alert-info",
    },
};

// SEVERE_WEATHER reads as "SEVERE WEATHER" in the pill, which is already
// uppercased by its own styling.
const typeLabel = (type: AlertFeedType) => type.replace(/_/g, " ");

export function AlertsFeed({alerts, now, emptyMessage, onRead, onDismiss}: {
    alerts: AlertFeedItem[];
    now: Date;
    emptyMessage: string;
    /** Marks one alert seen; it stays in the list without its dot. */
    onRead: (id: string) => void;
    /** Clears one alert out of the feed. */
    onDismiss: (id: string) => void;
}) {
    if (alerts.length === 0) {
        return <p className="text-sm text-muted">{emptyMessage}</p>;
    }

    return (
        <ul className="space-y-3">
            {alerts.map((alert) => {
                const glow = SEVERITY_GLOW[alert.severity];

                return (
                    <li
                        key={alert.id}
                        className={`flex min-h-[72px] items-start gap-1 rounded-2xl border bg-surface px-3 py-3 text-fg ${glow.card}`}
                    >
                        <span className={`grid size-10 shrink-0 place-items-center rounded-full text-accent-deep ${glow.badge}`}>
                            <AlertTypeIcon type={alert.type} />
                            {/* Severity is otherwise carried by color alone. */}
                            <span className="sr-only">{alert.severity}</span>
                        </span>

                        {/* The body sits in this column too, so it lines up with
                            the title rather than with the badge. */}
                        <div className="min-w-0 flex-1 pl-2.5 text-left">
                            <div className="flex items-start gap-1.5">
                                {alert.unread && (
                                    // The dot is decoration; the row's label
                                    // below says "unread" in words.
                                    <span aria-hidden="true" className="mt-[0.45rem] size-1.5 shrink-0 rounded-full bg-accent" />
                                )}
                                <p className="min-w-0 break-words text-base leading-[1.3]">{alert.title}</p>
                                <span className="ml-auto mt-0.5 shrink-0 rounded-full border border-accent/30 bg-accent/15 px-2 py-0.5 text-center text-[10px] font-semibold uppercase leading-[1.4] tracking-wide text-accent-deep">
                                    {typeLabel(alert.type)}
                                </span>
                            </div>

                            <p className="mt-0.5 text-[13px] leading-[1.45] text-muted">{alert.body}</p>

                            {/* tabular-nums so the column of times doesn't shuffle as digits change. */}
                            <div className="mt-1 flex items-center gap-3">
                                <RelativeTime
                                    receivedAt={alert.receivedAt}
                                    now={now}
                                    className="text-[11px] tabular-nums tracking-wide text-muted/80"
                                />

                                {/* Both controls name their alert, because
                                    "Dismiss" repeated down a list tells a
                                    screen reader nothing about which one. */}
                                {alert.unread && (
                                    <button
                                        type="button"
                                        onClick={() => onRead(alert.id)}
                                        aria-label={`Mark "${alert.title}" read`}
                                        className="rounded-full px-2 py-0.5 text-[11px] font-medium text-accent transition-colors hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                                    >
                                        Mark read
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => onDismiss(alert.id)}
                                    aria-label={`Dismiss "${alert.title}"`}
                                    className="ml-auto rounded-full px-2 py-0.5 text-[11px] font-medium text-muted transition-colors hover:bg-tint hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}
