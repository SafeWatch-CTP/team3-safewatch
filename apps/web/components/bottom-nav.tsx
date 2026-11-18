"use client";
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Icon} from './icon';
import {SosButton} from './sos-button';


export function BottomNav() {
    const icons = [
        {href: "/", label: "Home", icon: "/icons/house.png"},
        {href: "/incident_feed", label: "Feed", icon: "/icons/feed.png"},
        {href: "/alerts", label: "Alerts", icon: "/icons/bell.png"},
        {href: "/contacts", label: "Contacts", icon: "/icons/contact.png"}
    ]
    
    const pathname = usePathname();
    
    return (
        // Opaque, but a gradient rather than a flat fill, with a 1px white
        // inset shadow for the top edge highlight — an inset shadow instead of
        // a border-t so the highlight follows the full rounded edge.
        <nav aria-label= "Primary" className= "fixed bottom-3 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-[369px] rounded-[22px] bg-linear-to-b from-accent-deep to-nav-deep px-2 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_8px_28px_rgba(16,48,127,0.45)]">
            <ul className = "grid grid-cols-5 items-center">
                {icons.map((item, i) => {
                    const isActive = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                        <li key= {item.href} className={i === 2 ? "col-start-4" : ""}>
                            <Link
                                href= {item.href}
                                aria-current={isActive ? "page": undefined}
                                className={`flex flex-col items-center gap-0.5 rounded-xl px-1.5 py-1 text-[11px] font-medium tracking-wide focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${isActive ? "bg-white/15 font-semibold text-white": "text-white/80"}`}>
                                <Icon src={item.icon} size={22} />
                                <span className="whitespace-nowrap">{item.label}</span>
                            </Link>
                        </li>
                    );
                })}
                <li className="col-start-3 row-start-1 flex justify-center">
                    <SosButton />
                </li>
            </ul>
        </nav>    
    );
}
