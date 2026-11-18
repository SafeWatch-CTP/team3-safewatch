"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

// Re-runs the page's server reads. Disabled while the refresh is in flight,
// so repeated clicks don't stack requests.
export function RefreshButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-50"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
