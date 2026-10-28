"use client";

/**
 * A panel that slides up from the bottom of the screen.
 * Built on <dialog> + showModal(), which provides the dimmed backdrop,
 * Escape to close, and keeps keyboard focus inside the sheet.
 * Tapping the dimmed area outside the sheet also closes it.
 */

import {useEffect, useRef} from 'react';
import type {ReactNode} from 'react';

export function BottomSheet({open, onClose, title, children}: {
    open: boolean;
    onClose: () => void;
    title: ReactNode;
    children: ReactNode;
}) {
    const ref = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        if (open && !dialog.open) dialog.showModal();
        if (!open && dialog.open) dialog.close();
    }, [open]);

    return (
        <dialog
            ref={ref}
            onClose={onClose}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            aria-labelledby="sheet-title"
            className="mx-auto mt-auto mb-0 max-h-[85dvh] w-full max-w-phone animate-sheet-up rounded-t-3xl border border-b-0 border-border bg-panel p-0 text-fg shadow-[0_-8px_40px_rgba(30,63,196,0.18)] backdrop:animate-fade-in backdrop:bg-scrim/40 backdrop:backdrop-blur-[3px]"
        >
            <div className="p-5 pb-8">
                <div aria-hidden="true" className="mx-auto mb-4 h-1 w-10 rounded-full bg-accent/30" />
                <div className="mb-4 flex items-center justify-between">
                    <h2 id="sheet-title" className="font-display text-3xl font-extrabold tracking-tight">{title}</h2>
                    <button type="button" onClick={onClose} aria-label="Close"
                        className="grid size-9 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent  bg-surface text-muted hover:bg-tint hover:text-accent">
                        ✕
                    </button>
                </div>
                {children}
            </div>
        </dialog>
    );
}
