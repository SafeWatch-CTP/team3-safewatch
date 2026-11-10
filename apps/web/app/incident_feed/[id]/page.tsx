/**
 * INCIDENT DETAIL
 * URL: /incident_feed/[id][?category=FIRE]
 *
 * One incident with its timeline. The id is validated before the database is
 * touched; a malformed or unknown id is a 404. Alerts are never read.
 * The optional category only decides where the back link goes.
 * Behavior: docs/specs/incidents/incident-feed.md
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { GetIncidentByIdSchema, ListRecentIncidentsSchema, getIncidentDetail } from "@project/domain";
import { categoryLabel, SEVERITY_LABELS, STATUS_LABELS } from "../labels";
import { RelativeTime } from "../relative-time-label";
import { requireSignedIn } from "../require-signed-in";

export const dynamic = "force-dynamic";

export default async function IncidentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ category?: string | string[] }>;
}) {
  await requireSignedIn();

  const parsed = GetIncidentByIdSchema.safeParse(await params);
  if (!parsed.success) notFound();

  const incident = await getIncidentDetail(parsed.data.id);
  if (!incident) notFound();

  const { category } = ListRecentIncidentsSchema.parse(await searchParams);
  const backHref = category ? `/incident_feed?category=${category}` : "/incident_feed";

  return (
    <main className="space-y-5 px-2 pt-2 pb-6">
      <div className="-mx-2 min-h-[calc(100dvh-10.5rem)] space-y-5 rounded-3xl border border-white/70 bg-panel/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_8px_32px_rgba(47,85,232,0.15)] backdrop-blur-2xl backdrop-saturate-125">
        <Link
          href={backHref}
          className="inline-block rounded-lg text-sm font-medium text-accent underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          ← Back to feed
        </Link>

        <header className="space-y-2">
          <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight text-fg">
            {incident.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full border border-accent/30 bg-accent/15 px-2 py-0.5 font-semibold text-accent-deep">
              {SEVERITY_LABELS[incident.severity] ?? incident.severity}
            </span>
            <span className="rounded-full border border-white/70 bg-surface/70 px-2 py-0.5 text-muted">
              {STATUS_LABELS[incident.status] ?? incident.status}
            </span>
            <span className="text-muted">{categoryLabel(incident.category)}</span>
          </div>
          <p className="text-sm text-muted">{incident.address ?? "Location unavailable"}</p>
          <p className="text-sm text-muted">
            Reported <RelativeTime iso={incident.createdAt.toISOString()} />
          </p>
        </header>

        {incident.description && (
          <section aria-labelledby="incident-description" className="space-y-1">
            <h2 id="incident-description" className="text-lg font-semibold text-fg">
              Details
            </h2>
            <p className="whitespace-pre-line text-fg/85">{incident.description}</p>
          </section>
        )}

        <section aria-labelledby="incident-timeline" className="space-y-2">
          <h2 id="incident-timeline" className="text-lg font-semibold text-fg">
            Timeline
          </h2>
          {incident.updates.length === 0 ? (
            <p className="text-muted">No updates yet.</p>
          ) : (
            <ol className="space-y-2">
              {incident.updates.map((update) => (
                <li key={update.id} className="space-y-1 rounded-2xl border border-white/70 bg-surface/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_3px_rgba(47,85,232,0.08)] backdrop-blur-md">
                  <p className="text-sm text-muted">
                    <RelativeTime iso={update.createdAt.toISOString()} />
                  </p>
                  <p className="whitespace-pre-line text-fg">{update.message}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </main>
  );
}
