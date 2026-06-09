import { supabase } from "@/integrations/supabase/client";

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

// Uploads a file to the per-user folder in the (private) `page-media` bucket and
// returns a long-lived signed URL. Private bucket → images aren't publicly
// browsable; only this unguessable signed link works.
export async function uploadMedia(file: File): Promise<string> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not authenticated");
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const path = `${u.user.id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("page-media")
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) throw error;
  const { data, error: signErr } = await supabase.storage
    .from("page-media")
    .createSignedUrl(path, TEN_YEARS);
  if (signErr || !data) throw signErr ?? new Error("Could not sign media URL");
  return data.signedUrl;
}
