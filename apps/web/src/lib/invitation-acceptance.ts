export function removeFarmInvitationToken(currentUrl: string): string {
  const nextUrl = new URL(currentUrl);
  nextUrl.searchParams.delete("invite");
  return nextUrl.toString();
}
