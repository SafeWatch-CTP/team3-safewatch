/**
 * This file holds the following components:
 *  - The edit contacts button
 *  - The page title, with its description
 *
 * The title follows the toggle: "Emergency Contacts" on the Contacts side,
 * "New Contact" (one line) on the Add Contact side. The second word glows purple on both.
 */

import Image from "next/image";

export function ContactsHeader({adding, editMode, onEdit}: {adding: boolean; editMode: boolean; onEdit: () => void}) {
    return (
        <header className= "flex items-start justify-between">
            <div>
                <h1 className= "font-display text-[42px] font-extrabold leading-none tracking-tight text-white">
                    {adding ? (
                        <span className= "font-medium">
                            <span className= "drop-shadow-[0_0_10px_rgba(255,255,255,0.25)]">New</span>{" "}
                            <span className= "font-light italic text-accent drop-shadow-[0_0_12px_rgba(124,92,252,0.6)]">Contact</span>
                        </span>
                    ) : (
                        <>
                            <span className= "font-medium drop-shadow-[0_0_10px_rgba(255,255,255,0.25)]">Emergency</span><br />
                            <span className= "font-light italic text-accent drop-shadow-[0_0_12px_rgba(124,92,252,0.6)]">Contacts</span>
                        </>
                    )}
                </h1>
                <p className= "mt-4 text-[13px] leading-[1.85] text-text2">{adding ? "Someone you trust, ready when it matters." : editMode ? "Tap a contact to edit it." : "Watching out for you, one tap away."}</p>
            </div>

            {!adding && (
                <button type="button" onClick={onEdit} aria-pressed={editMode} className= {`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-white/10 hover:text-white ${editMode ? "border-accent/50 bg-accent/20 text-white" : "border-white/10 bg-[#16161e] text-text2"}`}>
                    <Image src= "/icons/user-pen.png" alt= "" width= {18} height= {18} />
                    {editMode ? "Done" : "Edit"}
                </button>
            )}
        </header>
    )
}
