"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";

const REFRESH_MS = 60_000;

// Re-reads the feed every minute while the browser tab is visible, and on
// demand. router.refresh() inside a transition keeps the current list on
// screen until the new one arrives, so there is no spinner flash and the
// selected category (in the URL) is untouched.
export function FeedRefresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") startTransition(() => router.refresh());
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [router]);

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      className="shrink-0 rounded-lg border border-accent/15 bg-accent/10 px-3 py-2 text-sm text-accent transition-colors hover:bg-accent/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
    >
      {pending ? "Refreshing…" : "Refresh"}
    </button>
  );
}
