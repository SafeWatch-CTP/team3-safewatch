import Link from "next/link";
import { listRecentIncidents, type ListRecentIncidentsInput } from "@project/domain";
import { RefreshButton } from "../_components/refresh-button";
import { categoryLabel, SEVERITY_LABELS } from "./labels";
import { RelativeTime } from "./relative-time-label";

export async function IncidentFeedList({ category }: { category: ListRecentIncidentsInput["category"] }) {
  const incidents = await listRecentIncidents({ category });

  if (incidents.length === 0) {
    return (
      <div className="space-y-3 rounded-2xl border border-white/70 bg-surface/70 p-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_3px_rgba(47,85,232,0.08)] backdrop-blur-md">
        {category ? (
          <>
            <p className="text-muted">No {categoryLabel(category)} incidents right now.</p>
            <Link
              href="/incident_feed"
              className="inline-block rounded-lg px-3 py-1.5 text-sm font-medium text-accent underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Show all
            </Link>
          </>
        ) : (
          <>
            <p className="text-muted">No active incidents right now.</p>
            <RefreshButton label="Check again" pendingLabel="Checking…" />
          </>
        )}
      </div>
    );
  }

  const query = category ? `?category=${category}` : "";

  return (
    <ul className="space-y-3">
      {incidents.map((incident) => (
        <li key={incident.id}>
          <Link
            href={`/incident_feed/${incident.id}${query}`}
            className="block space-y-2 rounded-2xl border border-white/70 bg-surface/70 p-4 text-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_3px_rgba(47,85,232,0.08)] backdrop-blur-md transition hover:border-accent/30 hover:shadow-[0_2px_12px_rgba(30,63,196,0.12)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-semibold text-fg">{incident.title}</h2>
              <span className="shrink-0 rounded-full border border-accent/30 bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent-deep">
                {SEVERITY_LABELS[incident.severity] ?? incident.severity}
              </span>
            </div>
            <div className="space-y-0.5 text-sm text-muted">
              <p>{categoryLabel(incident.category)}</p>
              <p>{incident.address ?? "Location unavailable"}</p>
              <p>
                <RelativeTime iso={incident.createdAt.toISOString()} />
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// Same footprint as three cards, so nothing jumps when the list arrives.
export function IncidentFeedListSkeleton() {
  return (
    <div aria-busy="true">
      <p role="status" className="sr-only">
        Loading incidents…
      </p>
      <div aria-hidden="true" className="space-y-3">
        {[0, 1, 2].map((row) => (
          <div key={row} className="h-28 animate-pulse rounded-2xl border border-white/70 bg-surface/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_3px_rgba(47,85,232,0.08)] backdrop-blur-md" />
        ))}
      </div>
    </div>
  );
}
