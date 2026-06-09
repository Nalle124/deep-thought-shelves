import { supabase } from "@/integrations/supabase/client";

export type SearchDoc = {
  id: string;
  title: string;
  icon: string | null;
  parent_id: string | null;
  text: string;
};

// Extract the plain text from a stored BlockNote document (for full-text search).
function plainText(body: string): string {
  if (!body) return "";
  try {
    const blocks = JSON.parse(body);
    const out: string[] = [];
    const walk = (arr: any[]) =>
      arr?.forEach((b: any) => {
        if (Array.isArray(b.content)) {
          b.content.forEach((c: any) => {
            if (c?.type === "text" && c.text) out.push(c.text);
          });
        }
        if (Array.isArray(b.children)) walk(b.children);
      });
    if (Array.isArray(blocks)) walk(blocks);
    return out.join(" ");
  } catch {
    return body;
  }
}

export async function fetchSearchIndex(): Promise<SearchDoc[]> {
  const { data, error } = await supabase
    .from("pages")
    .select("id,title,icon,parent_id,body");
  if (error) throw error;
  return (data ?? []).map((p: any) => ({
    id: p.id,
    title: p.title,
    icon: p.icon,
    parent_id: p.parent_id,
    text: plainText(p.body),
  }));
}

export function searchDocs(index: SearchDoc[], q: string): SearchDoc[] {
  const query = q.trim().toLowerCase();
  if (!query) return [];
  return index
    .filter(
      (d) =>
        (d.title || "").toLowerCase().includes(query) ||
        d.text.toLowerCase().includes(query),
    )
    .slice(0, 12);
}

// Download a full JSON backup of every page.
export async function exportArchive(): Promise<void> {
  const { data, error } = await supabase.from("pages").select("*").order("created_at");
  if (error) throw error;
  const blob = new Blob(
    [JSON.stringify({ exportedAt: new Date().toISOString(), pages: data }, null, 2)],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `arkiv-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
