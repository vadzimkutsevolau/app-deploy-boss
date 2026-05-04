import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EventCard } from "@/components/EventCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { EventRow } from "@/lib/queries";
import { Search } from "lucide-react";

export const Route = createFileRoute("/explore")({
  component: Explore,
  head: () => ({
    meta: [
      { title: "Explore events — Gather" },
      { name: "description", content: "Browse community events near you. Filter by date, location, and keywords." },
    ],
  }),
});

function Explore() {
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("");
  const [includePast, setIncludePast] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [events, setEvents] = useState<EventRow[]>([]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      let query = supabase
        .from("events")
        .select("*, hosts(name, slug, logo_url)")
        .eq("status", "published")
        .eq("visibility", "public")
        .order("starts_at", { ascending: true })
        .limit(60);
      if (!includePast) query = query.gte("ends_at", new Date().toISOString());
      if (from) query = query.gte("starts_at", new Date(from).toISOString());
      if (to) query = query.lte("starts_at", new Date(to).toISOString());
      if (q.trim()) query = query.ilike("title", `%${q.trim()}%`);
      if (loc.trim()) query = query.ilike("venue_address", `%${loc.trim()}%`);
      const { data } = await query;
      if (active) setEvents((data as unknown as EventRow[]) ?? []);
    };
    run();
    return () => {
      active = false;
    };
  }, [q, loc, includePast, from, to]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-4xl font-bold">Explore events</h1>
      <p className="text-muted-foreground mt-2">Find a community gathering that fits.</p>

      <div className="mt-8 grid md:grid-cols-[1fr_1fr_auto_auto_auto] gap-3 items-end rounded-2xl border bg-card p-4">
        <div>
          <Label className="text-xs">Search</Label>
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title…" className="pl-9" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Location</Label>
          <Input value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="City, venue…" />
        </div>
        <div>
          <Label className="text-xs">From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 h-10">
          <Switch id="past" checked={includePast} onCheckedChange={setIncludePast} />
          <Label htmlFor="past" className="text-sm">Include past</Label>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
          No events match those filters.
        </div>
      ) : (
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      )}
    </div>
  );
}