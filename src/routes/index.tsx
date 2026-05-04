import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { EventCard } from "@/components/EventCard";
import type { EventRow } from "@/lib/queries";
import { ArrowRight, Sparkles, Users, Ticket } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Gather — Host community events without the fuss" },
      { name: "description", content: "Publish a free event, share the link, collect RSVPs with QR tickets, and check guests in at the door." },
      { property: "og:title", content: "Gather — Community Events" },
      { property: "og:description", content: "Publish a free event, share the link, collect RSVPs with QR tickets, and check guests in at the door." },
    ],
  }),
});

function Index() {
  const [events, setEvents] = useState<EventRow[]>([]);
  useEffect(() => {
    supabase
      .from("events")
      .select("*, hosts(name, slug, logo_url)")
      .eq("status", "published")
      .eq("visibility", "public")
      .gte("ends_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(6)
      .then(({ data }) => setEvents((data as unknown as EventRow[]) ?? []));
  }, []);

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-secondary via-background to-accent/30" />
        <div className="mx-auto max-w-6xl px-4 py-20 md:py-28">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 text-xs font-medium border">
              <Sparkles className="size-3 text-primary" />
              Free, simple, community-first
            </span>
            <h1 className="mt-6 text-5xl md:text-6xl font-bold tracking-tight">
              Bring people together. <span className="text-primary">Effortlessly.</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground">
              Gather is a lightweight platform for hosting community events. Publish a page, collect RSVPs with QR tickets, and run check-in at the door — all in one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/explore">
                <Button size="lg" className="gap-2">
                  Explore events <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link to="/host/new">
                <Button size="lg" variant="outline">Host an event</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold">Upcoming events</h2>
            <p className="text-muted-foreground mt-1">Discover gatherings near you.</p>
          </div>
          <Link to="/explore" className="text-sm text-primary hover:underline">Browse all →</Link>
        </div>
        {events.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
            No upcoming public events yet. <Link to="/host/new" className="text-primary hover:underline">Host the first one</Link>.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 grid md:grid-cols-3 gap-6">
        <Feature icon={<Sparkles className="size-5" />} title="Publish in minutes" body="Create a beautiful event page with cover image, description, capacity, and venue." />
        <Feature icon={<Ticket className="size-5" />} title="QR tickets" body="Every confirmed RSVP gets a unique QR ticket and an Add to Calendar option." />
        <Feature icon={<Users className="size-5" />} title="Door-friendly check-in" body="Manual code entry, live counters, undo last scan. Built for the venue." />
      </section>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border bg-card p-6">
      <div className="size-10 rounded-xl bg-primary/10 text-primary grid place-items-center mb-4">{icon}</div>
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1.5">{body}</p>
    </div>
  );
}
