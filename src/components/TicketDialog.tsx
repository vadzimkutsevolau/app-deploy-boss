import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QrCode } from "@/components/QrCode";
import { Button } from "@/components/ui/button";
import { buildIcsFile, downloadFile, formatEventDate } from "@/lib/format";
import { Calendar } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  ticketCode: string;
  event: { id: string; title: string; description: string | null; starts_at: string; ends_at: string; venue_address: string | null; online_link: string | null };
};

export function TicketDialog({ open, onOpenChange, ticketCode, event }: Props) {
  const downloadIcs = () => {
    const ics = buildIcsFile({
      title: event.title,
      description: event.description ?? undefined,
      location: event.online_link ?? event.venue_address ?? undefined,
      starts: event.starts_at,
      ends: event.ends_at,
      uid: event.id,
    });
    downloadFile(`${event.title.replace(/\s+/g, "-").toLowerCase()}.ics`, ics, "text/calendar");
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Your ticket</DialogTitle>
        </DialogHeader>
        <div className="rounded-2xl bg-secondary p-6 text-center">
          <h3 className="font-semibold">{event.title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{formatEventDate(event.starts_at, event.ends_at)}</p>
          <div className="mt-5 flex justify-center">
            <QrCode value={ticketCode} />
          </div>
          <div className="mt-4 font-mono text-2xl tracking-[0.2em] font-bold">{ticketCode}</div>
          <p className="mt-1 text-xs text-muted-foreground">Show this code at the door.</p>
        </div>
        <Button onClick={downloadIcs} variant="outline" className="gap-2">
          <Calendar className="size-4" /> Add to calendar
        </Button>
      </DialogContent>
    </Dialog>
  );
}