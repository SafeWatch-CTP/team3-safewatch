"use client";

/**
 * This file holds the Add Contact / Contacts toggle.
 *  - Remembers which side is selected (needs "use client" because of useState).
 *  - Shows the page header above the toggle, so its title can follow the selected side.
 *  - Shows the selected side's content underneath the toggle.
 */

import {useState} from 'react';
import {ContactForm} from './contacts-form'
import {ContactsHeader} from './contacts-header';
import {ContactsList} from './contacts-list';
import type {Contact, SelectedContact} from './contacts-list';
import {BottomSheet} from '@/components/bottom-sheet';

type Tab = 'add' | 'list';

const tabs: {id: Tab; label: string}[] = [
    {id: 'add', label: 'Add Contact'},
    {id: 'list', label: 'Contacts'},
];

export function ContactsToggle({contacts}: {contacts: Contact[]}) {
    const [tab, setTab] = useState<Tab>('list');
    const [editMode, setEditMode] = useState(false);
    const [editing, setEditing] = useState<SelectedContact | null>(null);

    function switchTab(next: Tab) {
        setTab(next);
        setEditMode(false);
    }

    return (
        <div className="space-y-6">
            <ContactsHeader adding={tab === 'add'} editMode={editMode} onEdit={() => setEditMode(!editMode)} />
            <BottomSheet
                open={editing !== null}
                onClose={() => setEditing(null)}
                title={<>Edit <span className="font-light italic text-accent drop-shadow-[0_0_12px_rgba(124,92,252,0.6)]">Contact</span></>}
            >
                {editing && (
                    <ContactForm
                        key={editing.id}
                        initial={editing}
                        onSaved={() => { setEditing(null); setEditMode(false); }}
                    />
                )}
            </BottomSheet>
            <div className="relative isolate">
                <div aria-hidden="true" className="absolute left-0 top-8 -z-10 size-40 rounded-full bg-accent/30 blur-3xl" />
                <div aria-hidden="true" className="absolute bottom-8 right-0 -z-10 size-40 rounded-full bg-[#00d4ff]/20 blur-3xl" />

                <div className="space-y-4 rounded-2xl border border-white/15 bg-white/5 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                    <div className="flex w-full gap-1 rounded-full border border-white/10 bg-black/30 p-1">
                        {tabs.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                aria-pressed={tab === item.id}
                                onClick={() => switchTab(item.id)}
                                className={`flex-1 rounded-full px-4 py-2 text-sm transition-colors ${tab === item.id ? "bg-linear-to-r from-blue-500 to-purple-600 text-white shadow-sm" : "text-text2 hover:text-white"}`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                    {tab === 'list'
                        ? <ContactsList contacts={contacts} editMode={editMode} onSelect={setEditing} />
                        : <ContactForm onSaved={() => switchTab('list')} />}
                </div>
            </div>
        </div>
    );
}
