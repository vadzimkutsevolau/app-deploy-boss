export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60) + "-" + Math.random().toString(36).slice(2, 6);
}

export function formatEventDate(starts: string, ends: string, tz?: string) {
  const s = new Date(starts);
  const e = new Date(ends);
  const sameDay = s.toDateString() === e.toDateString();
  const dateStr = s.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeS = s.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const timeE = e.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (sameDay) return `${dateStr} · ${timeS} – ${timeE}${tz ? ` ${tz}` : ""}`;
  const dateE = e.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${dateStr} ${timeS} – ${dateE} ${timeE}${tz ? ` ${tz}` : ""}`;
}

export function isPast(dateIso: string): boolean {
  return new Date(dateIso).getTime() < Date.now();
}

export function buildIcsFile(opts: {
  title: string;
  description?: string;
  location?: string;
  starts: string;
  ends: string;
  uid: string;
}): string {
  const fmt = (d: string) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (s: string) => s.replace(/[\n,;]/g, (m) => ({ "\n": "\\n", ",": "\\,", ";": "\\;" })[m]!);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Gather//EN",
    "BEGIN:VEVENT",
    `UID:${opts.uid}@gather.local`,
    `DTSTAMP:${fmt(new Date().toISOString())}`,
    `DTSTART:${fmt(opts.starts)}`,
    `DTEND:${fmt(opts.ends)}`,
    `SUMMARY:${esc(opts.title)}`,
    opts.description ? `DESCRIPTION:${esc(opts.description)}` : "",
    opts.location ? `LOCATION:${esc(opts.location)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

export function downloadFile(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}