import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { ReportDialog } from "@/components/ReportDialog";
import type { GalleryPhotoRow } from "@/lib/queries";

export function GallerySection({ eventId }: { eventId: string }) {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<GalleryPhotoRow[]>([]);
  const [busy, setBusy] = useState(false);

  const load = () => {
    supabase
      .from("gallery_photos")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setPhotos(data ?? []));
  };
  useEffect(() => { load(); }, [eventId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Max 5MB");
      return;
    }
    setBusy(true);
    const path = `${eventId}/${user.id}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("gallery").upload(path, file);
    if (upErr) {
      toast.error(upErr.message);
      setBusy(false);
      return;
    }
    const { data: pub } = supabase.storage.from("gallery").getPublicUrl(path);
    const { error } = await supabase.from("gallery_photos").insert({
      event_id: eventId,
      user_id: user.id,
      url: pub.publicUrl,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Submitted for host approval");
      load();
    }
  };

  const visible = photos.filter((p) => p.status === "approved" || p.user_id === user?.id);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Gallery</h3>
        {user && (
          <label className="cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={busy} />
            <Button asChild variant="outline" size="sm" disabled={busy}>
              <span><Upload className="size-4 mr-2" /> {busy ? "Uploading…" : "Upload photo"}</span>
            </Button>
          </label>
        )}
      </div>
      {visible.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No photos yet.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {visible.map((p) => (
            <div key={p.id} className="relative rounded-xl overflow-hidden aspect-square group">
              <img src={p.url} alt="" className="w-full h-full object-cover" />
              {p.status === "pending" && (
                <div className="absolute top-2 left-2 text-xs bg-foreground/80 text-background rounded px-2 py-0.5">
                  Pending
                </div>
              )}
              <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <ReportDialog targetType="photo" targetId={p.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}