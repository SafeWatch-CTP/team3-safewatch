/**
 * One glyph per emergency type.
 *
 * Every glyph is aria-hidden: the row's pill already names the type.
 */

import type {AlertType} from './sample-alerts';

const PATHS: Record<AlertType, React.ReactNode> = {
    SOS: (
        <>
            <path d="M12 3.2 19 6v5.2c0 4.4-2.9 8.2-7 9.6-4.1-1.4-7-5.2-7-9.6V6l7-2.8Z" />
            <path d="M12 9.3v3.9" />
            <path d="M12 16.2h.01" />
        </>
    ),
    CRIME: (
        <>
            <path d="M7 15.5a5 5 0 0 1 10 0" />
            <path d="M4.5 18.6h15" />
            <path d="M12 5.6V3.4" />
            <path d="m18.4 7.9 1.5-1.5" />
            <path d="M5.6 7.9 4.1 6.4" />
        </>
    ),
    FIRE: (
        <path d="M12 2.8c3.2 3.4 5.2 5.9 5.2 9.2a5.2 5.2 0 0 1-10.4 0c0-2 .9-3.6 2.2-5 .2 1.3.9 2.2 1.9 2.6-.6-2.6-.1-4.8 1.1-6.8Z" />
    ),
    MEDICAL: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v8" />
            <path d="M8 12h8" />
        </>
    ),
    SEVERE_WEATHER: (
        <>
            <path d="M7.6 15.6h9.2a3.6 3.6 0 0 0 .2-7.2 5.2 5.2 0 0 0-9.9-1.1 4 4 0 0 0 .5 8.3Z" />
            <path d="M13.2 13.8 10 18.4h3.2L11.8 22" />
        </>
    ),
    TRAFFIC_HAZARD: (
        <>
            <path d="M12 3.5 18 18H6Z" />
            <path d="M9.6 11.5h4.8" />
            <path d="M8.2 15h7.6" />
            <path d="M3.5 20.6h17" />
        </>
    ),
    CIVIL_UNREST: (
        <>
            <path d="M4 10.2v3.6a1 1 0 0 0 1 1h2.2L15 19V5L7.2 9.2H5a1 1 0 0 0-1 1Z" />
            <path d="M18 9.4a4 4 0 0 1 0 5.2" />
        </>
    ),
    OTHER: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11.4v5.2" />
            <path d="M12 7.9h.01" />
        </>
    ),
};

export function AlertTypeIcon({type, size = 22}: {type: AlertType; size?: number}) {
    return (
        <svg
            aria-hidden="true"
            focusable="false"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0"
        >
            {PATHS[type]}
        </svg>
    );
}
