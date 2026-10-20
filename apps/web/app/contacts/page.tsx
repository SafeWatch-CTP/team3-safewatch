/**
 * EMERGENCY CONTACTS PAGE
 * URL: /contacts
 * 
 * What does this page do?
 *  - Shows the logged-in user's emergency contacts.
 *  - Runs on the server (no "use client"), so it reads the database directly.
 *    through listEmergencyContacts() instead of fetching /api/v1/contacts.
 *  - The user always comes from currentUserId(), never from the URL or the browser,
 *    so a user can only see their own list.
 * 
 * This page holds no state, it only loads the contacts and lays out the screen.
 * 
 * force-dynamic: re-runs the query on every request so the list is never stale.
 * 
 * The API this screen talks to lives in app/api/v1/contacts/
 */

import {currentUserId} from '@project/auth';
import {listEmergencyContacts} from '@project/domain';
import {ContactsToggle} from './contacts-toggle';



export const dynamic = "force-dynamic";

export default async function ContactsPage() {
    const userId = await currentUserId();
    const contacts = await listEmergencyContacts(userId);

    return(
        <main className= "px-2 pt-2 pb-6 space-y-6">
            <ContactsToggle contacts = {contacts} />
        </main>
    );
}