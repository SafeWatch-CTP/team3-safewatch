"use client";
import {useState, useRef, useEffect} from 'react';
import Link from 'next/link';
import type {ReactNode} from 'react';

/**
 * The emergency dial. Pressing SOS opens a modal <dialog> holding the four
 * ways to get help. The scrim dims hard so the app visibly shifts into an
 * emergency mode rather than competing with the page behind it.
 *
 * Icons are inline SVG rather than emoji: emoji render differently on every
 * platform, and these need to read the same everywhere.
 */

function MedicalCross() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6" fill="currentColor">
            <path d="M9.5 3h5v5.5H20v5h-5.5V19h-5v-5.5H4v-5h5.5z" />
        </svg>
    );
}

function Shield() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6" fill="currentColor">
            <path d="M12 2.2 20 5v6.2c0 5-3.4 9.1-8 10.6-4.6-1.5-8-5.6-8-10.6V5z" />
        </svg>
    );
}

function Flame() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6" fill="currentColor">
            <path d="M13 2c.6 3.3-.7 4.4.8 6.6 1 1.5 2.7 2.6 2.7 5.4a5.5 5.5 0 1 1-11 0c0-2.6 1.6-4.2 2.7-6 .3 1.3.9 1.9.9 1.9.3-3.4 2-6.1 3.9-7.9m-1 11.2c-1.3 1-1.9 1.9-1.9 3a2.2 2.2 0 0 0 4.4 0c0-1.3-1.1-2.2-2.5-3" />
        </svg>
    );
}

function People() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6" fill="currentColor">
            <path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7m0 1.6c-3 0-6 1.5-6 3.4V20h12v-4c0-1.9-3-3.4-6-3.4M17 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6m0 1.6c-.6 0-1.2.1-1.7.2 1.4.9 2.2 2 2.2 3.2V20h4v-3.6c0-1.7-2.2-2.8-4.5-2.8" />
        </svg>
    );
}

const services: {label: string; icon: ReactNode; href: string; aria: string; circle: string}[] = [
    {label: "EMS", icon: <MedicalCross />, href: "tel:911", aria: "Call EMS",
        circle: "border-emerald-300/70 bg-emerald-50 text-emerald-600"},
    {label: "Police", icon: <Shield />, href: "tel:911", aria: "Call police",
        circle: "border-sky-300/70 bg-sky-50 text-sky-600"},
    {label: "Fire", icon: <Flame />, href: "tel:911", aria: "Call fire department",
        circle: "border-orange-300/70 bg-orange-50 text-orange-600"},
    {label: "Contacts", icon: <People />, href: "/contacts", aria: "Open emergency contacts",
        circle: "border-accent/30 bg-tint text-accent-deep"},
];

export function SosButton() {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        if (open && !dialog.open) dialog.showModal();
        if (!open && dialog.open) dialog.close();
    }, [open]);

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                aria-haspopup="dialog"
                aria-label="Emergency options"
                className="relative z-10 size-[60px] rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white  bg-linear-to-b from-red-500 to-red-700 font-display text-sm font-extrabold tracking-wide text-white ring-2 ring-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-2px_6px_rgba(127,29,29,0.35),0_4px_10px_rgba(16,48,127,0.45)] transition-transform active:scale-95"
            >SOS</button>

            <dialog
                ref={ref}
                onClose={() => setOpen(false)}
                onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
                aria-labelledby="sos-title"
                className="m-auto overflow-visible bg-transparent p-0 text-fg backdrop:animate-fade-in backdrop:bg-scrim-alert/55 backdrop:backdrop-blur-[3px]"
            >
                <div className="relative flex size-80 animate-jump-up flex-col items-center justify-center gap-6 rounded-full bg-dial ring-1 ring-accent/25 shadow-[0_24px_70px_rgba(16,26,58,0.45)]">
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-danger/20 blur-2xl" />
                    <p className="text-center">
                        <span id="sos-title" className="block font-display text-2xl font-extrabold uppercase tracking-[0.18em] text-danger">Emergency</span>
                        <span className="mt-1 block text-[13px] font-bold text-fg/70">Tap who you need</span>
                    </p>

                    <div className="flex gap-2">
                        {services.map((service, i) => (
                            <Link
                                key={service.label}
                                href={service.href}
                                aria-label={service.aria}
                                onClick={() => setOpen(false)}
                                className="flex w-16 animate-pop-in flex-col items-center gap-1 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent transition-transform active:scale-90"
                                style={{animationDelay: `${200 + i * 50}ms`}}
                            >
                                <span className={`grid size-14 place-items-center rounded-full border ${service.circle}`}>
                                    {service.icon}
                                </span>
                                <span className="text-[11px] font-semibold text-fg">{service.label}</span>
                            </Link>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="animate-pop-in rounded-full border border-danger/25 bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent px-6 py-2 text-sm font-semibold text-danger transition hover:bg-danger/5 active:scale-95"
                        style={{animationDelay: "400ms"}}
                    >
                        Cancel
                    </button>
                </div>
            </dialog>
        </div>
    );
}
