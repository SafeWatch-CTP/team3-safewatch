"use client";

import {useState} from 'react';
import {useRouter} from 'next/navigation';

export type ContactFormValues = {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email?: string | null;
    relationship?: string | null;
    isPrimary?: boolean;
};

export function ContactForm({initial, onSaved}: {initial?: ContactFormValues & {id:string}; onSaved: () => void}) {
    const [firstName, setFirstName] = useState(initial?.firstName ?? "");
    const [lastName, setLastName] = useState(initial?.lastName ?? "");
    const [phoneNumber, setPhoneNumber] = useState(initial?.phoneNumber ?? "");
    const [email, setEmail] = useState(initial?.email ?? "");
    const [relationship, setRelationship] = useState(initial?.relationship ?? "");
    const [isPrimary, setIsPrimary] = useState(initial?.isPrimary ?? false);
    const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
    const [message, setMessage] = useState<string | null>(null);
    const router = useRouter();

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        const payload = {
            firstName,
            lastName,
            phoneNumber,
            email,
            relationship: relationship || undefined,
            isPrimary,
        };

        setStatus("saving");
        setMessage(null);
        
        try {
            const res = await fetch(
                initial ? `/api/v1/contacts/${initial.id}` : "/api/v1/contacts", 
                {
                    method: initial ? "PUT" : "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(payload),
                },
            );
            
            if (!res.ok) {
                const body = await res.json().catch(() => null);
                setMessage(body?.error?.message ?? "Could not save this contact.");
                setStatus("error");
                return;
            }

            if(!initial) {
                setFirstName("");
                setLastName("");
                setPhoneNumber("");
                setEmail("");
                setRelationship("");
                setIsPrimary(false);
            }

            setStatus("idle");
            router.refresh();
            onSaved();
        } catch {
            setMessage("Could not reach the server. Check your connection and try again.");
            setStatus("error");
        
        }
       
    }

    return (
        <div>
            <form onSubmit={handleSubmit} className= "flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
                {message && (
                    <p role="alert" className= "rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                        {message}
                    </p>
                )}
                <div className= "flex flex-col gap-1">
                    <label htmlFor= "firstName" className= "text-[11px] uppercase tracking-widest text-text2">First Name <span className= "text-accent">*</span></label>
                    <input
                        id= "firstName"
                        type= "text"
                        placeholder="Alex"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className= "w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white outline-none placeholder:text-white/25 focus:border-accent/60 focus:shadow-[0_0_12px_rgba(124,92,252,0.35)]"
                    />
                </div>
                <div className= "flex flex-col gap-1">
                    <label htmlFor= "lastName" className= "text-[11px] uppercase tracking-widest text-text2">Last Name <span className= "text-accent">*</span></label>
                    <input
                        id= "lastName"
                        type= "text"
                        placeholder= "Chalif"
                        value= {lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className= "w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white outline-none placeholder:text-white/25 focus:border-accent/60 focus:shadow-[0_0_12px_rgba(124,92,252,0.35)]"
                    />
                </div>
                    <div className= "flex flex-col gap-1">
                        <label htmlFor= "phoneNumber" className= "text-[11px] uppercase tracking-widest text-text2">Phone Number <span className= "text-accent">*</span></label>
                        <input
                            id= "phoneNumber"
                            type= "tel"
                            placeholder= "561-309-3489"
                            value= {phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className= "w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white outline-none placeholder:text-white/25 focus:border-accent/60 focus:shadow-[0_0_12px_rgba(124,92,252,0.35)]"
                        />
                    </div>
                    <div className= "flex flex-col gap-1">
                        <label htmlFor= "email" className= "text-[11px] uppercase tracking-widest text-text2">Email</label>
                        <input
                            id= "email"
                            type= "email"
                            placeholder= "bearthecat@gmail.com"
                            value= {email}
                            onChange={(e) => setEmail(e.target.value)}
                            className= "w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white outline-none placeholder:text-white/25 focus:border-accent/60 focus:shadow-[0_0_12px_rgba(124,92,252,0.35)]"
                        />
                    </div>
                <div className= "grid grid-cols-2 gap-3">
                    <div className= "flex flex-col gap-1">
                        <label htmlFor= "relationship" className= "text-[11px] uppercase tracking-widest text-text2">Relationship</label>
                        <select
                            id= "relationship"
                            value= {relationship}
                            onChange={(e) => setRelationship(e.target.value)}
                            className= "h-10.5 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-text2 outline-none focus:border-accent/60 focus:shadow-[0_0_12px_rgba(124,92,252,0.35)]"
                        >
                            <option value= "">Select</option>
                            <option value= "PARENT">Parent</option>
                            <option value= "SPOUSE">Spouse</option>
                            <option value= "SIBLING">Sibling</option>
                            <option value= "FRIEND">Friend</option>
                            <option value= "OTHER">Other</option>
                        </select>
                    </div>
                    <label className= "flex flex-col gap-1 pl-4 text-[11px] uppercase tracking-widest text-text2">
                        Primary Contact?
                        <span className= "flex h-10.5 items-center gap-3 text-base normal-case tracking-normal">
                            <input
                                type= "checkbox"
                                checked= {isPrimary}
                                onChange= {(e) => setIsPrimary(e.target.checked)}
                                className= "peer sr-only"
                            />
                            <span className= "relative h-6 w-11 shrink-0 rounded-full bg-neutral-600 transition-colors peer-checked:bg-accent after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5" />
                            {isPrimary ? "Yes" : "No"}
                        </span>
                    </label>
                </div>
                    <button type="submit" 
                    disabled={status === "saving" || !firstName.trim() || !lastName.trim() || !phoneNumber.trim()} 
                    className="text-white bg-gradient-to-br from-purple-600 to-blue-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 font-medium rounded-base text-sm px-4 py-2.5 text-center leading-5 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed">Save Contact</button>
            </form>
        </div>
    )
}