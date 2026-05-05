import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EventCard } from "@/components/EventCard";
import type { EventRow, HostRow } from "@/lib/queries";

export const Route = createFileRoute("/hosts/$slug")({
  component: HostPage,
});

function HostPage() {
  const { slug } = Route.useParams();
  const [host, setHost] = useState<HostRow | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);

  useEffect(() => {
    (async () => {
      const { data: h } = await supabase.from("hosts").select("*").eq("slug", slug).maybeSingle();
      setHost(h ?? null);
      if (h) {
        const { data: evs } = await supabase
          .from("events")
          .select("*, hosts(name, slug, logo_url)")
          .eq("host_id", h.id)
          .eq("status", "published")
          .eq("visibility", "public")
          .order("starts_at", { ascending: false });
        setEvents((evs ?? []) as EventRow[]);
      }
    })();
  }, [slug]);

  if (!host) return <div className="mx-auto max-w-3xl p-10 text-center text-muted-foreground">Loading…</div>;

  const now = Date.now();
  const upcoming = events.filter((e) => new Date(e.ends_at).getTime() >= now);
  const past = events.filter((e) => new Date(e.ends_at).getTime() < now);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="flex items-start gap-5">
        {host.logo_url ? (
          <img src={host.logo_url} alt={host.name} className="size-20 rounded-2xl object-cover" />
        ) : (
          <div className="size-20 rounded-2xl bg-accent grid place-items-center text-2xl font-bold">{host.name[0]}</div>
        )}
        <div>
          <h1 className="text-3xl font-bold">{host.name}</h1>
          {host.bio && <p className="text-muted-foreground mt-2 max-w-2xl">{host.bio}</p>}
          <a href={`mailto:${host.contact_email}`} className="text-sm text-primary mt-2 inline-block">{host.contact_email}</a>
        </div>
      </header>

      <Section title="Upcoming events" events={upcoming} empty="No upcoming events." />
      <Section title="Past events" events={past} empty="No past events." />
    </div>
  );
}

function Section({ title, events, empty }: { title: string; events: EventRow[]; empty: string }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map((e) => <EventCard key={e.id} event={e} />)}
        </div>
      )}
    </section>
  );
}

// satisfies type-checker for unused Link import in some refactors
void Link;