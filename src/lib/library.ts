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
  cover: string | null;
  style: string | null;
  deleted_at: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

// The library is the flat list of pages (without bodies, kept light); the UI
// builds the tree from parent_id. Bodies are fetched per page in the editor.
export type Library = { pages: Page[] };

export async function fetchLibrary(): Promise<Library> {
  const cols = "id,user_id,parent_id,title,icon,position,created_at,updated_at";
  let { data, error } = await supabase
    .from("pages").select(cols).is("deleted_at", null).order("position").order("created_at");
  // Resilience: before the trash migration runs, the deleted_at column doesn't
  // exist — fall back to an unfiltered fetch so the archive still loads.
  if (error) {
    ({ data, error } = await supabase.from("pages").select(cols).order("position").order("created_at"));
  }
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
  // Place the new page last among its siblings so it always shows up at the
  // bottom of the list (feels like "most recently created"), instead of landing
  // at an arbitrary spot once other siblings have explicit positions.
  let sibQuery = supabase
    .from("pages")
    .select("position")
    .is("deleted_at", null)
    .order("position", { ascending: false })
    .limit(1);
  sibQuery = input.parent_id === null
    ? sibQuery.is("parent_id", null)
    : sibQuery.eq("parent_id", input.parent_id);
  const { data: sibs } = await sibQuery;
  const nextPosition = ((sibs?.[0]?.position as number | undefined) ?? -1) + 1;
  const { data, error } = await supabase
    .from("pages")
    // Empty title by default so a new page opens with a blank heading to type into.
    .insert({
      title: input.title ?? "",
      parent_id: input.parent_id,
      user_id: u.user.id,
      body: "",
      icon: input.icon ?? null,
      position: nextPosition,
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
  cover?: string | null;
  style?: string | null;
}) {
  const patch: {
    title?: string; body?: string; icon?: string | null; cover?: string | null; style?: string | null;
  } = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.body !== undefined) patch.body = input.body;
  if (input.icon !== undefined) patch.icon = input.icon;
  if (input.cover !== undefined) patch.cover = input.cover;
  if (input.style !== undefined) patch.style = input.style;
  const { error } = await supabase.from("pages").update(patch).eq("id", input.id);
  if (error) throw error;
}

// Permanent delete — cascades to descendants via the parent_id FK (ON DELETE CASCADE).
export async function deletePage(id: string) {
  const { error } = await supabase.from("pages").delete().eq("id", id);
  if (error) throw error;
}

// All ids in the subtree rooted at `id` (itself + every descendant), from a list.
export function subtreeIds(pages: Page[], id: string): string[] {
  const ids = [id];
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const p of pages) {
      if (p.parent_id === cur) {
        ids.push(p.id);
        stack.push(p.id);
      }
    }
  }
  return ids;
}

// Soft-delete a page and its whole subtree (moves them to the trash).
export async function trashPage(id: string, pages: Page[]) {
  const ids = subtreeIds(pages, id);
  const { error } = await supabase
    .from("pages")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", ids);
  if (error) throw error;
}

// Restore a trashed subtree. If its parent is also trashed (or gone), detach to root.
export async function restorePage(id: string, trash: Page[]) {
  const ids = subtreeIds(trash, id);
  const page = trash.find((p) => p.id === id);
  const { error } = await supabase
    .from("pages")
    .update({ deleted_at: null })
    .in("id", ids);
  if (error) throw error;
  if (page?.parent_id && trash.some((p) => p.id === page.parent_id)) {
    await supabase.from("pages").update({ parent_id: null }).eq("id", id);
  }
}

export async function fetchTrash(): Promise<Page[]> {
  const { data, error } = await supabase
    .from("pages")
    .select("id,user_id,parent_id,title,icon,deleted_at,created_at,updated_at")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((p: any) => ({ ...p, body: "", cover: null, style: null, position: 0 })) as Page[];
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

// Reorder a page among its siblings: place it before/after the target (and move
// it to the target's level). Renumbers the whole sibling group's positions.
export async function reorderPage(
  draggedId: string,
  targetId: string,
  place: "before" | "after",
  pages: Page[],
) {
  const target = pages.find((p) => p.id === targetId);
  if (!target || draggedId === targetId) return;
  const parentId = target.parent_id;
  const sibs = pages
    .filter((p) => p.parent_id === parentId && p.id !== draggedId)
    .sort((a, b) => a.position - b.position || +new Date(a.created_at) - +new Date(b.created_at));
  const ti = sibs.findIndex((p) => p.id === targetId);
  const insertAt = place === "before" ? ti : ti + 1;
  const order = [
    ...sibs.slice(0, insertAt).map((p) => p.id),
    draggedId,
    ...sibs.slice(insertAt).map((p) => p.id),
  ];
  await Promise.all(
    order.map((id, i) => {
      const patch: { position: number; parent_id?: string | null } = { position: i };
      if (id === draggedId) patch.parent_id = parentId;
      return supabase.from("pages").update(patch).eq("id", id);
    }),
  );
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
  return ancestorChain(pages, pageId).map((p) => p.title || "Namnlös");
}

// Ancestor pages (id + title), root → nearest parent, for a clickable breadcrumb.
export function ancestorChain(pages: Page[], pageId: string | null): { id: string; title: string }[] {
  const chain: { id: string; title: string }[] = [];
  let current = pages.find((p) => p.id === pageId);
  while (current?.parent_id) {
    const parent = pages.find((p) => p.id === current!.parent_id);
    if (!parent) break;
    chain.unshift({ id: parent.id, title: parent.title || "Namnlös" });
    current = parent;
  }
  return chain;
}
