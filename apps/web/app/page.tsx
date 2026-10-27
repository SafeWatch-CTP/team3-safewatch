import { auth, signIn } from "@project/auth/auth";
import { Suspense } from "react";
import { IncidentFeed, IncidentFeedSkeleton } from "./_components/incident-feed";
import { SectionErrorBoundary } from "./_components/section-error-boundary";
import { getAuthErrorNotice } from "./_components/auth-error-notice";
import { LogoutButton } from "./_components/logout-button";
import { profileCompletionRedirect } from "./_components/profile-access";
import { LocationPicker } from "./_components/location-picker";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const INCIDENT_LIST_ID = "incident-list";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const [session, params] = await Promise.all([auth(), searchParams]);

  if (!session?.user?.id) {
    const notice = getAuthErrorNotice(params.error);
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center gap-6">
        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
            SafeWatch
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Safety starts with staying connected.
          </h1>
          <p className="text-neutral-600">
            Sign in with GitHub to continue to your safety dashboard.
          </p>
        </header>

        {notice && (
          <p
            role="alert"
            className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
          >
            {notice}
          </p>
        )}

        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-lg bg-neutral-900 px-5 py-3 font-semibold text-white transition hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
          >
            Continue with GitHub
          </button>
        </form>
      </main>
    );
  }

  const profileRedirect = profileCompletionRedirect(session.user.phoneNumber);
  if (profileRedirect) redirect(profileRedirect);

  const userId = session.user.id;

  return (
    <main className="space-y-8 p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Active incidents</h1>
          <p className="text-sm text-neutral-500">
            Signed in as <code className="rounded bg-neutral-100 px-1">{userId}</code>
          </p>
        </div>
        <LogoutButton />
      </header>

      <LocationPicker />

      {/* The feed streams in behind its own skeleton; a failed read replaces
          only this section with a retry card. */}
      <SectionErrorBoundary title="the incident feed">
        <Suspense fallback={<IncidentFeedSkeleton />}>
          <IncidentFeed listId={INCIDENT_LIST_ID} />
        </Suspense>
      </SectionErrorBoundary>
    </main>
  );
}
