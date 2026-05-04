import type { Database } from "@/integrations/supabase/types";

export type EventRow = Database["public"]["Tables"]["events"]["Row"] & {
  hosts?: { name: string; slug: string; logo_url: string | null } | null;
};

export type RsvpRow = Database["public"]["Tables"]["rsvps"]["Row"];
export type HostRow = Database["public"]["Tables"]["hosts"]["Row"];
export type HostMemberRow = Database["public"]["Tables"]["host_members"]["Row"];
export type GalleryPhotoRow = Database["public"]["Tables"]["gallery_photos"]["Row"];
export type FeedbackRow = Database["public"]["Tables"]["feedback"]["Row"];
export type ReportRow = Database["public"]["Tables"]["reports"]["Row"];