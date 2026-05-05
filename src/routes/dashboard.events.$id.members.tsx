import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { EventRow } from "@/lib/queries";

export const Route = createFileRoute("/dashboard/events/$id/members")({
  component: MembersPage,
});

type Member = { id: string; user_id: string; role: "host" | "checker"; display_name: string | null };
type Invite = { id: string; token: string; role: "host" | "checker"; expires_at: string };

function MembersPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [role, setRole] = useState<"host" | "checker">("checker");

  const load = useCallback(async () => {
    const { data: ev } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
    setEvent((ev as EventRow) ?? null);
    if (!ev) return;
    const { data: ms } = await supabase
      .from("host_members")
      .select("id, user_id, role, profiles:user_id(display_name)")
      .eq("host_id", ev.host_id);
    const list: Member[] = ((ms ?? []) as unknown as Array<{ id: string; user_id: string; role: "host" | "checker"; profiles: { display_name: string | null } | null }>).map((m) => ({
      id: m.id, user_id: m.user_id, role: m.role, display_name: m.profiles?.display_name ?? null,
    }));
    setMembers(list);
    const { data: inv } = await supabase
      .from("host_invites")
      .select("id, token, role, expires_at")
      .eq("host_id", ev.host_id)
      .order("created_at", { ascending: false });
    setInvites((inv ?? []) as Invite[]);
  }, [id]);

  useEffect(() => { if (user) load(); }, [user, load]);

  if (!user) return <div className="p-10 text-center">Please sign in.</div>;
  if (!event) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;

  const createInvite = async () => {
    const token = crypto.randomUUID().replace(/-/g, "");
    const { error } = await supabase.from("host_invites").insert({
      host_id: event.host_id, role, token, created_by: user.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Invite created");
    load();
  };

  const copyInvite = (token: string) => {
    const url = `${window.location.origin}/host/invite/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Invite link copied");
  };

  const removeInvite = async (id: string) => {
    const { error } = await supabase.from("host_invites").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Removed"); load(); }
  };

  const removeMember = async (id: string) => {
    if (!confirm("Remove this member?")) return;
    const { error } = await supabase.from("host_members").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Removed"); load(); }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link to="/dashboard/events/$id/edit" params={{ id }} className="text-sm text-primary">← Back to event</Link>
      <h1 className="text-3xl font-bold mt-2">Team & invites</h1>
      <p className="text-muted-foreground text-sm">Members can manage this host's events. Checkers can only run check-in.</p>

      <section className="mt-6 rounded-2xl border bg-card p-6">
        <h2 className="font-semibold mb-3">Members</h2>
        <ul className="space-y-2">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between border-t pt-2 first:border-0 first:pt-0">
              <div>
                <span className="font-medium">{m.display_name ?? m.user_id.slice(0, 8)}</span>
                <Badge variant="outline" className="ml-2">{m.role}</Badge>
              </div>
              {m.user_id !== user.id && (
                <Button size="sm" variant="ghost" onClick={() => removeMember(m.id)}>Remove</Button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-2xl border bg-card p-6">
        <h2 className="font-semibold">Create invite link</h2>
        <p className="text-sm text-muted-foreground mb-3">Share with someone who should join the team.</p>
        <div className="flex gap-2 items-center">
          <select value={role} onChange={(e) => setRole(e.target.value as "host" | "checker")} className="rounded-md border bg-background px-3 py-2 text-sm">
            <option value="checker">Checker</option>
            <option value="host">Host</option>
          </select>
          <Button onClick={createInvite}>Generate link</Button>
        </div>

        {invites.length > 0 && (
          <ul className="mt-4 space-y-2">
            {invites.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-2 border-t pt-2 first:border-0 first:pt-0">
                <div className="min-w-0">
                  <code className="text-xs truncate block max-w-xs">{`/host/invite/${i.token}`}</code>
                  <span className="text-xs text-muted-foreground">{i.role} · expires {new Date(i.expires_at).toLocaleDateString()}</span>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => copyInvite(i.token)}>Copy</Button>
                  <Button size="sm" variant="ghost" onClick={() => removeInvite(i.id)}>Delete</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}