# Build report

## Tools and techniques

- **Lovable** to scaffold and iterate the app, with the AI agent handling design tokens, route generation, RLS-aware queries, and seed data.
- **TanStack Start v1 (React 19, Vite 7)** for SSR-friendly file-based routing. Each major page is its own route file (`/`, `/explore`, `/events/$slug`, `/hosts/$slug`, dashboard subtree) so URLs are shareable, indexable, and have their own metadata.
- **Lovable Cloud (Postgres + Auth + Storage)** as the backend. Twelve tables, row-level security on every one, and a `SECURITY DEFINER` helper `is_host_member()` to keep policies out of recursion.
- **Database trigger for waitlist promotion**. When a "going" RSVP cancels or capacity is increased, `promote_waitlist(event_id)` runs and bumps the next FIFO waitlist record to "going" — no edge function or cron needed.
- **Server function (`createServerFn`) with the admin client** to join `auth.users` for real attendee emails in the CSV export, while keeping every other read on the user-scoped client (RLS still applies).
- **Tailwind v4 with a "warm community" design system** in `src/styles.css` — sand backgrounds, clay neutrals, ember accent, Syne + Plus Jakarta Sans typography. Components use semantic tokens only, no raw colors.
- **`qrcode` package** for client-side QR generation (no server image rendering needed).
- **`.ics` file generation** built directly into `src/lib/format.ts` so attendees can add the event to any calendar.
- **CSV export with UTF-8 BOM** so Excel and Google Sheets both open it cleanly.

## What worked

- **RLS + helper functions**. Pushing access logic into the database meant the React layer is mostly "fetch and render" — no manual permission checks.
- **The waitlist trigger** is the most satisfying piece. Cancelling an RSVP from the attendee UI Just Works because the database promotes the next person automatically.
- **TanStack Start's file-based routes** kept navigation type-safe; renaming or adding a route flagged every broken link at build time.
- **Seed data via the service role** (one-shot script + a single SQL insert) gave realistic demo content — host, upcoming + past events, mixed RSVPs, gallery photos, feedback — without polluting the schema with seed-specific code.

## What did not

- **Email lookup from the client is impossible** — `auth.users` is not exposed to the browser. The first attempt put email columns into the CSV via `supabase-js`, which silently returned nulls. Solution: a `createServerFn` with `requireSupabaseAuth` middleware (verifies the caller is a host member) plus `supabaseAdmin.auth.admin.listUsers()`.
- **Storage uploads for gallery / cover images** ended up out of scope for the first pass. The schema and buckets exist, but the UI takes URLs rather than file uploads — a fast follow-up.
- **Camera-based QR scanning** at the door is also out of scope. The check-in page accepts typed codes (and external scanners that emulate a keyboard, which is what most door staff use anyway).
- **Avoiding stub routes**: an early iteration shipped placeholder routes (`edit`, `attendees`, `members`, `moderation`) just to get the dashboard's `<Link>`s to typecheck. They had to be replaced before any of the dashboard flows were actually usable.

## Notable decisions

- **Email + password only**, no Google / magic links, per the brief. Auto-confirm is on for the demo.
- **Free events only** for v1. The schema has `is_paid` reserved and the UI shows a disabled "Paid" toggle with a "coming soon" tooltip — the field exists so future work doesn't need a migration.
- **Two roles per host**: `host` (full control) and `checker` (door only). Roles live in `host_members`, never on the user/profile row, to avoid the classic privilege-escalation pattern.
- **Moderation is intentionally minimal**: a single `/dashboard/moderation` page lists pending photos and open reports with Approve / Hide / Dismiss. Enough to actually run the platform without overbuilding.
- **Waitlist position is FIFO** by `created_at` (with `waitlist_position` as a tiebreaker). Simple, predictable, and matches what people expect.
- **Public/Unlisted toggle** instead of full visibility states; "unlisted" events are excluded from `/explore` but the URL works for anyone who has it.

## Deliverables in this repo

- `README.md` — usage guide for the four core flows + demo accounts.
- `report.md` — this file.
- `sample-exports/attendees-sample.csv` — example CSV in the exact schema the live exporter produces.