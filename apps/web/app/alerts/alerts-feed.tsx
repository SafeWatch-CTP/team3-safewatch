/**
 * THE ALERTS FEED LIST
 *
 * Presentational only: it is handed the alerts it should show and renders
 * them newest first. Windowing, paging and data loading belong to the caller
 * (alerts-panel.tsx), so this component is safe to reuse for the short
 * "Your alerts" strip on the home page.
 *
 * Rows use the same card as the contacts list — white glass on the panel, a
 * round badge on the left, a pill on the title line — so the two screens read
 * as one app. The badge glyph and the pill both carry the emergency type;
 * severity is the glow.
 */

import {AlertTypeIcon} from './alert-type-icon';
import type {AlertFeedItem, AlertSeverity, AlertType} from './sample-alerts';

/**
 * One pale accent per severity, from the `--color-alert-*` tokens in
 * globals.css. The colour is carried by fills, rings and a soft outer glow
 * only — never by text, which stays on the app's own foreground tokens so a
 * pale hue never has to pass a contrast bar it would fail.
 */
const SEVERITY_GLOW: Record<AlertSeverity, {card: string; badge: string}> = {
    EMERGENCY: {
        card: "shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_12px_-3px_var(--color-alert-emergency)]",
        badge: "bg-alert-emergency/25 ring-alert-emergency/60",
    },
    CRITICAL: {
        card: "shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_12px_-3px_var(--color-alert-critical)]",
        badge: "bg-alert-critical/25 ring-alert-critical/60",
    },
    WARNING: {
        card: "shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_12px_-3px_var(--color-alert-warning)]",
        badge: "bg-alert-warning/25 ring-alert-warning/60",
    },
    INFO: {
        card: "shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_12px_-3px_var(--color-alert-info)]",
        badge: "bg-alert-info/25 ring-alert-info/60",
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
                        className={`flex min-h-[72px] items-start gap-1 rounded-2xl border border-white/70 bg-surface/70 px-3 py-3 text-fg backdrop-blur-md ${glow.card}`}
                    >
                        <span className={`grid size-10 shrink-0 place-items-center rounded-full ring-1 text-accent-deep ${glow.badge}`}>
                            <AlertTypeIcon type={alert.type} />
                            {/* Severity is otherwise carried by colour alone. */}
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
