import { auth, signIn } from "@project/auth/auth";
import { listActiveIncidents } from "@project/domain";
import { getAuthErrorNotice } from "./_components/auth-error-notice";
import { LogoutButton } from "./_components/logout-button";
import { profileCompletionRedirect } from "./_components/profile-access";
import { LocationPicker } from "./_components/location-picker";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

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
  const incidents = await listActiveIncidents();

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

      <section className="rounded-lg border border-neutral-200 bg-neutral-50 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Latest safety feed</h2>
          <a href="/api/health" className="text-sm text-blue-600 underline">
            Health check
          </a>
        </div>

        <div className="space-y-3">
          {incidents.length === 0 ? (
            <p className="text-neutral-600">No active incidents right now.</p>
          ) : (
            incidents.map((incident) => (
              <article
                key={incident.id}
                className="rounded border border-neutral-200 bg-white p-4 shadow-sm"
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