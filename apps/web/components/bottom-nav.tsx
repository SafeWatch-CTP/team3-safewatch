"use client";
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Icon} from './icon';
import {SosButton} from './sos-button';


export function BottomNav() {
    const icons = [
        {href: "/", label: "Home", icon: "/icons/house.png"},
        {href: "/incidents", label: "Feed", icon: "/icons/feed.png"},
        {href: "/alerts", label: "Alerts", icon: "/icons/bell.png"},
        {href: "/contacts", label: "Contacts", icon: "/icons/contact.png"}
    ]
    
    const pathname = usePathname();
    
    return (
        <nav aria-label= "Primary" className= "fixed bottom-3 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-[369px] rounded-[22px] bg-accent-deep px-2 py-2 shadow-[0_8px_28px_rgba(16,48,127,0.45)]">
            <ul className = "grid grid-cols-5 items-center">
                {icons.map((item, i) => {
                    const isActive = pathname === item.href;
                    return (
                        <li key= {item.href} className={i === 2 ? "col-start-4" : ""}>
                            <Link
                                href= {item.href}
                                aria-current={isActive ? "page": undefined}
                                className={`flex flex-col items-center gap-0.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white text-[11px] ${isActive ? "text-white font-semibold drop-shadow-[0_0_6px_rgba(255,255,255,0.5)]": "text-white/80"}`}>
                                <Icon src={item.icon} size={22} />
                                <span>{item.label}</span>
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
