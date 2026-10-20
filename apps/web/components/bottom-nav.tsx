"use client";
import Image from 'next/image';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
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
        <nav aria-label= "Primary" className= "fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-phone bg-[#16161e] px-2 py-3 border-t border-white/10">
            <ul className = "grid grid-cols-5 items-end">
                {icons.map((item, i) => {
                    const isActive = pathname === item.href;
                    return (
                        <li key= {item.href} className={i === 2 ? "col-start-4" : ""}>
                            <Link
                                href= {item.href}
                                aria-current={isActive ? "page": undefined}
                                className={`flex flex-col items-center gap-1 text-xs ${isActive ? "text-accent": "text-white"}`}>
                                <Image src= {item.icon} alt= "" width= {24} height = {24} />
                                <span>{item.label}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>

            <SosButton />
        </nav>    
    );
}