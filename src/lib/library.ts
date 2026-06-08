import { supabase } from "@/integrations/supabase/client";

// One nested model: every node is a Page. A page that has children behaves as a
// "folder" (Notion-style). There is no separate folders table.
export type Page = {
  id: string;
  user_id: string;
  parent_id: string | null;
  title: string;
  body: string;
  icon: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

// The library is the flat list of pages (without bodies, kept light); the UI
// builds the tree from parent_id. Bodies are fetched per page in the editor.
export type Library = { pages: Page[] };

export async function fetchLibrary(): Promise<Library> {
  const { data, error } = await supabase
    .from("pages")
    .select("id,user_id,parent_id,title,icon,position,created_at,updated_at")
    .order("position")
    .order("created_at");
  if (error) throw error;
  return { pages: (data ?? []).map((p: any) => ({ ...p, body: "" })) as Page[] };
}

export async function fetchPage(id: string): Promise<Page> {
  const { data, error } = await supabase.from("pages").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Page;
}

export async function createPage(input: {
  parent_id: string | null;
  title?: string;
  icon?: string | null;
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("pages")
    // Empty title by default so a new page opens with a blank heading to type into.
    .insert({
      title: input.title ?? "",
      parent_id: input.parent_id,
      user_id: u.user.id,
      body: "",
      icon: input.icon ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Page;
}

export async function updatePage(input: {
  id: string;
  title?: string;
  body?: string;
  icon?: string | null;
}) {
  const patch: { title?: string; body?: string; icon?: string | null } = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.body !== undefined) patch.body = input.body;
  if (input.icon !== undefined) patch.icon = input.icon;
  const { error } = await supabase.from("pages").update(patch).eq("id", input.id);
  if (error) throw error;
}

// Deleting a page cascades to its descendants via the parent_id FK (ON DELETE CASCADE).
export async function deletePage(id: string) {
  const { error } = await supabase.from("pages").delete().eq("id", id);
  if (error) throw error;
}

export async function renamePage(id: string, title: string) {
  const { error } = await supabase.from("pages").update({ title }).eq("id", id);
  if (error) throw error;
}

export async function setPageIcon(id: string, icon: string | null) {
  const { error } = await supabase.from("pages").update({ icon }).eq("id", id);
  if (error) throw error;
}

// Re-parent a page (drag-and-drop). parent_id = null drops it to the top level.
export async function movePage(id: string, parent_id: string | null) {
  const { error } = await supabase.from("pages").update({ parent_id }).eq("id", id);
  if (error) throw error;
}

// --- tree helpers (pure, operate on the flat list) ---

export function childrenOf(pages: Page[], parentId: string | null): Page[] {
  return pages.filter((p) => p.parent_id === parentId);
}

export function hasChildren(pages: Page[], id: string): boolean {
  return pages.some((p) => p.parent_id === id);
}

// True if `target` is `maybeAncestor` or sits anywhere beneath it — used to block
// dropping a page into its own subtree.
export function isSelfOrDescendant(pages: Page[], maybeAncestor: string, target: string): boolean {
  if (maybeAncestor === target) return true;
  let current = pages.find((p) => p.id === target);
  while (current?.parent_id) {
    if (current.parent_id === maybeAncestor) return true;
    current = pages.find((p) => p.id === current!.parent_id);
  }
  return false;
}

// Breadcrumb of titles from root down to (but not including) the given page's parent chain.
export function ancestorTitles(pages: Page[], pageId: string | null): string[] {
  const parts: string[] = [];
  let current = pages.find((p) => p.id === pageId);
  while (current?.parent_id) {
    const parent = pages.find((p) => p.id === current!.parent_id);
    if (!parent) break;
    parts.unshift(parent.title || "Namnlös");
    current = parent;
  }
  return parts;
}
