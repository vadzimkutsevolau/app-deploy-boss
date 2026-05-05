import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type { EventRow } from "@/lib/queries";

export const Route = createFileRoute("/dashboard/events/$id/edit")({
  component: EditEvent,
});

function toLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EditEvent() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
      setEvent((data as EventRow) ?? null);
    })();
  }, [id]);

  if (!user) return <div className="p-10 text-center">Please sign in.</div>;
  if (!event) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;

  const update = (k: keyof EventRow, v: unknown) => setEvent({ ...event, [k]: v } as EventRow);

  const save = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("events")
      .update({
        title: event.title,
        description: event.description,
        starts_at: event.starts_at,
        ends_at: event.ends_at,
        venue_address: event.venue_address,
        online_link: event.online_link,
        capacity: event.capacity,
        cover_image_url: event.cover_image_url,
        visibility: event.visibility,
        status: event.status,
      })
      .eq("id", event.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Saved");
  };

  const remove = async () => {
    if (!confirm("Delete this event? This cancels all RSVPs.")) return;
    const { error } = await supabase.from("events").delete().eq("id", event.id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); nav({ to: "/dashboard" }); }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link to="/dashboard" className="text-sm text-primary">← Dashboard</Link>
      <div className="flex items-center justify-between mt-2">
        <h1 className="text-3xl font-bold">Edit event</h1>
        <div className="flex gap-2">
          <Link to="/dashboard/events/$id/attendees" params={{ id: event.id }}>
            <Button variant="outline" size="sm">Attendees</Button>
          </Link>
          <Link to="/dashboard/events/$id/members" params={{ id: event.id }}>
            <Button variant="outline" size="sm">Members</Button>
          </Link>
        </div>
      </div>

      <div className="mt-6 space-y-4 rounded-2xl border bg-card p-6">
        <div><Label>Title</Label><Input value={event.title} onChange={(e) => update("title", e.target.value)} /></div>
        <div><Label>Description</Label><Textarea rows={5} value={event.description ?? ""} onChange={(e) => update("description", e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Starts</Label><Input type="datetime-local" value={toLocal(event.starts_at)} onChange={(e) => update("starts_at", new Date(e.target.value).toISOString())} /></div>
          <div><Label>Ends</Label><Input type="datetime-local" value={toLocal(event.ends_at)} onChange={(e) => update("ends_at", new Date(e.target.value).toISOString())} /></div>
        </div>
        <div><Label>Venue</Label><Input value={event.venue_address ?? ""} onChange={(e) => update("venue_address", e.target.value)} /></div>
        <div><Label>Online link</Label><Input value={event.online_link ?? ""} onChange={(e) => update("online_link", e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Capacity</Label><Input type="number" min={1} value={event.capacity} onChange={(e) => update("capacity", parseInt(e.target.value) || 1)} /></div>
          <div><Label>Cover image URL</Label><Input value={event.cover_image_url ?? ""} onChange={(e) => update("cover_image_url", e.target.value)} /></div>
        </div>
        <div className="flex items-center gap-6 border-t pt-4">
          <div className="flex items-center gap-2">
            <Switch
              id="unl"
              checked={event.visibility === "unlisted"}
              onCheckedChange={(c) => update("visibility", c ? "unlisted" : "public")}
            />
            <Label htmlFor="unl">Unlisted</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="pub"
              checked={event.status === "published"}
              onCheckedChange={(c) => update("status", c ? "published" : "draft")}
            />
            <Label htmlFor="pub">Published</Label>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
          <Button variant="destructive" onClick={remove}>Delete event</Button>
        </div>
      </div>
    </div>
  );
}