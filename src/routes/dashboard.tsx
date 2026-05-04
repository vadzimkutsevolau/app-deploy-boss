import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import type { EventRow, HostRow } from "@/lib/queries";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

function Dashboard() {
  const { user, loading } = useAuth();
  const [hosts, setHosts] = useState<HostRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: members } = await supabase.from("host_members").select("host_id").eq("user_id", user.id).eq("role", "host");
      const ids = (members ?? []).map((m) => m.host_id);
      if (!ids.length) return;
      const { data: hs } = await supabase.from("hosts").select("*").in("id", ids);
      setHosts(hs ?? []);
      const { data: evs } = await supabase.from("events").select("*").in("host_id", ids).order("starts_at", { ascending: false });
      setEvents((evs ?? []) as EventRow[]);
    })();
  }, [user]);

  if (loading) return null;
  if (!user) return <div className="mx-auto max-w-3xl p-10 text-center">Please sign in.</div>;
  if (hosts.length === 0)
    return (
      <div className="mx-auto max-w-md p-10 text-center">
        <p className="mb-4">You don't host anything yet.</p>
        <Link to="/host/new"><Button>Become a host</Button></Link>
      </div>
    );

  const now = Date.now();
  const upcoming = events.filter((e) => new Date(e.ends_at).getTime() >= now);
  const past = events.filter((e) => new Date(e.ends_at).getTime() < now);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Host dashboard</h1>
        <Link to="/dashboard/events/new"><Button>+ New event</Button></Link>
      </div>
      <Section title="Upcoming" events={upcoming} />
      <Section title="Past" events={past} />
    </div>
  );
}

function Section({ title, events }: { title: string; events: EventRow[] }) {
  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-3">{title}</h2>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">No events.</p>
      ) : (
        <ul className="space-y-2">
          {events.map((e) => (
            <li key={e.id} className="rounded-xl border bg-card p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <Link to="/events/$slug" params={{ slug: e.slug }} className="font-semibold hover:text-primary">{e.title}</Link>
                <div className="text-xs text-muted-foreground">{new Date(e.starts_at).toLocaleString()} · {e.status}</div>
              </div>
              <div className="flex gap-2">
                <Link to="/dashboard/events/$id/edit" params={{ id: e.id }}><Button size="sm" variant="outline">Edit</Button></Link>
                <Link to="/dashboard/events/$id/attendees" params={{ id: e.id }}><Button size="sm" variant="outline">Attendees</Button></Link>
                <Link to="/checkin/$eventId" params={{ eventId: e.id }}><Button size="sm">Check-in</Button></Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}