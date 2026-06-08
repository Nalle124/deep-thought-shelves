import { supabase } from "@/integrations/supabase/client";

export type Folder = {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  icon: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

export type Page = {
  id: string;
  user_id: string;
  folder_id: string | null;
  title: string;
  body: string;
  position: number;
  created_at: string;
  updated_at: string;
};

export type Library = { folders: Folder[]; pages: Page[] };

export async function fetchLibrary(): Promise<Library> {
  const [foldersRes, pagesRes] = await Promise.all([
    supabase.from("folders").select("*").order("position").order("created_at"),
    supabase.from("pages").select("id,user_id,folder_id,title,position,created_at,updated_at").order("position").order("created_at"),
  ]);
  if (foldersRes.error) throw foldersRes.error;
  if (pagesRes.error) throw pagesRes.error;
  return {
    folders: (foldersRes.data ?? []) as Folder[],
    pages: (pagesRes.data ?? []).map((p: any) => ({ ...p, body: "" })) as Page[],
  };
}

export async function fetchPage(id: string): Promise<Page> {
  const { data, error } = await supabase.from("pages").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Page;
}

export async function createFolder(input: { name: string; parent_id: string | null; icon?: string | null }) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("folders")
    .insert({ name: input.name, parent_id: input.parent_id, user_id: u.user.id, icon: input.icon ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as Folder;
}

export async function createPage(input: { title: string; folder_id: string | null }) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("pages")
    .insert({ title: input.title || "Untitled", folder_id: input.folder_id, user_id: u.user.id, body: "" })
    .select()
    .single();
  if (error) throw error;
  return data as Page;
}

export async function updatePage(input: { id: string; title?: string; body?: string }) {
  const patch: { title?: string; body?: string } = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.body !== undefined) patch.body = input.body;
  const { error } = await supabase.from("pages").update(patch).eq("id", input.id);
  if (error) throw error;
}

export async function deletePage(id: string) {
  const { error } = await supabase.from("pages").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteFolder(id: string) {
  const { error } = await supabase.from("folders").delete().eq("id", id);
  if (error) throw error;
}

export async function renameFolder(id: string, name: string) {
  const { error } = await supabase.from("folders").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function renamePage(id: string, title: string) {
  const { error } = await supabase.from("pages").update({ title }).eq("id", id);
  if (error) throw error;
}

export async function setFolderIcon(id: string, icon: string | null) {
  const { error } = await supabase.from("folders").update({ icon }).eq("id", id);
  if (error) throw error;
}

export async function moveFolder(id: string, parent_id: string | null) {
  const { error } = await supabase.from("folders").update({ parent_id }).eq("id", id);
  if (error) throw error;
}

export async function movePage(id: string, folder_id: string | null) {
  const { error } = await supabase.from("pages").update({ folder_id }).eq("id", id);
  if (error) throw error;
}
