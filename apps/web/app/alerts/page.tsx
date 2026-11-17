/**
 * ALERTS PAGE
 * URL: /alerts  — the bell in the bottom nav
 *
 * What does this page do?
 *  - Shows the alerts that reached the logged-in user, newest first.
 *  - Runs on the server (no "use client"). The user always comes from
 *    currentUserId(), never from the URL or the browser, so a user can only
 *    ever see their own feed. No session means no feed: the visitor is sent
 *    to the landing page to sign in.
 *  - Queries the first page here rather than fetching it from the client, so
 *    the feed is complete in the HTML with no loading state. The window
 *    switch and "show more" then read GET /api/v1/alerts.
 *
 * See docs/specs/alerts/alert-feed.md.
 */

import {AuthenticationRequiredError, currentUserId} from '@project/auth';
import {listAlertFeed} from '@project/domain';
import {redirect} from 'next/navigation';
import {AlertsPanel} from './alerts-panel';

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
    let userId: string;

    try {
        userId = await currentUserId();
    } catch (error) {
        // Signed out, or a session that expired since the page was last open.
        // redirect() signals by throwing, and this catch is the only one in
        // the route, so nothing swallows it.
        if (error instanceof AuthenticationRequiredError) redirect("/");
        throw error;
    }

    const first = await listAlertFeed(userId, {window: "24h", limit: 5});

    // One instant for the whole render: every row's "8m ago" has to agree on
    // what time it is, and a Date() per row does not.
    const now = new Date();

    return (
        <main className="px-2 pt-2 pb-6 space-y-6">
            <AlertsPanel initial={first} now={now} />
        </main>
    );
}
