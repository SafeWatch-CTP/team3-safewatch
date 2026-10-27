/**
 * EMERGENCY CONTACTS PAGE
 * URL: /contacts
 * 
 * What does this page do?
 *  - Shows the logged-in user's emergency contacts.
 *  - Runs on the server (no "use client"), so it reads the database directly.
 *    through listEmergencyContacts() instead of fetching /api/v1/contacts.
 *  - The user always comes from currentUserId(), never from the URL or the browser,
 *    so a user can only see their own list. No session means no list: the
 *    visitor is sent to the landing page to sign in.
 * 
 * This page holds no state, it only loads the contacts and lays out the screen.
 * 
 * force-dynamic: re-runs the query on every request so the list is never stale.
 * 
 * The API this screen talks to lives in app/api/v1/contacts/
 */

import {AuthenticationRequiredError, currentUserId} from '@project/auth';
import {listEmergencyContacts} from '@project/domain';
import {redirect} from 'next/navigation';
import {ContactsToggle} from './contacts-toggle';



export const dynamic = "force-dynamic";

export default async function ContactsPage() {
    let userId: string;
    try {
        userId = await currentUserId();
    } catch (error) {
        // Signed out, or a session that has expired since the page was last
        // open. The landing page is where signing in happens, so go there
        // instead of letting the throw become a 500. redirect() signals by
        // throwing, and this catch is the only one in the route, so nothing
        // swallows it.
        if (error instanceof AuthenticationRequiredError) redirect("/");
        throw error;
    }

    const contacts = await listEmergencyContacts(userId);

    return(
        <main className= "px-2 pt-2 pb-6 space-y-6">
            <ContactsToggle contacts = {contacts} />
        </main>
    );
}