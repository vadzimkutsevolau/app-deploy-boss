# Gather — Community Event Hosting

A lightweight platform for publishing free community events, collecting RSVPs with QR tickets, and running check-in at the door.

## The four core flows

### 1. Publish

1. Sign up at `/auth` (email + password — no confirmation email needed in demo mode).
2. Click **Become a host** in the user menu (or visit `/host/new`). Provide a host name, short bio, and contact email.
3. From the **Dashboard**, click **+ New event**.
4. Fill in title, description, start/end times, venue (or online link), capacity, and a cover image URL.
5. Choose **Public** (searchable on Explore) or **Unlisted** (link-only). The Paid toggle is reserved for a future release and is disabled with a tooltip.
6. Click **Publish** (or **Save draft** to keep working).
7. Share the event URL — `/events/<slug>` — anywhere. The page renders Open Graph metadata for social previews.

### 2. RSVP

1. Anyone can browse events at `/explore` or open a shared event page.
2. On the event page, click **RSVP**. If signed out, you'll be sent to sign-in and returned to the same event after.
3. If capacity is reached, the button reads **Join waitlist** instead — your position is shown.
4. You can cancel your RSVP at any time. When a confirmed attendee cancels (or capacity is increased), the next person on the waitlist is automatically promoted to "going" with a fresh ticket.

### 3. Ticket

1. As soon as you RSVP, a ticket modal pops up with a unique QR code and 10-character ticket code.
2. Use **Add to calendar** to download an `.ics` file that imports into Google / Apple / Outlook.
3. All upcoming tickets live at `/tickets` so you can pull them up at the door.

### 4. Check-in

1. From the **Dashboard**, click **Check-in** on any event. (Hosts and Checkers only.)
2. The page shows live counters: Going, Checked-in, Remaining.
3. Type the attendee's ticket code (case-insensitive) and press Enter, or scan a QR code with any external scanner that types into the field.
4. Duplicate scans are rejected with a clear toast.
5. Use **Undo last** to reverse the most recent check-in.

## Other things the app does

- **Hosts dashboard** with Upcoming/Past events and quick actions (Edit, Attendees, Check-in).
- **Attendees / CSV export** at `/dashboard/events/<id>/attendees` — exports a UTF-8 BOM CSV (opens cleanly in Excel and Google Sheets) with name, email-id, status, ticket code, and check-in time. A schema sample is in `sample-exports/attendees-sample.csv`.
- **Roles**: each host has Host (full management) and Checker (door check-in only) members.
- **Public host page** at `/hosts/<slug>` aggregates that host's published events.
- **Gallery uploads** on event pages — pending host approval before they're shown publicly.
- **Post-event feedback** (1–5 stars + comment) shown after the end time.
- **Reports** on events and photos for moderation review.

## Tech

- TanStack Start (React 19, file-based routing) on Vite 7
- Tailwind v4 with a warm "community" design system (Syne + Plus Jakarta Sans)
- Lovable Cloud (PostgreSQL + Auth + Storage) for the backend
- Row-level security on every table; waitlist promotion via a database trigger
- `qrcode` for client-side QR rendering

See `report.md` for build notes and decisions.