import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { ReportRow, GalleryPhotoRow } from "@/lib/queries";

export const Route = createFileRoute("/dashboard/moderation")({
  component: Moderation,
});

function Moderation() {
  const { user } = useAuth();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [photos, setPhotos] = useState<GalleryPhotoRow[]>([]);

  const load = useCallback(async () => {
    const { data: r } = await supabase
      .from("reports").select("*").eq("status", "open").order("created_at", { ascending: false });
    setReports((r ?? []) as ReportRow[]);
    const { data: p } = await supabase
      .from("gallery_photos").select("*").eq("status", "pending").order("created_at", { ascending: false });
    setPhotos((p ?? []) as GalleryPhotoRow[]);
  }, []);

  useEffect(() => { if (user) load(); }, [user, load]);

  if (!user) return <div className="p-10 text-center">Please sign in.</div>;

  const setReportStatus = async (id: string, status: "hidden" | "dismissed") => {
    const r = reports.find((x) => x.id === id);
    if (r && status === "hidden") {
      // hide the target if it's a photo
      if (r.target_type === "photo") {
        await supabase.from("gallery_photos").update({ status: "hidden" }).eq("id", r.target_id);
      }
    }
    const { error } = await supabase.from("reports").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Updated"); load(); }
  };

  const setPhotoStatus = async (id: string, status: "approved" | "hidden") => {
    const { error } = await supabase.from("gallery_photos").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(status); load(); }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link to="/dashboard" className="text-sm text-primary">← Dashboard</Link>
      <h1 className="text-3xl font-bold mt-2">Moderation</h1>

      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-3">Pending photos ({photos.length})</h2>
        {photos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing to review.</p>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {photos.map((p) => (
              <div key={p.id} className="rounded-xl border bg-card overflow-hidden">
                <img src={p.url} alt="" className="aspect-square w-full object-cover" />
                <div className="p-2 flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => setPhotoStatus(p.id, "approved")}>Approve</Button>
                  <Button size="sm" variant="ghost" onClick={() => setPhotoStatus(p.id, "hidden")}>Hide</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold mb-3">Open reports ({reports.length})</h2>
        {reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open reports.</p>
        ) : (
          <ul className="space-y-2">
            {reports.map((r) => (
              <li key={r.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline">{r.target_type}</Badge>
                  <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                </div>
                <p className="mt-2 text-sm">{r.reason}</p>
                <code className="text-xs text-muted-foreground">{r.target_id}</code>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="destructive" onClick={() => setReportStatus(r.id, "hidden")}>Hide content</Button>
                  <Button size="sm" variant="outline" onClick={() => setReportStatus(r.id, "dismissed")}>Dismiss</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}