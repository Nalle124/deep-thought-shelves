import { supabase } from "@/integrations/supabase/client";

// Uploads a file to the per-user folder in the `page-media` bucket and returns a
// permanent public URL. The bucket is public but paths are random UUIDs (not
// enumerable), so links never expire and images never break — which matters more
// than the theoretical exposure of an unguessable URL for a personal journal.
export async function uploadMedia(file: File): Promise<string> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not authenticated");
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const path = `${u.user.id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("page-media")
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) throw error;
  return supabase.storage.from("page-media").getPublicUrl(path).data.publicUrl;
}
