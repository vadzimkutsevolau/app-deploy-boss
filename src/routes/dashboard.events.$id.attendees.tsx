import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { downloadFile } from "@/lib/format";
import { toast } from "sonner";
import { getAttendeeContacts } from "@/server/users.functions";
import type { EventRow, RsvpRow } from "@/lib/queries";

export const Route = createFileRoute("/dashboard/events/$id/attendees")({
  component: AttendeesPage,
});

type Row = RsvpRow & { display_name: string | null; email: string | null };

function AttendeesPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: ev } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
    setEvent((ev as EventRow) ?? null);
    const { data: rsvps } = await supabase
      .from("rsvps")
      .select("*")
      .eq("event_id", id)
      .order("created_at", { ascending: true });
    let contacts: Record<string, { email: string | null; display_name: string | null }> = {};
    try {
      const res = await getAttendeeContacts({ data: { eventId: id } });
      contacts = res.contacts;
    } catch (e) {
      console.warn("Could not load contacts", e);
    }
    const merged: Row[] = ((rsvps ?? []) as RsvpRow[]).map((r) => ({
      ...r,
      email: contacts[r.user_id]?.email ?? null,
      display_name: contacts[r.user_id]?.display_name ?? null,
    }));
    setRows(merged);
    setLoading(false);
  }, [id]);

  useEffect(() => { if (user) load(); }, [user, load]);

  if (!user) return <div className="p-10 text-center">Please sign in.</div>;
  if (loading) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  if (!event) return <div className="p-10 text-center">Event not found.</div>;

  const filtered = rows.filter((r) => {
    const q = filter.toLowerCase().trim();
    if (!q) return true;
    return (
      (r.display_name ?? "").toLowerCase().includes(q) ||
      (r.email ?? "").toLowerCase().includes(q) ||
      r.ticket_code.toLowerCase().includes(q) ||
      r.status.includes(q)
    );
  });

  const going = rows.filter((r) => r.status === "going").length;
  const waitlist = rows.filter((r) => r.status === "waitlist").length;
  const cancelled = rows.filter((r) => r.status === "cancelled").length;
  const checkedIn = rows.filter((r) => r.checked_in_at).length;

  const exportCsv = () => {
    const header = ["name", "email", "status", "ticket_code", "rsvp_at", "checked_in_at", "waitlist_position"];
    const escape = (v: string | number | null) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [header.join(",")].concat(
      rows.map((r) =>
        [
          r.display_name,
          r.email,
          r.status,
          r.ticket_code,
          r.created_at,
          r.checked_in_at,
          r.waitlist_position,
        ].map(escape).join(",")
      )
    );
    // UTF-8 BOM for Excel compatibility
    downloadFile(`${event.slug}-attendees.csv`, "\uFEFF" + lines.join("\n"), "text/csv;charset=utf-8");
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link to="/dashboard" className="text-sm text-primary">← Back to dashboard</Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{event.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {going} going · {waitlist} waitlist · {checkedIn} checked-in · {cancelled} cancelled
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/checkin/$eventId" params={{ eventId: event.id }}>
            <Button variant="outline">Open check-in</Button>
          </Link>
          <Button onClick={exportCsv}>Export CSV</Button>
        </div>
      </div>

      <div className="mt-6">
        <Input placeholder="Search by name, email, or ticket…" value={filter} onChange={(e) => setFilter(e.target.value)} />
      </div>

      <div className="mt-4 rounded-2xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Ticket</th>
              <th className="px-4 py-2">Checked in</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No attendees match.</td></tr>
            ) : filtered.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2">{r.display_name ?? "—"}</td>
                <td className="px-4 py-2 text-muted-foreground">{r.email ?? "—"}</td>
                <td className="px-4 py-2">
                  <Badge variant={r.status === "going" ? "default" : r.status === "waitlist" ? "secondary" : "outline"}>
                    {r.status}{r.waitlist_position ? ` #${r.waitlist_position}` : ""}
                  </Badge>
                </td>
                <td className="px-4 py-2 font-mono text-xs">{r.ticket_code}</td>
                <td className="px-4 py-2 text-muted-foreground">
                  {r.checked_in_at ? new Date(r.checked_in_at).toLocaleString() : "—"}
                </td>
                <td className="px-4 py-2 text-right">
                  <RemoveBtn rsvpId={r.id} onDone={load} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RemoveBtn({ rsvpId, onDone }: { rsvpId: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={busy}
      onClick={async () => {
        if (!confirm("Cancel this RSVP?")) return;
        setBusy(true);
        const { error } = await supabase.from("rsvps").update({ status: "cancelled" }).eq("id", rsvpId);
        setBusy(false);
        if (error) toast.error(error.message);
        else { toast.success("Cancelled"); onDone(); }
      }}
    >
      Remove
    </Button>
  );
}