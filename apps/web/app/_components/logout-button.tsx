import { signOut } from "@project/auth/auth";

export function LogoutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <button
        type="submit"
        className="rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-fg transition hover:bg-panel focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
      >
        Logout
      </button>
    </form>
  );
}
