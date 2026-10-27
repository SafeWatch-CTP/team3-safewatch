"use client";

import { useRouter } from "next/navigation";
import { Component, startTransition, type ReactNode } from "react";

// error.tsx covers a whole route; this covers one section, so a failed read
// replaces only that section with a retry card and the rest of the page stays
// usable. Server Component errors thrown inside it land here.
export function SectionErrorBoundary({ title, children }: { title: string; children: ReactNode }) {
  const router = useRouter();

  // Refresh and reset in one transition, as Next's own error.tsx does:
  // resetting alone would re-render the payload that already failed.
  const retry = (reset: () => void) =>
    startTransition(() => {
      router.refresh();
      reset();
    });

  return (
    <Boundary title={title} onRetry={retry}>
      {children}
    </Boundary>
  );
}

type BoundaryProps = {
  title: string;
  onRetry: (reset: () => void) => void;
  children: ReactNode;
};

class Boundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;

    // No error details: in production they're redacted, and raw errors never
    // reach the user (docs/specs/web.md).
    return (
      <div role="alert" className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="font-semibold text-red-900">Couldn&apos;t load {this.props.title}.</p>
        <p className="text-sm text-red-800">Check your connection, then try again.</p>
        <button
          type="button"
          onClick={() => this.props.onRetry(() => this.setState({ failed: false }))}
          className="rounded bg-red-700 px-3 py-1.5 text-sm font-medium text-white"
        >
          Try again
        </button>
      </div>
    );
  }
}
