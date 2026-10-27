// The map and the feed share one read, so they load, fail and retry together.
// page.tsx wraps this in a Suspense boundary (skeleton) and a
// SectionErrorBoundary (retry card). States: docs/specs/incidents/incident-map.md.
import { listActiveIncidents } from "@project/domain";
import { IncidentMapSection } from "./incident-map-section";
import { incidentAnchorId } from "./incident-map-model";
import { RefreshButton } from "./refresh-button";

export async function IncidentFeed({ listId }: { listId: string }) {
  const incidents = await listActiveIncidents();

  // Only what the map shows crosses to the client.
  const mapIncidents = incidents.map(
    ({ id, title, severity, category, address, latitude, longitude }) => ({
      id,
      title,
      severity,
      category,
      address,
      latitude,
      longitude,
    })
  );

  return (
    <>
      <IncidentMapSection incidents={mapIncidents} listId={listId} />

      {/* tabIndex -1: the skip link moves focus here. */}
      <section
        id={listId}
        tabIndex={-1}
        aria-labelledby="incident-list-heading"
        className="rounded-lg border border-neutral-200 bg-neutral-50 p-6 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="incident-list-heading" className="text-lg font-semibold">
            Latest safety feed
          </h2>
          <a href="/api/health" className="text-sm text-blue-600 underline">
            Health check
          </a>
        </div>

        <div className="space-y-3">
          {incidents.length === 0 ? (
            <div className="space-y-3 rounded border border-dashed border-neutral-300 bg-white p-6 text-center">
              <p className="text-neutral-600">No active incidents right now.</p>
              <RefreshButton label="Check again" pendingLabel="Checking…" />
            </div>
          ) : (
            incidents.map((incident) => (
              // tabIndex -1: a map popup's "Show in list" link moves focus here.
              <article
                key={incident.id}
                id={incidentAnchorId(incident.id)}
                tabIndex={-1}
                className="rounded border border-neutral-200 bg-white p-4 shadow-sm focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
              >
                <div className="mb-2 flex items-center justify-between gap-4">
                  <h3 className="font-semibold">{incident.title}</h3>
                  <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                    {incident.severity}
                  </span>
                </div>
                <div className="text-sm text-neutral-600">
                  <p>{incident.category}</p>
                  <p>{incident.address ?? "Location unavailable"}</p>
                  <p>{new Date(incident.createdAt).toLocaleString()}</p>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </>
  );
}

// Same footprint as the map and three feed cards, so nothing jumps when the
// data arrives.
export function IncidentFeedSkeleton() {
  return (
    <div aria-busy="true" className="space-y-8">
      <p role="status" className="sr-only">
        Loading incidents…
      </p>
      <div aria-hidden="true" className="space-y-3">
        <div className="h-6 w-40 animate-pulse rounded bg-neutral-200" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded bg-neutral-200" />
        <div className="h-80 animate-pulse rounded-lg bg-neutral-200" />
      </div>
      <div aria-hidden="true" className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-6">
        <div className="mb-4 h-6 w-48 animate-pulse rounded bg-neutral-200" />
        {[0, 1, 2].map((row) => (
          <div key={row} className="h-24 animate-pulse rounded border border-neutral-200 bg-white" />
        ))}
      </div>
    </div>
  );
}
