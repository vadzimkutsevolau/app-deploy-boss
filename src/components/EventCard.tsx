import { Link } from "@tanstack/react-router";
import type { EventRow } from "@/lib/queries";
import { formatEventDate, isPast } from "@/lib/format";
import { Calendar, MapPin, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function EventCard({ event }: { event: EventRow }) {
  const ended = isPast(event.ends_at);
  return (
    <Link
      to="/events/$slug"
      params={{ slug: event.slug }}
      className="group rounded-2xl border bg-card overflow-hidden hover:shadow-lg transition-shadow"
    >
      <div className="aspect-[16/9] bg-secondary relative overflow-hidden">
        {event.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.cover_image_url}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-accent/40 to-primary/30 grid place-items-center text-primary/40">
            <Calendar className="size-10" />
          </div>
        )}
        {ended && (
          <div className="absolute top-3 left-3">
            <Badge variant="secondary" className="bg-foreground/80 text-background">Ended</Badge>
          </div>
        )}
        {event.visibility === "unlisted" && !ended && (
          <div className="absolute top-3 left-3">
            <Badge variant="secondary">Unlisted</Badge>
          </div>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-semibold text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">
          {event.title}
        </h3>
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="size-3.5 shrink-0" />
          <span className="truncate">{formatEventDate(event.starts_at, event.ends_at)}</span>
        </div>
        {(event.venue_address || event.online_link) && (
          <div className="mt-1.5 flex items-center gap-2 text-sm text-muted-foreground">
            {event.online_link ? <Video className="size-3.5 shrink-0" /> : <MapPin className="size-3.5 shrink-0" />}
            <span className="truncate">{event.online_link ? "Online event" : event.venue_address}</span>
          </div>
        )}
        {event.hosts && (
          <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm">
            {event.hosts.logo_url ? (
              <img src={event.hosts.logo_url} alt="" className="size-6 rounded-full object-cover" />
            ) : (
              <div className="size-6 rounded-full bg-accent grid place-items-center text-xs font-semibold">
                {event.hosts.name[0]}
              </div>
            )}
            <span className="text-muted-foreground">by {event.hosts.name}</span>
          </div>
        )}
      </div>
    </Link>
  );
}