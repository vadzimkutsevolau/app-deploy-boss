
# Gather — Community Event Hosting Platform

A warm, community-focused tool to publish free events, collect RSVPs, hand out QR tickets, and run check-in at the door.

## Design direction

- **Palette**: warm sand backgrounds (#faf8f5, #f0ebe3), clay neutrals (#c9b99a), ember accent (#e85d3a) for primary actions.
- **Typography**: Syne for headings (distinctive, creative), Plus Jakarta Sans for body (friendly, readable).
- **Feel**: rounded corners, generous whitespace, tactile buttons, soft shadows. Inviting rather than corporate.

## Auth

- Email + password sign-up/sign-in via Lovable Cloud.
- Browsing is fully public; only RSVP, hosting, and dashboards require sign-in.
- After sign-in from an RSVP click, user is returned to the event page.

## Data model (high level)

- **profiles** — user display name, avatar.
- **hosts** — name, logo, short bio, contact email, slug. A user becomes a host by creating one.
- **host_members** — (host_id, user_id, role: `host` | `checker`).
- **host_invites** — token, host_id, role, expiry. Copyable link consumes the token on sign-in.
- **events** — host_id, title, description, starts_at, ends_at, timezone, venue/online link, capacity, cover image, visibility (`public` | `unlisted`), status (`draft` | `published`), is_paid (always false; toggle disabled in UI).
- **rsvps** — event_id, user_id, status (`going` | `waitlist` | `cancelled`), position (for waitlist FIFO), ticket_code (unique), checked_in_at.
- **gallery_photos** — event_id, user_id, url, status (`pending` | `approved` | `hidden`).
- **feedback** — event_id, user_id, rating 1–5, comment.
- **reports** — target_type (`event` | `photo`), target_id, reason, status (`open` | `hidden` | `dismissed`).

All tables protected by RLS. A `user_roles`-style helper (`is_host_member(host_id, role)`) keeps role checks server-side. Waitlist promotion runs in a database trigger on RSVP cancellation or capacity update.

## Pages & flows

### Public
- **/** — landing with hero, featured upcoming events, CTA to explore.
- **/explore** — text search, date range (defaults to Upcoming), location filter, "Include Past" toggle. Past events show an "Ended" badge and no RSVP button.
- **/events/$slug** — full event page with cover, description, host card, share metadata (og:title/description/image). RSVP button (or Join Waitlist when full). Past events show "Ended" and hide RSVP.
- **/hosts/$slug** — public host page with bio, logo, contact, list of upcoming + past events.

### Attendee
- **/tickets** — all upcoming tickets with QR code, calendar download (.ics), cancel button.
- **Ticket modal** — large QR (rendered from unique code), event details, "Add to Calendar".

### Hosting
- **/host/new** — self-serve host registration.
- **/dashboard** — host's events split Upcoming / Past, per-event stats (Going, Waitlist, Checked-in), quick actions.
- **/dashboard/events/new** and **/edit/$id** — event editor with Free/Paid toggle (Paid disabled with "Coming soon" tooltip), Publish/Unpublish/Duplicate.
- **/dashboard/events/$id/attendees** — attendee list with CSV export (name, email, RSVP status, check-in time; UTF-8 BOM so Excel + Sheets open it cleanly).
- **/dashboard/members** — invite Host or Checker via copyable link, list current members.
- **/dashboard/moderation** — review queue for reported events/photos and pending gallery uploads (basic UI).

### Check-in
- **/checkin/$eventId** — accessible to Host and Checker members. Manual code entry input, live counters (Going / Checked-in / Remaining), recent scans list, "Undo last" button, duplicate-scan prevention with clear feedback.

### My Events
- **/my-events** — aggregates events where the user holds any role; filters by host, date range, text; quick actions vary by role (Checker only sees "Open check-in").

### Post-event
- After event ends, attendees with a `going` RSVP see a feedback form on the event page (1–5 stars + optional comment).
- Anyone signed in can submit a photo to the gallery; only approved photos render publicly.
- "Report" button on event and photo cards opens a reason form; reports flow to the host's moderation queue.

## Notable behaviors

- **Waitlist FIFO**: cancel/capacity-increase trigger promotes the lowest-position waitlist entry to `going` and assigns a ticket code; promoted user sees a banner on `/tickets` and on the event page.
- **QR codes**: generated client-side from each ticket's unique code using a QR library; manual entry on check-in is the canonical path.
- **CSV**: served via a server function returning `text/csv` with BOM; filename includes event slug.
- **Share metadata**: each event/host route sets its own `head()` with og tags including the cover image.

## Seeded content

On first run, seed:
- 1 demo host ("Riverside Collective") with logo and bio.
- 1 upcoming public event (~2 weeks out).
- 1 past public event (~2 weeks ago) with a couple of approved gallery photos and one feedback entry.
- A sample CSV export saved into the repo (`/sample-exports/attendees-sample.csv`).

## Deliverables in repo

- **README.md** — usage guide walking through Publish → RSVP → Ticket → Check-in, plus host invites and moderation.
- **report.md** — tools/techniques used, what worked, what didn't, key decisions (waitlist via DB trigger, manual-only check-in, deferred paid events).
- **sample-exports/attendees-sample.csv** — example export with the documented schema.

## Scope notes (per your "core + defer moderation polish" choice)

Moderation queue and gallery approval are functional but intentionally minimal — a single list with Approve / Hide / Dismiss actions, no advanced filtering or bulk tools. Everything else is built to spec.

## Out of scope

- Paid ticketing (toggle present but disabled).
- Camera-based QR scanning (manual code entry only, per spec).
- Email notifications (waitlist promotion shown in-app only).
- SSO / social login.

After you approve, I'll set up Lovable Cloud, build the schema and RLS, scaffold the routes, and seed the demo data. Expect this to land in a few iterations — I'll start with auth + data model + event publishing + RSVP/ticket, then layer check-in, waitlist, moderation, and seed data.
