import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { TicketDialog } from "@/components/TicketDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatEventDate } from "@/lib/format";
import type { EventRow, RsvpRow } from "@/lib/queries";

export const Route = createFileRoute("/tickets")({ component: Tickets });

function Tickets() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<(RsvpRow & { events: EventRow })[]>([]);
  const [active, setActive] = useState<(RsvpRow & { events: EventRow }) | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("rsvps")
      .select("*, events(*)")
      .eq("user_id", user.id)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const now = Date.now();
        const filtered = ((data ?? []) as unknown as (RsvpRow & { events: EventRow })[])
          .filter((r) => r.events && new Date(r.events.ends_at).getTime() >= now);
        setItems(filtered);
      });
  }, [user]);

  if (loading) return null;
  if (!user) return <div className="mx-auto max-w-3xl px-4 py-16 text-center"><Link to="/auth" className="text-primary">Sign in to view tickets</Link></div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">My tickets</h1>
      <p className="text-muted-foreground mt-1">Upcoming events you're attending.</p>
      {items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
          No upcoming tickets. <Link to="/explore" className="text-primary">Find an event</Link>.
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((r) => (
            <li key={r.id} className="rounded-2xl border bg-card p-5 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <Link to="/events/$slug" params={{ slug: r.events.slug }} className="font-semibold hover:text-primary">{r.events.title}</Link>
                <div className="text-sm text-muted-foreground">{formatEventDate(r.events.starts_at, r.events.ends_at)}</div>
                <div className="mt-2">
                  {r.status === "going" ? <Badge>Confirmed</Badge> : <Badge variant="secondary">Waitlist #{r.waitlist_position}</Badge>}
                </div>
              </div>
              {r.status === "going" && (
                <Button onClick={() => setActive(r)}>View ticket</Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {active && (
        <TicketDialog
          open={!!active}
          onOpenChange={(o) => !o && setActive(null)}
          ticketCode={active.ticket_code}
          event={active.events}
        />
      )}
    </div>
  );
}