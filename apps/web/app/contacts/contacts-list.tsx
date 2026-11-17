import type {listEmergencyContacts} from '@project/domain';
import {Icon} from '@/components/icon';
import type {ContactFormValues} from './contacts-form';

export type Contact = Awaited<ReturnType<typeof listEmergencyContacts>>[number];
export type SelectedContact = ContactFormValues & {id: string};

/**
 * Edit mode tints the row rather than ringing it: the list clips its children
 * so the row is flush with its neighbors, and a ring would be cut off.
 *
 * Every row shares one tint, whatever the relationship and whether or not one
 * is saved. The badge's wording is what separates a sibling from a friend;
 * color separates the list from the page, not the rows from each other. Two
 * earlier versions had color carry the relationship — a hue per value, then
 * two depths — and ADR-0015 records why both were dropped.
 */
const ROW_STYLE = {
    badge: "border-rel-deep/40 bg-rel-tint text-rel-deep",
    avatar: "from-rel-tint to-rel-deep/15 ring-rel-deep/25 text-rel-deep",
};

export function ContactsList({contacts, editMode, onSelect}: {
    contacts: Contact[];
    editMode: boolean;
    onSelect: (contact: SelectedContact) => void;
}) {
    if(contacts.length === 0) {
        return <p className="text-sm text-muted">No Contacts yet. Add one from the Add Contact tab</p>;
    }
    
    return (
            // One surface with hairlines rather than a stack of cards: the
            // panel is already a card, so a card per row was a card inside a
            // card and needed gaps to stop them colliding.
            <ul className= "divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
                {contacts.map((contact) => (
                  <li
                    key = {contact.id}
                    className= {`relative flex min-h-[72px] items-center gap-1 px-3 py-3 text-fg transition-colors ${editMode ? "bg-tint" : ""}`}
                    >
                    {editMode && (
                        <button
                            type="button"
                            onClick={() => onSelect(contact)}
                            aria-label={`Edit ${contact.firstName} ${contact.lastName}`}
                            className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        />
                    )}
                    <span className={`grid size-10 shrink-0 place-items-center rounded-full bg-linear-to-br ring-1 text-sm font-semibold font-display ${ROW_STYLE.avatar}`}>
                        {contact.firstName[0]}{contact.lastName[0]}
                    </span>


                    <div className= "flex-1 min-w-0 text-left pl-2.5">
                        <div className= "flex items-center gap-1.5">
                            <p className="min-w-0 break-words text-base">{contact.firstName} {contact.lastName}</p>
                            {contact.relationship && <span className={`ml-auto mr-2 w-[70px] shrink-0 rounded-full border py-0.5 text-center text-[10px] font-semibold uppercase leading-[1.4] ${ROW_STYLE.badge}`}>{contact.relationship}</span>}
                        </div>
                        <p className="mt-0.5 text-[13px] tabular-nums tracking-wide text-muted">{contact.phoneNumber}</p>
                    </div>

                    <a href={`tel:${contact.phoneNumber}`} aria-label={`Call ${contact.firstName}`}
                        className="relative z-20 grid size-10 shrink-0 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent bg-linear-to-br from-accent to-accent-deep text-white transition hover:brightness-110 active:scale-95">
                         <Icon src="/icons/phone.png" size={20} />
                    </a>

                  </li>
                ))}
            </ul>
    );
}
