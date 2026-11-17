"use client";

/**
 * THE ALERTS SCREEN'S GLASS PANEL
 *
 * Owns the feed's client state: which window is selected, the rows on screen,
 * and where the next page resumes. The rows themselves are rendered by
 * AlertsFeed, which stays presentational.
 *
 * The first page arrives as a prop, already queried on the server, so the feed
 * is complete in the HTML with no loading state. Everything after that — the
 * other window, the next page, dismissing a row — goes through
 * GET/PATCH /api/v1/alerts, so the screen and the API exercise one code path
 * rather than two. See docs/specs/alerts/alert-feed.md.
 *
 * The window switch is a pair of aria-pressed buttons, not a tablist — the
 * known, accepted deviation for a two-item switch in
 * docs/specs/design-system.md, matching the Add/Contacts toggle.
 */

import type {AlertFeedItem, AlertFeedPage} from '@project/domain';
import {useState, useTransition} from 'react';
import {AlertsFeed} from './alerts-feed';

const PAGE_SIZE = 5;

type WindowId = '24h' | '7d';

const WINDOWS: {id: WindowId; label: string; empty: string}[] = [
    {id: '24h', label: '24 hours', empty: "No alerts in the last 24 hours."},
    {id: '7d', label: '7 days', empty: "No alerts in the last 7 days."},
];

async function fetchPage(window: WindowId, cursor?: string): Promise<AlertFeedPage> {
    const params = new URLSearchParams({window, limit: String(PAGE_SIZE)});
    if (cursor) params.set("cursor", cursor);

    const res = await fetch(`/api/v1/alerts?${params}`);
    if (!res.ok) throw new Error("feed");

    return res.json();
}

export function AlertsPanel({initial, now}: {initial: AlertFeedPage; now: Date}) {
    const [windowId, setWindowId] = useState<WindowId>('24h');
    const [page, setPage] = useState<AlertFeedPage>(initial);
    const [failed, setFailed] = useState(false);
    const [pending, startTransition] = useTransition();

    const active = WINDOWS.find((item) => item.id === windowId) ?? WINDOWS[0];

    function load(next: WindowId, cursor?: string) {
        setFailed(false);

        startTransition(async () => {
            try {
                const result = await fetchPage(next, cursor);

                setPage((current) =>
                    cursor
                        // Appending: the cursor page continues the list on screen.
                        ? {alerts: [...current.alerts, ...result.alerts], nextCursor: result.nextCursor}
                        : result
                );
            } catch {
                setFailed(true);
            }
        });
    }

    function selectWindow(next: WindowId) {
        if (next === windowId) return;

        setWindowId(next);
        // A cursor belongs to the window it came from, so the new window
        // starts again from its newest row.
        load(next);
    }

    /** Both row actions are the same request; only the body differs. */
    async function updateAlert(id: string, change: {read?: true; dismissed?: true}) {
        const res = await fetch(`/api/v1/alerts/${id}`, {
            method: "PATCH",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(change),
        });

        if (!res.ok) {
            setFailed(true);
            return;
        }

        setPage((current) => ({
            ...current,
            alerts: change.dismissed
                ? current.alerts.filter((alert) => alert.id !== id)
                : current.alerts.map((alert) =>
                      alert.id === id ? {...alert, unread: false} : alert
                  ),
        }));
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

            {/* aria-busy rather than a spinner that replaces the list: the rows
                already on screen stay readable while the next page loads. */}
            <div aria-busy={pending}>
                <AlertsFeed
                    alerts={page.alerts}
                    now={now}
                    emptyMessage={active.empty}
                    onRead={(id) => updateAlert(id, {read: true})}
                    onDismiss={(id) => updateAlert(id, {dismissed: true})}
                />
            </div>

            {failed && (
                <p role="status" className="text-sm text-muted">
                    Could not reach the server. Check your connection and try again.
                </p>
            )}

            {page.nextCursor && (
                <button
                    type="button"
                    disabled={pending}
                    onClick={() => load(windowId, page.nextCursor ?? undefined)}
                    className="w-full rounded-full border border-accent/15 bg-accent/10 px-4 py-2.5 text-sm font-medium text-accent transition-colors hover:bg-accent/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
                >
                    {pending ? "Loading..." : `Show ${PAGE_SIZE} more`}
                </button>
            )}
        </div>
    );
}
