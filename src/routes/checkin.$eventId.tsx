import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, Undo2 } from "lucide-react";
import type { EventRow, RsvpRow } from "@/lib/queries";

export const Route = createFileRoute("/checkin/$eventId")({
  component: CheckInPage,
});

function CheckInPage() {
  const { eventId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState<RsvpRow[]>([]);
  const [counts, setCounts] = useState({ going: 0, checkedIn: 0 });
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    const { data: rsvps } = await supabase
      .from("rsvps")
      .select("*")
      .eq("event_id", eventId)
      .order("checked_in_at", { ascending: false, nullsFirst: false });
    const list = (rsvps ?? []) as RsvpRow[];
    setCounts({
      going: list.filter((r) => r.status === "going").length,
      checkedIn: list.filter((r) => r.checked_in_at).length,
    });
    setRecent(list.filter((r) => r.checked_in_at).slice(0, 12));
  }, [eventId]);

  useEffect(() => {
    if (authLoading || !user) return;
    (async () => {
      const { data: ev } = await supabase.from("events").select("*").eq("id", eventId).maybeSingle();
      setEvent((ev as EventRow) ?? null);
      if (!ev) { setAuthorized(false); return; }
      const { data: m } = await supabase
        .from("host_members")
        .select("id")
        .eq("host_id", ev.host_id)
        .eq("user_id", user.id)
        .maybeSingle();
      setAuthorized(!!m);
      if (m) refresh();
    })();
  }, [eventId, user, authLoading, refresh]);

  if (authLoading) return null;
  if (!user) return <div className="p-10 text-center">Please sign in.</div>;
  if (authorized === false) return <div className="p-10 text-center text-muted-foreground">You don't have access to check in for this event.</div>;
  if (!event) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const c = code.trim().toUpperCase();
    if (!c) return;
    setBusy(true);
    const { data: r, error } = await supabase
      .from("rsvps")
      .select("*")
      .eq("event_id", eventId)
      .eq("ticket_code", c)
      .maybeSingle();
    if (error || !r) {
      setBusy(false);
      toast.error("Ticket not found");
      return;
    }
    if (r.status !== "going") {
      setBusy(false);
      toast.error(`Ticket status: ${r.status}`);
      return;
    }
    if (r.checked_in_at) {
      setBusy(false);
      toast.warning(`Already checked in at ${new Date(r.checked_in_at).toLocaleTimeString()}`);
      return;
    }
    const { error: uerr } = await supabase
      .from("rsvps")
      .update({ checked_in_at: new Date().toISOString() })
      .eq("id", r.id);
    setBusy(false);
    if (uerr) toast.error(uerr.message);
    else {
      toast.success(`Checked in · ${c}`);
      setCode("");
      refresh();
    }
  };

  const undo = async (rsvpId: string) => {
    const { error } = await supabase.from("rsvps").update({ checked_in_at: null }).eq("id", rsvpId);
    if (error) toast.error(error.message);
    else { toast.success("Undone"); refresh(); }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <Link to="/dashboard" className="text-sm text-primary">← Dashboard</Link>
      <h1 className="text-3xl font-bold mt-3">{event.title}</h1>
      <p className="text-sm text-muted-foreground mt-1">Check-in</p>

      <div className="mt-4 flex gap-3">
        <Badge variant="secondary">Going: {counts.going}</Badge>
        <Badge>Checked in: {counts.checkedIn}</Badge>
      </div>

      <form onSubmit={submit} className="mt-6 rounded-2xl border bg-card p-5 space-y-3">
        <label className="text-sm font-medium">Ticket code</label>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. A1B2C3D4E5"
          autoFocus
          autoComplete="off"
          className="font-mono text-lg tracking-wider"
        />
        <Button type="submit" className="w-full gap-2" disabled={busy}>
          <CheckCircle2 className="size-4" /> Check in
        </Button>
      </form>

      <div className="mt-8">
        <h2 className="text-sm font-semibold mb-2">Recent check-ins</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No one checked in yet.</p>
        ) : (
          <ul className="space-y-1">
            {recent.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm">
                <span className="font-mono">{r.ticket_code}</span>
                <span className="text-muted-foreground text-xs">{r.checked_in_at && new Date(r.checked_in_at).toLocaleTimeString()}</span>
                <Button size="sm" variant="ghost" onClick={() => undo(r.id)} className="gap-1">
                  <Undo2 className="size-3" /> Undo
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}