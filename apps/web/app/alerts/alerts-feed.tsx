/**
 * THE ALERTS FEED LIST
 *
 * Takes the alerts it should show and renders them. Picking the time window,
 * paging and loading data are the caller's job (alerts-panel.tsx), so this
 * can be reused for the short alerts strip on the home page.
 *
 * Rows use the same card as the contacts list so the two screens match. The
 * pill says the emergency type; the color says the severity.
 */

import {AlertTypeIcon} from './alert-type-icon';
import type {AlertFeedItem, AlertSeverity, AlertType} from './sample-alerts';

/**
 * One color per severity, from the `--color-alert-*` tokens in globals.css.
 * Colour is used for the badge fill, the card border and the glow, never for
 * text, so a pale hue never has to carry something a reader must read.
 */
const SEVERITY_GLOW: Record<AlertSeverity, {card: string; badge: string}> = {
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
const typeLabel = (type: AlertType) => type.replace(/_/g, " ");

/**
 * "12m ago" / "3h ago" / "2d ago", measured against the instant the caller
 * passes in. The caller owns `now` so that a server render and its hydration
 * agree on what time it is.
 */
export function relativeTime(receivedAt: string, now: Date): string {
    const minutes = Math.floor((now.getTime() - new Date(receivedAt).getTime()) / 60_000);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}h ago`;
    return `${Math.floor(minutes / (60 * 24))}d ago`;
}

export function AlertsFeed({alerts, now, emptyMessage}: {
    alerts: AlertFeedItem[];
    now: Date;
    emptyMessage: string;
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
                        className={`flex min-h-[72px] items-start gap-1 rounded-2xl border bg-surface/70 px-3 py-3 text-fg backdrop-blur-md ${glow.card}`}
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
                                <p className="min-w-0 break-words text-base leading-[1.3]">{alert.title}</p>
                                <span className="ml-auto mt-0.5 shrink-0 rounded-full border border-accent/30 bg-accent/15 px-2 py-0.5 text-center text-[10px] font-semibold uppercase leading-[1.4] tracking-wide text-accent-deep">
                                    {typeLabel(alert.type)}
                                </span>
                            </div>

                            <p className="mt-0.5 text-[13px] leading-[1.45] text-muted">{alert.body}</p>

                            {/* tabular-nums so the column of times doesn't shuffle as digits change. */}
                            <time
                                dateTime={alert.receivedAt}
                                className="mt-1 block text-[11px] tabular-nums tracking-wide text-muted/80"
                            >
                                {relativeTime(alert.receivedAt, now)}
                            </time>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}
