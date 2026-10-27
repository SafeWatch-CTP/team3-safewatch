"use client";

// Client boundary for the map. Leaflet needs a browser, and `ssr: false` is
// only allowed inside a client component, so the server-rendered page imports
// this file rather than incident-map-leaflet.tsx directly.
import dynamic from "next/dynamic";
import type { IncidentMapProps } from "./incident-map-leaflet";

const IncidentMapLeaflet = dynamic(
  () => import("./incident-map-leaflet").then((module) => module.IncidentMapLeaflet),
  {
    ssr: false,
    // Same box as the map, so nothing shifts when it arrives.
    loading: () => (
      <div className="flex h-80 w-full items-center justify-center rounded-lg border border-neutral-300 bg-neutral-100 text-sm text-neutral-700">
        Loading map…
      </div>
    ),
  }
);

export function IncidentMap(props: IncidentMapProps) {
  return <IncidentMapLeaflet {...props} />;
}
