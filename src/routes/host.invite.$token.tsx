import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/host/invite/$token")({
  component: AcceptInvite,
});

function AcceptInvite() {
  const { token } = Route.useParams();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [status, setStatus] = useState<"loading" | "ready" | "expired" | "missing">("loading");
  const [hostName, setHostName] = useState("");
  const [role, setRole] = useState<"host" | "checker">("checker");
  const [hostId, setHostId] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("host_invites")
        .select("host_id, role, expires_at, hosts:host_id(name)")
        .eq("token", token)
        .maybeSingle();
      if (!data) { setStatus("missing"); return; }
      if (new Date(data.expires_at).getTime() < Date.now()) { setStatus("expired"); return; }
      setHostId(data.host_id);
      setRole(data.role as "host" | "checker");
      setHostName((data as unknown as { hosts: { name: string } | null }).hosts?.name ?? "");
      setStatus("ready");
    })();
  }, [token]);

  if (loading || status === "loading") return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  if (status === "missing") return <Center text="This invite link is invalid." />;
  if (status === "expired") return <Center text="This invite link has expired." />;

  if (!user) {
    return (
      <Center>
        <p className="mb-4">Sign in to join <strong>{hostName}</strong> as <em>{role}</em>.</p>
        <Link to="/auth" search={{ redirect: `/host/invite/${token}`, mode: "signin" }}>
          <Button>Sign in</Button>
        </Link>
      </Center>
    );
  }

  const accept = async () => {
    setBusy(true);
    const { error } = await supabase.from("host_members").insert({
      host_id: hostId, user_id: user.id, role,
    });
    setBusy(false);
    if (error && !error.message.includes("duplicate")) return toast.error(error.message);
    toast.success("Joined!");
    nav({ to: "/dashboard" });
  };

  return (
    <Center>
      <p className="mb-4">Join <strong>{hostName}</strong> as <em>{role}</em>?</p>
      <Button onClick={accept} disabled={busy}>{busy ? "Joining…" : "Accept invite"}</Button>
    </Center>
  );
}

function Center({ children, text }: { children?: React.ReactNode; text?: string }) {
  return <div className="mx-auto max-w-md p-10 text-center">{text ?? children}</div>;
}