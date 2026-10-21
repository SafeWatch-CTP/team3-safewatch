export function profileCompletionRedirect(
  phoneNumber: string | null | undefined,
) {
  return phoneNumber?.trim() ? null : "/signup";
}
