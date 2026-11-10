"use client";

/**
 * THE ALERTS SCREEN'S GLASS PANEL
 *
 * Owns the two pieces of state the feed needs and nothing else:
 *  - which time window is selected (24 hours / 7 days)
 *  - how many rows of that window are on screen
 *
 * Needs "use client" for useState. The rows themselves are rendered by
 * AlertsFeed, which stays presentational.
 *
 * Both lists are derived from the same `alerts` prop, so switching windows
 * resets paging rather than carrying a count across a different-sized list.
 *
 * The window switch is a pair of aria-pressed buttons, not a tablist — the
 * known, accepted deviation for a two-item switch in
 * docs/specs/design-system.md, matching the Add/Contacts toggle.
 */

import {useMemo, useState} from 'react';
import {AlertsFeed} from './alerts-feed';
import type {AlertFeedItem} from './sample-alerts';

const PAGE_SIZE = 5;

type WindowId = 'day' | 'week';

const WINDOWS: {id: WindowId; label: string; days: number; empty: string}[] = [
    {id: 'day', label: '24 hours', days: 1, empty: "No alerts in the last 24 hours."},
    {id: 'week', label: '7 days', days: 7, empty: "No alerts in the last 7 days."},
];

export function AlertsPanel({alerts, now}: {alerts: AlertFeedItem[]; now: Date}) {
    const [windowId, setWindowId] = useState<WindowId>('day');
    const [visible, setVisible] = useState(PAGE_SIZE);

    const active = WINDOWS.find((item) => item.id === windowId) ?? WINDOWS[0];

    const inWindow = useMemo(() => {
        const cutoff = now.getTime() - active.days * 24 * 60 * 60_000;
        return alerts
            .filter((alert) => new Date(alert.receivedAt).getTime() >= cutoff)
            .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
    }, [alerts, active.days, now]);

    const shown = inWindow.slice(0, visible);
    const remaining = inWindow.length - shown.length;

    function selectWindow(next: WindowId) {
        setWindowId(next);
        setVisible(PAGE_SIZE);
    }

    return (
        <div className="-mx-2 min-h-[calc(100dvh-10.5rem)] space-y-5 rounded-3xl border border-white/70 bg-panel/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_8px_32px_rgba(47,85,232,0.15)] backdrop-blur-2xl backdrop-saturate-125">
            <header>
                <h1 className="font-display text-[32px] font-extrabold leading-[1.05] tracking-tight text-fg">
                    <span className="font-medium text-accent">Alerts</span><br />
                    <span className="font-light text-fg">Feed</span>
                </h1>
                <p className="mt-2 text-sm font-medium leading-[1.5] text-fg/75">
                    Catch up on anything you missed while you were away.
                </p>
            </header>

            <div className="flex w-full gap-1 rounded-full border border-white/60 bg-surface/50 p-1 shadow-[inset_0_1px_2px_rgba(47,85,232,0.08)]">
                {WINDOWS.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        aria-pressed={windowId === item.id}
                        onClick={() => selectWindow(item.id)}
                        className={`flex-1 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent px-4 py-2 text-sm transition-colors ${windowId === item.id ? "bg-linear-to-r from-accent to-accent-deep text-white shadow-[0_2px_8px_rgba(47,85,232,0.3)]" : "text-muted hover:text-accent"}`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            <AlertsFeed alerts={shown} now={now} emptyMessage={active.empty} />

            {remaining > 0 && (
                <button
                    type="button"
                    onClick={() => setVisible(visible + PAGE_SIZE)}
                    className="w-full rounded-full border border-accent/15 bg-accent/10 px-4 py-2.5 text-sm font-medium text-accent transition-colors hover:bg-accent/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                    Show {Math.min(remaining, PAGE_SIZE)} more
                </button>
            )}
        </div>
    );
}
