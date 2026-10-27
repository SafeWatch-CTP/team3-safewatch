import type {listEmergencyContacts} from '@project/domain';
import {Icon} from '@/components/icon';
import type {ContactFormValues} from './contacts-form';

export type Contact = Awaited<ReturnType<typeof listEmergencyContacts>>[number];
export type SelectedContact = ContactFormValues & {id: string};

export function ContactsList({contacts, editMode, onSelect}: {
    contacts: Contact[];
    editMode: boolean;
    onSelect: (contact: SelectedContact) => void;
}) {
    if(contacts.length === 0) {
        return <p className="text-sm text-muted">No Contacts yet. Add one from the Add Contact tab</p>;
    }
    
    return (
            <ul className= "space-y-3">
                {contacts.map((contact) =>
                  <li
                    key = {contact.id}
                    className= {`relative flex min-h-[72px] items-center gap-1 rounded-2xl px-3 py-3 border border-white/70 bg-surface/70 text-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_3px_rgba(47,85,232,0.08)] backdrop-blur-md transition ${editMode ? "ring-2 ring-accent shadow-[0_2px_12px_rgba(30,63,196,0.18)]" : ""}`}
                    >
                    {editMode && (
                        <button
                            type="button"
                            onClick={() => onSelect(contact)}
                            aria-label={`Edit ${contact.firstName} ${contact.lastName}`}
                            className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        />
                    )}
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface ring-1 ring-accent/20 text-sm font-semibold font-display text-accent-deep">
                        {contact.firstName[0]}{contact.lastName[0]}
                    </span>


                    <div className= "flex-1 min-w-0 text-left pl-2.5">
                        <div className= "flex items-center gap-1.5">
                            <p className="min-w-0 break-words text-base">{contact.firstName} {contact.lastName}</p>
                            {contact.relationship && <span className="ml-auto mr-2 w-[70px] shrink-0 rounded-full border border-accent/30 bg-accent/15 py-0.5 text-center text-[10px] font-semibold uppercase leading-[1.4] text-accent-deep">{contact.relationship}</span>}
                        </div>
                        <p className="mt-0.5 text-[13px] tabular-nums tracking-wide text-muted">{contact.phoneNumber}</p>
                    </div>

                    <a href={`tel:${contact.phoneNumber}`} aria-label={`Call ${contact.firstName}`}
                        className="relative z-20 grid size-10 shrink-0 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent bg-linear-to-br from-accent to-accent-deep text-white transition hover:brightness-110 active:scale-95">
                         <Icon src="/icons/phone.png" size={20} />
                    </a>

                  </li>
            )}
            </ul>
    );
}
