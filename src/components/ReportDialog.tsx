import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Flag } from "lucide-react";

export function ReportDialog({ targetType, targetId }: { targetType: "event" | "photo"; targetId: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const submit = async () => {
    if (!user) {
      toast.error("Sign in to report");
      return;
    }
    if (reason.trim().length < 4) {
      toast.error("Please describe the reason");
      return;
    }
    const { error } = await supabase.from("reports").insert({
      target_type: targetType,
      target_id: targetId,
      reason: reason.trim().slice(0, 500),
      created_by: user.id,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Report submitted");
      setOpen(false);
      setReason("");
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
          <Flag className="size-3.5" /> Report
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this {targetType}</DialogTitle>
        </DialogHeader>
        <Textarea
          placeholder="Why is this content problematic?"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
        />
        <Button onClick={submit}>Submit report</Button>
      </DialogContent>
    </Dialog>
  );
}