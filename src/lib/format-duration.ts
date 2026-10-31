/** "24h total" on Home's cards: whole hours, at least 1 when there's any content. */
export function formatTotalHours(seconds: number): string {
  const hours = seconds > 0 ? Math.max(1, Math.round(seconds / 3600)) : 0;
  return `${hours}h total`;
}

/** "12h 45m" on Explore's cards ("45m" under an hour). */
export function formatHoursMinutes(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

/** "Good morning," before noon, "Good afternoon," before 6 pm, then "Good evening,". */
export function greeting(now = new Date()): string {
  const hour = now.getHours();
  return hour < 12 ? "Good morning," : hour < 18 ? "Good afternoon," : "Good evening,";
}

/** "08:45" for lesson lengths and the player clock ("1:02:03" past an hour). */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${String(m).padStart(2, "0")}:${s}`;
}
