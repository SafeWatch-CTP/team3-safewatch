"use client";

import { useMemo, useState } from "react";
import { calculateMarkerPosition, resolveSelectedIncidentId } from "../lib/home-dashboard";

type IncidentDashboardItem = {
  id: string;
  title: string;
  status: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | string;
  category: string | null;
  address: string | null;
  createdAt: Date | string;
  latitude: number;
  longitude: number;
};

const severityStyles: Record<string, string> = {
  CRITICAL: "bg-rose-500/15 text-rose-200 ring-1 ring-inset ring-rose-400/40",
  HIGH: "bg-amber-500/15 text-amber-200 ring-1 ring-inset ring-amber-400/40",
  MEDIUM: "bg-yellow-500/15 text-yellow-200 ring-1 ring-inset ring-yellow-400/40",
  LOW: "bg-emerald-500/15 text-emerald-200 ring-1 ring-inset ring-emerald-400/40",
};

export function IncidentDashboard({
  incidents,
  userId,
}: {
  incidents: IncidentDashboardItem[];
  userId: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(() => resolveSelectedIncidentId(incidents, incidents[0]?.id ?? null));

  const selectedIncident = useMemo(
    () => incidents.find((incident) => incident.id === selectedId) ?? incidents[0] ?? null,
    [incidents, selectedId],
  );

  const liveAlertCount = incidents.filter((incident) => incident.severity === "CRITICAL" || incident.severity === "HIGH").length;

  if (!incidents.length || !selectedIncident) {
    return (
      <main className="rounded-3xl border border-slate-200 bg-white p-10 text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
        <h1 className="text-2xl font-semibold">Home</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-400">No nearby incidents are currently active for this user.</p>
      </main>
    );
  }

  return (
    <main className="w-full rounded-3xl border border-slate-200 bg-slate-50 p-3 shadow-lg shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-950 dark:shadow-none sm:p-5">
      <header className="mb-5 flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">SafeWatch</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Home dashboard</h1>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" aria-hidden="true" />
          <span>{liveAlertCount} live alerts</span>
        </div>
      </header>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Signed in as</p>
          <p className="font-medium text-slate-900 dark:text-slate-100">{userId}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <span className="rounded-full bg-slate-200 px-2 py-1 dark:bg-slate-700">{incidents.length} incidents</span>
          <span className="rounded-full bg-blue-500/10 px-2 py-1 text-blue-700 dark:text-blue-300">Updated live</span>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Incident map</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Focus the latest active reports around your location.</p>
            </div>
          </div>

          <div className="relative h-[560px] overflow-hidden bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.12),_transparent_55%),linear-gradient(135deg,_#e2e8f0,_#f8fafc)] dark:bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.2),_transparent_55%),linear-gradient(135deg,_#0f172a,_#111827)]">
            <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(to_right,_rgba(148,163,184,0.2)_1px,_transparent_1px),linear-gradient(to_bottom,_rgba(148,163,184,0.2)_1px,_transparent_1px)] [background-size:32px_32px]" aria-hidden="true" />

            {incidents.map((incident) => {
              const position = calculateMarkerPosition(incident);
              const isSelected = incident.id === selectedIncident.id;

              return (
                <button
                  key={incident.id}
                  type="button"
                  aria-label={`Focus incident ${incident.title}`}
                  aria-pressed={isSelected}
                  tabIndex={0}
                  onClick={() => setSelectedId(incident.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedId(incident.id);
                    }
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide shadow-lg transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                    isSelected
                      ? "scale-110 border-white bg-sky-500 text-white shadow-sky-500/35"
                      : "border-slate-900/10 bg-slate-900 text-white hover:scale-105"
                  }`}
                  style={{ left: `${position.left}%`, top: `${position.top}%` }}
                >
                  {incident.severity.slice(0, 1)}
                </button>
              );
            })}

            <div className="absolute bottom-4 left-4 rounded-2xl border border-slate-200 bg-white/90 p-3 text-sm text-slate-700 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-200">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Selected</p>
              <p className="mt-1 font-medium">{selectedIncident.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{selectedIncident.address ?? "Location unavailable"}</p>
            </div>
          </div>
        </section>

        <aside className="rounded-3xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between px-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Incidents</h2>
            <span className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Feed</span>
          </div>

          <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1">
            {incidents.map((incident) => {
              const isSelected = incident.id === selectedIncident.id;

              return (
                <button
                  key={incident.id}
                  type="button"
                  onClick={() => setSelectedId(incident.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedId(incident.id);
                    }
                  }}
                  className={`w-full rounded-2xl border p-4 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                    isSelected
                      ? "border-sky-500 bg-sky-500/5 shadow-sm shadow-sky-500/10 dark:border-sky-400 dark:bg-sky-500/10"
                      : "border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/60 hover:dark:border-slate-600"
                  }`}
                  aria-pressed={isSelected}
                  tabIndex={0}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{incident.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{incident.category ?? "Uncategorized"}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${severityStyles[incident.severity] ?? "bg-slate-500/10 text-slate-200"}`}>
                      {incident.severity}
                    </span>
                  </div>

                  <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{incident.address ?? "Location unavailable"}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>{incident.status}</span>
                    <span>{new Date(incident.createdAt).toLocaleString()}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </main>
  );
}
