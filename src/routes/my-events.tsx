import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { EventCard } from "@/components/EventCard";
import type { EventRow } from "@/lib/queries";

export const Route = createFileRoute("/my-events")({ component: MyEvents });

function MyEvents() {
  const { user, loading } = useAuth();
  const [upcoming, setUpcoming] = useState<EventRow[]>([]);
  const [past, setPast] = useState<EventRow[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("rsvps")
        .select("event_id, status, events(*, hosts(name, slug, logo_url))")
        .eq("user_id", user.id)
        .neq("status", "cancelled");
      const evs = ((data ?? []) as unknown as Array<{ events: EventRow | null }>)
        .map((r) => r.events).filter((e): e is EventRow => !!e);
      const now = Date.now();
      setUpcoming(evs.filter((e) => new Date(e.ends_at).getTime() >= now));
      setPast(evs.filter((e) => new Date(e.ends_at).getTime() < now));
    })();
  }, [user]);

  if (loading) return null;
  if (!user) return <div className="p-10 text-center">Please <Link to="/auth" search={{ redirect: "/my-events" }} className="text-primary">sign in</Link>.</div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold">My events</h1>
      <Section title="Upcoming" events={upcoming} />
      <Section title="Past" events={past} />
    </div>
  );
}

function Section({ title, events }: { title: string; events: EventRow[] }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold mb-3">{title}</h2>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing here yet.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map((e) => <EventCard key={e.id} event={e} />)}
        </div>
      )}
    </section>
  );
}