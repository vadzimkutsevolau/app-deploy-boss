import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/host/new")({ component: NewHost });

function NewHost() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [busy, setBusy] = useState(false);

  if (!user) return <div className="mx-auto max-w-md p-10 text-center">Please sign in first.</div>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Name required");
    setBusy(true);
    const { data, error } = await supabase
      .from("hosts")
      .insert({ name: name.trim(), bio: bio.trim() || null, contact_email: email.trim(), slug: slugify(name), created_by: user.id })
      .select()
      .single();
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Host created!");
    nav({ to: "/dashboard" });
    void data;
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-3xl font-bold">Become a host</h1>
      <p className="text-muted-foreground mt-1">Create your host profile to start publishing events.</p>
      <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border bg-card p-6">
        <div><Label>Host name</Label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required /></div>
        <div><Label>Short bio</Label><Textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} /></div>
        <div><Label>Contact email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <Button type="submit" disabled={busy} className="w-full">{busy ? "Creating…" : "Create host"}</Button>
      </form>
    </div>
  );
}