/**
 * This file holds the following components:
 *  - The edit contacts button
 *  - The page title, with its description
 *
 * The title follows the toggle: "Emergency Contacts" on the Contacts side,
 * "New Contact" (one line) on the Add Contact side. The first word is blue
 * and heavier; the second is black and light.
 */

import {Icon} from '@/components/icon';

export function ContactsHeader({adding, editMode, onEdit}: {adding: boolean; editMode: boolean; onEdit: () => void}) {
    return (
        <header className= "flex items-start justify-between">
            <div>
                <h1 className= "font-display text-[32px] font-extrabold leading-[1.05] tracking-tight text-fg">
                    {adding ? (
                        <span className= "font-medium">
                            <span className= "text-accent">New</span>{" "}
                            <span className= "font-light text-fg">Contact</span>
                        </span>
                    ) : (
                        <>
                            <span className= "font-medium text-accent">Emergency</span><br />
                            <span className= "font-light text-fg">Contacts</span>
                        </>
                    )}
                </h1>
                <p className= "mt-2 text-sm font-medium leading-[1.5] text-fg/75">{adding ? "Someone you trust, ready when it matters." : editMode ? "Tap a contact to edit it." : "Watching out for you, one tap away."}</p>
            </div>

            {!adding && (
                <button type="button" onClick={onEdit} aria-pressed={editMode} className= {`flex shrink-0 items-center gap-2 rounded-lg border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent px-3 py-2 text-sm transition-colors ${editMode ? "border-transparent bg-linear-to-r from-accent to-accent-deep text-white" : "border-accent/15 bg-accent/10 text-accent hover:bg-accent/15"}`}>
                    <Icon src= "/icons/user-pen.png" size={18} />
                    {editMode ? "Done" : "Edit"}
                </button>
            )}
        </header>
    )
}
