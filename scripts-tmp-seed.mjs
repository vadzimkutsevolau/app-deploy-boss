import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function ensureUser(email, password, display_name) {
  const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = list.users.find(u => u.email === email);
  if (existing) return existing.id;
  const { data, error } = await sb.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { display_name }
  });
  if (error) throw error;
  return data.user.id;
}

const organizerId = await ensureUser("organizer@gather.demo", "Organizer123!", "Riverside Org");
console.log("organizer:", organizerId);

// Create attendees too
const attendees = [];
for (const [email, name] of [
  ["ada@gather.demo", "Ada Lovelace"],
  ["grace@gather.demo", "Grace Hopper"],
  ["alan@gather.demo", "Alan Turing"],
  ["margaret@gather.demo", "Margaret Hamilton"],
]) {
  const id = await ensureUser(email, "Attendee123!", name);
  attendees.push({ id, name });
  console.log(name, id);
}

console.log(JSON.stringify({ organizerId, attendees }, null, 2));
