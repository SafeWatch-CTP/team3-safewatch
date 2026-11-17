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
 *
 * The rows are placeholder data for now. Landing the real feed means
 * replacing the sampleAlerts() call with the user-scoped query — `now` is
 * already the real clock, and nothing else on this screen changes.
 */

import {AuthenticationRequiredError, currentUserId} from '@project/auth';
import {redirect} from 'next/navigation';
import {AlertsPanel} from './alerts-panel';
import {sampleAlerts} from './sample-alerts';

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
    try {
        await currentUserId();
    } catch (error) {
        // Signed out, or a session that expired since the page was last open.
        // redirect() signals by throwing, and this catch is the only one in
        // the route, so nothing swallows it.
        if (error instanceof AuthenticationRequiredError) redirect("/");
        throw error;
    }

    // One instant for the whole render: the window filter and every row's
    // "8m ago" have to agree on what time it is, and two Date() calls do not.
    const now = new Date();

    return (
        <main className="px-2 pt-2 pb-6 space-y-6">
            <AlertsPanel alerts={sampleAlerts(now)} now={now} />
        </main>
    );
}
