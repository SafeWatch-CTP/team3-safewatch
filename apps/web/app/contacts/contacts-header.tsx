/**
 * This file holds the following components:
 *  - The edit contacts button
 *  - The page title, with its description
 *
 * The title follows the toggle: "Safety Circle" on the Contacts side, "New
 * Contact" on the Add Contact side. Both are one line — the first word is
 * blue and heavier, the second black and light.
 *
 * "Safety Circle" does not say what the list is for, so the subtitle has to.
 *
 * The edit control is a toggle button, so aria-pressed carries the state and
 * the accessible name stays put. It is 40px, matching the rows' call buttons
 * rather than the 44px touch minimum: a 44px pill outweighs the 32px title it
 * sits beside, and this is a secondary control.
 */

import {Icon} from '@/components/icon';

export function ContactsHeader({adding, editMode, onEdit}: {adding: boolean; editMode: boolean; onEdit: () => void}) {
    return (
        <header className= "mb-2 shrink-0">
            {/* The button shares a row with the title alone. Aligning it
                against the title-plus-subtitle block centered it on the block
                and left it hanging below the line it belongs to. */}
            <div className= "flex items-center justify-between gap-3">
                <h1 className= "font-display text-[32px] font-extrabold leading-[1.05] tracking-tight text-fg">
                    {adding ? (
                        <span className= "font-medium">
                            <span className= "text-accent">New</span>{" "}
                            <span className= "font-light text-fg">Contact</span>
                        </span>
                    ) : (
                        <span className= "font-medium">
                            <span className= "text-accent">Safety</span>{" "}
                            <span className= "font-light text-fg">Circle</span>
                        </span>
                    )}
                </h1>

                {!adding && (
                    // The visible text swaps Edit/Done, so the accessible name
                    // is pinned: a name that changes alongside aria-pressed
                    // announces as "Done, pressed" — the opposite of the truth.
                    <button
                        type="button"
                        onClick={onEdit}
                        aria-pressed={editMode}
                        aria-label="Edit contacts"
                        className= {`flex h-10 shrink-0 items-center gap-1.5 rounded-full border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent px-4 text-sm font-medium transition-colors ${editMode ? "border-transparent bg-linear-to-r from-accent to-accent-deep text-white" : "border-accent/15 bg-accent/10 text-accent hover:bg-accent/15"}`}
                    >
                        <Icon src= "/icons/user-pen.png" size={16} />
                        {editMode ? "Done" : "Edit"}
                    </button>
                )}
            </div>

            <p className= "mt-2 text-sm font-medium leading-[1.5] text-fg/75">{adding ? "Someone you trust, ready when it matters." : editMode ? "Tap a contact to edit it." : "Who we call when you press SOS."}</p>
        </header>
    )
}
