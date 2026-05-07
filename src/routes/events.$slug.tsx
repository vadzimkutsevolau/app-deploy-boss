import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatEventDate, isPast } from "@/lib/format";
import { Calendar, MapPin, Users, Video, Ticket as TicketIcon } from "lucide-react";
import { toast } from "sonner";
import { TicketDialog } from "@/components/TicketDialog";
import { GallerySection } from "@/components/GallerySection";
import { FeedbackForm } from "@/components/FeedbackForm";
import { ReportDialog } from "@/components/ReportDialog";
import type { EventRow, RsvpRow } from "@/lib/queries";

export const Route = createFileRoute("/events/$slug")({
  component: EventPage,
});

function EventPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [rsvp, setRsvp] = useState<RsvpRow | null>(null);
  const [counts, setCounts] = useState<{ going: number; waitlist: number }>({ going: 0, waitlist: 0 });
  const [showTicket, setShowTicket] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadEvent = useCallback(async () => {
    const { data } = await supabase
      .from("events")
      .select("*, hosts(name, slug, logo_url, bio)")
      .eq("slug", slug)
      .maybeSingle();
    setEvent((data as unknown as EventRow) ?? null);
  }, [slug]);

  const loadCounts = useCallback(async (eventId: string) => {
    const { data } = await supabase.from("rsvps").select("status").eq("event_id", eventId);
    const going = data?.filter((r) => r.status === "going").length ?? 0;
    const waitlist = data?.filter((r) => r.status === "waitlist").length ?? 0;
    setCounts({ going, waitlist });
  }, []);

  const loadRsvp = useCallback(async (eventId: string, uid: string) => {
    const { data } = await supabase.from("rsvps").select("*").eq("event_id", eventId).eq("user_id", uid).maybeSingle();
    setRsvp(data ?? null);
  }, []);

  useEffect(() => { loadEvent(); }, [loadEvent]);
  useEffect(() => {
    if (event) loadCounts(event.id);
    if (event && user) loadRsvp(event.id, user.id);
  }, [event, user, loadCounts, loadRsvp]);

  if (!event) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">Loading…</div>;
  }

  const ended = isPast(event.ends_at);
  const full = counts.going >= event.capacity;

  const handleRsvp = async () => {
    if (!user) {
      nav({ to: "/auth", search: { redirect: window.location.pathname, mode: "signin" } });
      return;
    }
    setBusy(true);
    const status = full ? "waitlist" : "going";
    const waitlist_position = full ? counts.waitlist + 1 : null;
    // Check for an existing RSVP row (e.g. previously cancelled) and update it
    // instead of inserting, since (event_id, user_id) is unique.
    const { data: existing } = await supabase
      .from("rsvps")
      .select("*")
      .eq("event_id", event.id)
      .eq("user_id", user.id)
      .maybeSingle();

    const { data, error } = existing
      ? await supabase
          .from("rsvps")
          .update({ status, waitlist_position })
          .eq("id", existing.id)
          .select()
          .single()
      : await supabase
          .from("rsvps")
          .insert({ event_id: event.id, user_id: user.id, status, waitlist_position })
          .select()
          .single();
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      setRsvp(data);
      toast.success(status === "going" ? "You're going!" : "Added to waitlist");
      loadCounts(event.id);
      if (status === "going") setShowTicket(true);
    }
  };

  const handleCancel = async () => {
    if (!rsvp) return;
    setBusy(true);
    const { error } = await supabase.from("rsvps").update({ status: "cancelled" }).eq("id", rsvp.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("RSVP cancelled");
      setRsvp({ ...rsvp, status: "cancelled" });
      loadCounts(event.id);
    }
  };

  return (
    <article className="mx-auto max-w-4xl px-4 py-8">
      <div className="rounded-3xl overflow-hidden bg-secondary aspect-[21/9] mb-6">
        {event.cover_image_url ? (
          <img src={event.cover_image_url} alt={event.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-accent/40 to-primary/30 grid place-items-center text-primary/40">
            <Calendar className="size-16" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mb-3">
        {ended && <Badge variant="secondary">Ended</Badge>}
        {event.visibility === "unlisted" && <Badge variant="outline">Unlisted</Badge>}
        <ReportDialog targetType="event" targetId={event.id} />
      </div>

      <h1 className="text-4xl font-bold tracking-tight">{event.title}</h1>

      {event.hosts && (
        <Link
          to="/hosts/$slug"
          params={{ slug: event.hosts.slug }}
          className="mt-3 inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          {event.hosts.logo_url ? (
            <img src={event.hosts.logo_url} alt="" className="size-8 rounded-full object-cover" />
          ) : (
            <div className="size-8 rounded-full bg-accent grid place-items-center font-semibold">{event.hosts.name[0]}</div>
          )}
          <span>by {event.hosts.name}</span>
        </Link>
      )}

      <div className="mt-6 grid md:grid-cols-[1fr_320px] gap-8">
        <div>
          <div className="space-y-3 text-base">
            <Row icon={<Calendar className="size-5 text-primary" />} text={formatEventDate(event.starts_at, event.ends_at, event.timezone)} />
            {event.online_link ? (
              <Row icon={<Video className="size-5 text-primary" />} text={<a href={event.online_link} className="hover:underline" target="_blank" rel="noreferrer">Online event</a>} />
            ) : event.venue_address ? (
              <Row icon={<MapPin className="size-5 text-primary" />} text={event.venue_address} />
            ) : null}
            <Row icon={<Users className="size-5 text-primary" />} text={`${counts.going} / ${event.capacity} going${counts.waitlist ? ` · ${counts.waitlist} on waitlist` : ""}`} />
          </div>

          {event.description && (
            <div className="mt-8 prose prose-sm max-w-none whitespace-pre-wrap leading-relaxed">
              {event.description}
            </div>
          )}

          <div className="mt-10">
            <GallerySection eventId={event.id} />
          </div>

          {ended && (
            <div className="mt-10">
              <FeedbackForm eventId={event.id} />
            </div>
          )}
        </div>

        <aside className="md:sticky md:top-20 self-start rounded-2xl border bg-card p-5">
          {ended ? (
            <div className="text-center text-muted-foreground">
              <Badge variant="secondary" className="mb-3">Ended</Badge>
              <p className="text-sm">This event has finished.</p>
            </div>
          ) : rsvp && rsvp.status !== "cancelled" ? (
            <div className="space-y-3">
              <div className="text-center">
                {rsvp.status === "going" ? (
                  <Badge className="bg-primary">You're going</Badge>
                ) : (
                  <Badge variant="secondary">On waitlist · #{rsvp.waitlist_position}</Badge>
                )}
              </div>
              {rsvp.status === "going" && (
                <Button className="w-full gap-2" onClick={() => setShowTicket(true)}>
                  <TicketIcon className="size-4" /> View ticket
                </Button>
              )}
              <Button variant="outline" className="w-full" onClick={handleCancel} disabled={busy}>
                Cancel RSVP
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Button className="w-full" onClick={handleRsvp} disabled={busy}>
                {!user ? "Sign in to RSVP" : full ? "Join waitlist" : "RSVP"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">Free event. Cancel anytime.</p>
            </div>
          )}
        </aside>
      </div>

      {rsvp && rsvp.status === "going" && (
        <TicketDialog
          open={showTicket}
          onOpenChange={setShowTicket}
          ticketCode={rsvp.ticket_code}
          event={event}
        />
      )}
    </article>
  );
}

function Row({ icon, text }: { icon: React.ReactNode; text: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div>{text}</div>
    </div>
  );
}