import { auth } from "@project/auth/auth";
import { redirect } from "next/navigation";
import { LogoutButton } from "../_components/logout-button";
import { profileCompletionRedirect } from "../_components/profile-access";
import { SignUpForm } from "./signup-form";

export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  const session = await auth();

  if (!session?.user?.id) redirect("/");
  if (!profileCompletionRedirect(session.user.phoneNumber)) redirect("/");

  return (
    <>
      <div className="fixed right-6 top-6 z-10">
        <LogoutButton />
      </div>
      <SignUpForm initialName={session.user.name ?? ""} />
    </>
  );
}
