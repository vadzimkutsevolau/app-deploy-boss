import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Look up email + display_name for a list of user ids.
 * Caller must be a host member of the given event (RLS check via auth supabase).
 */
export const getAttendeeContacts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const d = data as { eventId?: string };
    if (!d?.eventId || typeof d.eventId !== "string") {
      throw new Error("eventId required");
    }
    return { eventId: d.eventId };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify event exists and caller is a host member
    const { data: ev } = await supabase
      .from("events")
      .select("id, host_id")
      .eq("id", data.eventId)
      .maybeSingle();
    if (!ev) throw new Error("Event not found");

    const { data: member } = await supabase
      .from("host_members")
      .select("id")
      .eq("host_id", ev.host_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!member) throw new Error("Not authorized");

    // Pull all RSVPs for the event
    const { data: rsvps } = await supabase
      .from("rsvps")
      .select("user_id")
      .eq("event_id", data.eventId);

    const ids = Array.from(new Set((rsvps ?? []).map((r) => r.user_id)));
    if (ids.length === 0) return { contacts: {} as Record<string, { email: string | null; display_name: string | null }> };

    // Use admin to look up emails
    const contacts: Record<string, { email: string | null; display_name: string | null }> = {};
    // listUsers paginates; for small communities one page is fine
    const perPage = 1000;
    let page = 1;
    const wanted = new Set(ids);
    while (wanted.size > 0 && page < 20) {
      const { data: u, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error || !u) break;
      for (const user of u.users) {
        if (wanted.has(user.id)) {
          contacts[user.id] = {
            email: user.email ?? null,
            display_name: (user.user_metadata?.display_name as string) ?? null,
          };
          wanted.delete(user.id);
        }
      }
      if (u.users.length < perPage) break;
      page++;
    }
    return { contacts };
  });