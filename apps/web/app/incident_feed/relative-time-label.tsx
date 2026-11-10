"use client";

import { useEffect, useState } from "react";
import { formatRelativeTime } from "./relative-time";

const TICK_MS = 30_000;

// The label is computed from the browser's clock, so it can differ from the
// server-rendered text at a boundary; hydration warnings are suppressed on
// this element only.
export function RelativeTime({ iso }: { iso: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <time dateTime={iso} title={new Date(iso).toLocaleString()} suppressHydrationWarning>
      {formatRelativeTime(iso, now)}
    </time>
  );
}
