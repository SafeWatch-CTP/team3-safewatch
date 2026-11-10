/**
 * FEED TAB
 * URL: /incident_feed[?category=FIRE]
 *
 * Recent active incidents, newest first, narrowed by an optional category.
 * Runs on the server and reads through the domain package; the category comes
 * from the query string and is validated, never trusted.
 * Behavior: docs/specs/incidents/incident-feed.md
 *
 * force-dynamic: every request (and every refresh) re-reads the list.
 */

import { ListRecentIncidentsSchema } from "@project/domain";
import { Suspense } from "react";
import { SectionErrorBoundary } from "../_components/section-error-boundary";
import { CategoryFilter } from "./category-filter";
import { FeedRefresh } from "./feed-refresh";
import { IncidentFeedList, IncidentFeedListSkeleton } from "./incident-feed-list";
import { requireSignedIn } from "./require-signed-in";

export const dynamic = "force-dynamic";

export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string | string[] }>;
}) {
  await requireSignedIn();

  const { category } = ListRecentIncidentsSchema.parse(await searchParams);

  return (
    <main className="space-y-5 px-2 pt-2 pb-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[32px] font-extrabold leading-[1.05] tracking-tight text-fg">
            <span className="font-medium text-accent">Incident</span>
            <br />
            <span className="font-light text-fg">Feed</span>
          </h1>
          <p className="mt-2 text-sm font-medium leading-[1.5] text-fg/75">
            What just happened, newest first.
          </p>
        </div>
        <FeedRefresh />
      </header>

      <CategoryFilter current={category} />

      <SectionErrorBoundary title="the incident feed">
        <Suspense key={category ?? "all"} fallback={<IncidentFeedListSkeleton />}>
          <IncidentFeedList category={category} />
        </Suspense>
      </SectionErrorBoundary>
    </main>
  );
}
