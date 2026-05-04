import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";

export function FeedbackForm({ eventId }: { eventId: string }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [existing, setExisting] = useState<{ rating: number; comment: string | null } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("feedback")
      .select("rating, comment")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setExisting(data);
          setRating(data.rating);
          setComment(data.comment ?? "");
        }
      });
  }, [eventId, user]);

  if (!user) return <p className="text-sm text-muted-foreground">Sign in to leave feedback.</p>;

  const submit = async () => {
    if (rating < 1) {
      toast.error("Pick a star rating");
      return;
    }
    const payload = { event_id: eventId, user_id: user.id, rating, comment: comment.trim() || null };
    const { error } = await supabase.from("feedback").upsert(payload, { onConflict: "event_id,user_id" });
    if (error) toast.error(error.message);
    else {
      toast.success("Thanks for the feedback!");
      setExisting({ rating, comment });
    }
  };

  return (
    <div className="rounded-2xl border p-5 bg-card">
      <h3 className="font-semibold">{existing ? "Your feedback" : "How was it?"}</h3>
      <div className="mt-3 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} star`}>
            <Star className={`size-7 ${n <= rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
          </button>
        ))}
      </div>
      <Textarea
        className="mt-3"
        placeholder="Optional comment…"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={1000}
      />
      <Button onClick={submit} className="mt-3">{existing ? "Update" : "Submit"}</Button>
    </div>
  );
}