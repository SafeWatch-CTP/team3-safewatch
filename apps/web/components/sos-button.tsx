"use client";
import {useState, useRef, useEffect} from 'react';
import Link from 'next/link';

const services = [
    {label: "EMS", icon: "🚑", href: "tel:211", aria: "Call EMS",
        circle: "border-emerald-300/50 from-emerald-400/40 to-emerald-600/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_0_16px_rgba(16,185,129,0.4)]"},
    {label: "Police", icon: "🚔", href: "tel:211", aria: "Call police",
        circle: "border-blue-300/50 from-blue-400/40 to-blue-600/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_0_16px_rgba(59,130,246,0.4)]"},
    {label: "Fire", icon: "🚒", href: "tel:211", aria: "Call fire department",
        circle: "border-orange-300/50 from-orange-400/40 to-orange-600/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_0_16px_rgba(249,115,22,0.4)]"},
    {label: "Contacts", icon: "👥", href: "/contacts", aria: "Open emergency contacts",
        circle: "border-violet-300/50 from-violet-400/40 to-violet-600/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_0_16px_rgba(124,92,252,0.4)]"},
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
        <div className="absolute left-1/2 -translate-x-1/2 -top-6">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                aria-label="Send SOS"
                className="relative z-10 size-16 rounded-full border-4 border-[#16161e] bg-linear-to-b from-red-500 to-red-700 font-display font-extrabold tracking-wide text-white shadow-[0_0_24px_rgba(220,38,38,0.6)] transition-transform active:scale-95"
            >SOS</button>

            <dialog
                ref={ref}
                onClose={() => setOpen(false)}
                onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
                aria-labelledby="sos-title"
                className="m-auto overflow-visible bg-transparent p-0 text-white backdrop:bg-black/60 backdrop:backdrop-blur-sm"
            >
                <div className="flex size-80 animate-jump-up flex-col items-center justify-center gap-6 rounded-full border border-white/10 bg-[#111118]/85 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                    <p className="text-center">
                        <span id="sos-title" className="block font-display text-lg font-extrabold uppercase tracking-[0.2em] text-red-300">Emergency</span>
                        <span className="block text-[11px] text-white/70">Tap who you need</span>
                    </p>

                    <div className="flex gap-2">
                        {services.map((service, i) => (
                            <Link
                                key={service.label}
                                href={service.href}
                                aria-label={service.aria}
                                onClick={() => setOpen(false)}
                                className="flex w-16 animate-pop-in flex-col items-center gap-1 transition-transform active:scale-90"
                                style={{animationDelay: `${200 + i * 50}ms`}}
                            >
                                <span className={`grid size-14 place-items-center rounded-full border bg-linear-to-b text-2xl backdrop-blur-md ${service.circle}`}>
                                    {service.icon}
                                </span>
                                <span className="text-[11px] font-semibold text-white">{service.label}</span>
                            </Link>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="animate-pop-in rounded-full border border-red-400/30 bg-red-500/10 px-6 py-2 text-sm font-semibold text-red-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] transition hover:bg-red-500/20 hover:text-red-100 active:scale-95"
                        style={{animationDelay: "400ms"}}
                    >
                        Cancel
                    </button>
                </div>
            </dialog>
        </div>
    );
}
