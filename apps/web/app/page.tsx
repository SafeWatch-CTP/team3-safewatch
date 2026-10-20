import { currentUserId } from "@project/auth";
import { listActiveIncidents } from "@project/domain";
import { IncidentMapSection } from "./_components/incident-map-section";
import { incidentAnchorId } from "./_components/incident-map-model";
import { LocationPicker } from "./_components/location-picker";

export const dynamic = "force-dynamic";

const INCIDENT_LIST_ID = "incident-list";

export default async function Home() {
  const userId = await currentUserId();
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
    <main className="space-y-8 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Active incidents</h1>
        <p className="text-sm text-neutral-500">
          Signed in as <code className="rounded bg-neutral-100 px-1">{userId}</code>
        </p>
      </header>

      <LocationPicker />

      <IncidentMapSection incidents={mapIncidents} listId={INCIDENT_LIST_ID} />

      {/* tabIndex -1: the skip link moves focus here. */}
      <section
        id={INCIDENT_LIST_ID}
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
            <p className="text-neutral-600">No active incidents right now.</p>
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
    </main>
  );
}
