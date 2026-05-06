import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { slugify } from "@/lib/format";
import type { EventRow, HostRow } from "@/lib/queries";

export const Route = createFileRoute("/dashboard/")({ component: Dashboard });

function Dashboard() {
  const { user, loading } = useAuth();
  const [hosts, setHosts] = useState<HostRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [reload, setReload] = useState(0);

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
  }, [user, reload]);

  const refresh = () => setReload((r) => r + 1);

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
        <div className="flex gap-2">
          <Link to="/dashboard/moderation"><Button variant="outline">Moderation</Button></Link>
          <Link to="/dashboard/events/new"><Button>+ New event</Button></Link>
        </div>
      </div>
      {hosts.map((h) => (
        <p key={h.id} className="mt-2 text-sm text-muted-foreground">
          Host: <Link to="/hosts/$slug" params={{ slug: h.slug }} className="text-primary hover:underline">{h.name}</Link>
        </p>
      ))}
      <Section title="Upcoming" events={upcoming} onChange={refresh} />
      <Section title="Past" events={past} onChange={refresh} />
    </div>
  );
}

function Section({ title, events, onChange }: { title: string; events: EventRow[]; onChange: () => void }) {
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
                <div className="flex items-center gap-2">
                  <Link to="/events/$slug" params={{ slug: e.slug }} className="font-semibold hover:text-primary">{e.title}</Link>
                  <Badge variant={e.status === "published" ? "default" : "secondary"}>{e.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{new Date(e.starts_at).toLocaleString()}</div>
              </div>
              <div className="flex gap-2">
                <RowActions event={e} onChange={onChange} />
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

function RowActions({ event, onChange }: { event: EventRow; onChange: () => void }) {
  const toggle = async () => {
    const next = event.status === "published" ? "draft" : "published";
    const { error } = await supabase.from("events").update({ status: next }).eq("id", event.id);
    if (error) toast.error(error.message);
    else { toast.success(next === "published" ? "Published" : "Unpublished"); onChange(); }
  };
  const duplicate = async () => {
    const { error } = await supabase.from("events").insert({
      host_id: event.host_id,
      title: `${event.title} (copy)`,
      slug: slugify(event.title + " copy"),
      description: event.description,
      starts_at: event.starts_at,
      ends_at: event.ends_at,
      timezone: event.timezone,
      capacity: event.capacity,
      cover_image_url: event.cover_image_url,
      venue_address: event.venue_address,
      online_link: event.online_link,
      visibility: event.visibility,
      status: "draft",
    });
    if (error) toast.error(error.message);
    else { toast.success("Duplicated as draft"); onChange(); }
  };
  return (
    <>
      <Button size="sm" variant="ghost" onClick={toggle}>
        {event.status === "published" ? "Unpublish" : "Publish"}
      </Button>
      <Button size="sm" variant="ghost" onClick={duplicate}>Duplicate</Button>
    </>
  );
}