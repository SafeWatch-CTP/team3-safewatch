"use client";

/**
 * One row's "12m ago", kept current.
 *
 * The label is a pure function of (receivedAt, now), and `now` is the instant
 * the server rendered with, passed down as a prop. So the server's HTML and
 * React's first client render are computed from identical inputs and agree
 * exactly — there is no hydration mismatch to suppress, and a visitor without
 * JavaScript still gets a correct label rather than an empty element.
 *
 * After mount the effect recomputes against the browser's own clock and keeps
 * ticking, which is the part a server `now` cannot do: without it, a page left
 * open overnight still claims every alert arrived minutes ago.
 *
 * Nothing here may call Date() during render. That is the whole invariant.
 */

import {useEffect, useState} from 'react';
import {relativeTime} from './relative-time';

export function RelativeTime({receivedAt, now, className}: {
    receivedAt: string;
    now: Date;
    className?: string;
}) {
    const [label, setLabel] = useState(() => relativeTime(receivedAt, now));

    useEffect(() => {
        const tick = () => setLabel(relativeTime(receivedAt, new Date()));

        // Once immediately: mount can be well after the server rendered, and
        // the first correction should not wait for the first interval.
        tick();

        // A minute is the smallest unit this label shows, so half a minute is
        // as often as it can change.
        const id = setInterval(tick, 30_000);
        return () => clearInterval(id);
    }, [receivedAt]);

    return (
        <time dateTime={receivedAt} className={className}>
            {label}
        </time>
    );
}
