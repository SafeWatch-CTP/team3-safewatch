// "Just now", "5 mins ago", "2 hrs ago", "3 days ago". A time in the future
// (a skewed device clock) reads as "Just now" rather than a negative.
export function formatRelativeTime(from: Date | string, now: Date | number = Date.now()): string {
  const elapsedMs = new Date(now).getTime() - new Date(from).getTime();
  const minutes = Math.floor(elapsedMs / 60_000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return unit(minutes, "min");

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return unit(hours, "hr");

  return unit(Math.floor(hours / 24), "day");
}

function unit(count: number, name: string) {
  return `${count} ${name}${count === 1 ? "" : "s"} ago`;
}
