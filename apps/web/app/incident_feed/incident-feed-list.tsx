import Link from "next/link";
import { listRecentIncidents, type ListRecentIncidentsInput } from "@project/domain";
import { RefreshButton } from "../_components/refresh-button";
import { categoryLabel, SEVERITY_LABELS } from "./labels";
import { RelativeTime } from "./relative-time-label";

export async function IncidentFeedList({ category }: { category: ListRecentIncidentsInput["category"] }) {
  const incidents = await listRecentIncidents({ category });

  if (incidents.length === 0) {
    return (
      <div className="space-y-3 rounded-2xl border border-dashed border-border bg-surface p-6 text-center">
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
            className="block space-y-2 rounded-2xl border border-border bg-surface p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-semibold text-fg">{incident.title}</h2>
              <span className="shrink-0 rounded-full bg-tint px-2 py-0.5 text-xs font-semibold text-accent-deep">
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
          <div key={row} className="h-28 animate-pulse rounded-2xl border border-border bg-surface" />
        ))}
      </div>
    </div>
  );
}
