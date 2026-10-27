"use client";

import { useRouter } from "next/navigation";
import { startTransition } from "react";

// Whole-page fallback: the session lookup itself failed (for example, the
// database is down), so there is no page to show around a section error.
export default function HomeError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();

  // reset() alone re-renders the server payload that already failed; refresh
  // fetches a new one.
  const retry = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center gap-4">
      <div role="alert" className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-6">
        <h1 className="text-lg font-semibold text-red-900">SafeWatch couldn&apos;t load.</h1>
        <p className="text-sm text-red-800">
          Something went wrong on our side. Check your connection, then try again.
        </p>
        <button
          type="button"
          onClick={retry}
          className="rounded bg-red-700 px-3 py-1.5 text-sm font-medium text-white"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
