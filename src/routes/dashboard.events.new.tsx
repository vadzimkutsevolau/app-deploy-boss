import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { slugify } from "@/lib/format";
import { toast } from "sonner";
import type { HostRow } from "@/lib/queries";

export const Route = createFileRoute("/dashboard/events/new")({ component: NewEvent });

function NewEvent() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [hosts, setHosts] = useState<HostRow[]>([]);
  const [hostId, setHostId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [starts, setStarts] = useState("");
  const [ends, setEnds] = useState("");
  const [venue, setVenue] = useState("");
  const [online, setOnline] = useState("");
  const [capacity, setCapacity] = useState(50);
  const [cover, setCover] = useState("");
  const [unlisted, setUnlisted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("host_members").select("hosts(*)").eq("user_id", user.id).eq("role", "host").then(({ data }) => {
      const list = ((data ?? []) as unknown as { hosts: HostRow }[]).map((m) => m.hosts).filter(Boolean);
      setHosts(list);
      if (list[0]) setHostId(list[0].id);
    });
  }, [user]);

  const submit = async (publish: boolean) => {
    if (!hostId || !title || !starts || !ends) return toast.error("Fill required fields");
    setBusy(true);
    const { data, error } = await supabase.from("events").insert({
      host_id: hostId,
      slug: slugify(title),
      title: title.trim(),
      description: description.trim() || null,
      starts_at: new Date(starts).toISOString(),
      ends_at: new Date(ends).toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      venue_address: venue.trim() || null,
      online_link: online.trim() || null,
      capacity: Math.max(1, capacity),
      cover_image_url: cover.trim() || null,
      visibility: unlisted ? "unlisted" : "public",
      status: publish ? "published" : "draft",
    }).select().single();
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(publish ? "Published!" : "Saved as draft");
    nav({ to: "/events/$slug", params: { slug: data.slug } });
  };

  if (!user) return <div className="p-10 text-center">Please sign in.</div>;
  if (hosts.length === 0) return <div className="p-10 text-center">Create a host first.</div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold">New event</h1>
      <div className="mt-6 space-y-4 rounded-2xl border bg-card p-6">
        <div><Label>Host</Label>
          <Select value={hostId} onValueChange={setHostId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{hosts.map((h) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} /></div>
        <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} maxLength={4000} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Starts</Label><Input type="datetime-local" value={starts} onChange={(e) => setStarts(e.target.value)} /></div>
          <div><Label>Ends</Label><Input type="datetime-local" value={ends} onChange={(e) => setEnds(e.target.value)} /></div>
        </div>
        <div><Label>Venue address</Label><Input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="123 Main St…" /></div>
        <div><Label>Online link (optional)</Label><Input value={online} onChange={(e) => setOnline(e.target.value)} placeholder="https://…" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Capacity</Label><Input type="number" min={1} value={capacity} onChange={(e) => setCapacity(parseInt(e.target.value) || 1)} /></div>
          <div><Label>Cover image URL</Label><Input value={cover} onChange={(e) => setCover(e.target.value)} placeholder="https://…" /></div>
        </div>
        <div className="flex items-center justify-between border-t pt-4">
          <div className="flex items-center gap-2"><Switch checked={unlisted} onCheckedChange={setUnlisted} id="unl" /><Label htmlFor="unl">Unlisted (link-only)</Label></div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 opacity-60"><Switch disabled id="paid" /><Label htmlFor="paid">Paid</Label></div>
              </TooltipTrigger>
              <TooltipContent>Coming soon — paid ticketing isn't available yet.</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={() => submit(false)} variant="outline" disabled={busy}>Save draft</Button>
          <Button onClick={() => submit(true)} disabled={busy}>Publish</Button>
        </div>
      </div>
    </div>
  );
}