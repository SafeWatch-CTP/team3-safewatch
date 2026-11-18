/**
 * "12m ago" / "3h ago" / "2d ago", measured against the instant the caller
 * passes in.
 *
 * Pure, and deliberately kept out of the component file: the caller owning
 * `now` is what lets a server render and its hydration agree, and a function
 * with no React in its import graph is testable from `tests/unit` without a
 * JSX transform.
 */
export function relativeTime(receivedAt: string, now: Date): string {
    const minutes = Math.floor((now.getTime() - new Date(receivedAt).getTime()) / 60_000);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}h ago`;
    return `${Math.floor(minutes / (60 * 24))}d ago`;
}
