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
        <div>
            <BottomSheet
                open={editing !== null}
                onClose={() => setEditing(null)}
                title={<><span className="text-accent">Edit</span> <span className="font-light text-fg">Contact</span></>}
            >
                {editing && (
                    <ContactForm
                        key={editing.id}
                        initial={editing}
                        onSaved={() => { setEditing(null); setEditMode(false); }}
                        onDeleted={() => { setEditing(null); setEditMode(false); }}
                    />
                )}
            </BottomSheet>
            {/* 9rem is the vertical padding this panel sits inside: pt-10 +
                pb-24 on body, pt-2 on main. Change either and change this.
                That leaves about 20px between the panel and the nav dock,
                which is deliberate — the panel should read as reaching the
                nav rather than floating above it.

                The panel is a fixed-height flex column so the header and the
                tab switch hold still and only the list below them scrolls —
                at twenty contacts, Edit and the switch would otherwise scroll
                off the top. */}
            <div className="-mx-2 flex h-[calc(100dvh-9rem)] flex-col gap-5 rounded-3xl border border-white/70 bg-panel/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_8px_32px_rgba(54,88,231,0.15)] backdrop-blur-2xl backdrop-saturate-125">
                <ContactsHeader adding={tab === 'add'} editMode={editMode} onEdit={() => setEditMode(!editMode)} />

                <div className="flex w-full shrink-0 gap-1 rounded-full border border-white/60 bg-surface/50 p-1 shadow-[inset_0_1px_2px_rgba(54,88,231,0.08)]">
                    {tabs.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            aria-pressed={tab === item.id}
                            onClick={() => switchTab(item.id)}
                            className={`flex-1 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent px-4 py-2 text-sm transition-colors ${tab === item.id ? "bg-linear-to-r from-accent to-accent-deep text-white shadow-[0_2px_8px_rgba(54,88,231,0.3)]" : "text-muted hover:text-accent"}`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
                {/* min-h-0 is what lets a flex child actually scroll: without
                    it the child's content sets a floor and the panel grows
                    instead of the list scrolling. */}
                <div className="min-h-0 flex-1 overflow-y-auto">
                    {tab === 'list'
                        ? <ContactsList contacts={contacts} editMode={editMode} onSelect={setEditing} />
                        : <ContactForm onSaved={() => switchTab('list')} />}
                </div>
            </div>
        </div>
    );
}
