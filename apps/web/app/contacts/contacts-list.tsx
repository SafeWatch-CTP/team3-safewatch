import type {listEmergencyContacts} from '@project/domain';
import Image from 'next/image';
import type {ContactFormValues} from './contacts-form';

export type Contact = Awaited<ReturnType<typeof listEmergencyContacts>>[number];
export type SelectedContact = ContactFormValues & {id: string};

export function ContactsList({contacts, editMode, onSelect}: {
    contacts: Contact[];
    editMode: boolean;
    onSelect: (contact: SelectedContact) => void;
}) {
    if(contacts.length === 0) {
        return <p className="text-sm text-text2">No Contacts yet. Add one from the Add Contact tab</p>;
    }
    
    return (
            <ul className= "space-y-3">
                {contacts.map((contact) =>
                  <li
                    key = {contact.id}
                    className= {`relative flex items-center gap-1 rounded-2xl px-3 py-3 bg-white/5 border text-white transition-colors ${editMode ? "border-accent/50 shadow-[0_0_12px_rgba(124,92,252,0.25)] hover:bg-white/10" : "border-white/10"}`}
                    >
                    {editMode && (
                        <button
                            type="button"
                            onClick={() => onSelect(contact)}
                            aria-label={`Edit ${contact.firstName} ${contact.lastName}`}
                            className="absolute inset-0 z-10 rounded-2xl"
                        />
                    )}
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent/20 text-sm font-semibold font-display text-white/80">
                        {contact.firstName[0]}{contact.lastName[0]}
                    </span>


                    <div className= "flex-1 min-w-0 text-left pl-3">
                        <div className= "flex items-center gap-x-2">
                            <p className="min-w-0 truncate text-base">{contact.firstName} {contact.lastName}</p>
                            {contact.relationship && <span className="ml-1 shrink-0 rounded-full border border-accent/30 bg-accent/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#c4b5fd]">{contact.relationship}</span>}
                        </div>
                        <p className="text-xs tracking-wide text-text2">{contact.phoneNumber}</p>
                    </div>

                    <a href={`tel:${contact.phoneNumber}`} aria-label={`Call ${contact.firstName}`}
                        className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20">
                         <Image src="/icons/phone.png" alt="" width={20} height={20} />
                    </a>

                  </li>
            )}
            </ul>
    );
}