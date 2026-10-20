"use client";

/**
 * A glass panel that slides up from the bottom of the screen.
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
            className="mx-auto mt-auto mb-0 max-h-[85dvh] w-full max-w-phone animate-sheet-up rounded-t-3xl border border-b-0 border-white/15 bg-[#111118]/90 p-0 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
        >
            <div className="p-5 pb-8">
                <div aria-hidden="true" className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
                <div className="mb-4 flex items-center justify-between">
                    <h2 id="sheet-title" className="font-display text-3xl font-extrabold tracking-tight">{title}</h2>
                    <button type="button" onClick={onClose} aria-label="Close"
                        className="grid size-9 place-items-center rounded-full bg-white/10 text-text2 hover:bg-white/20 hover:text-white">
                        ✕
                    </button>
                </div>
                {children}
            </div>
        </dialog>
    );
}
