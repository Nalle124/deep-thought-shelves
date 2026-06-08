import { useEffect, useRef, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPage, fetchLibrary, updatePage, ancestorTitles } from "@/lib/library";
import { PageIcon } from "@/components/PageIcon";
import { BlockEditor, type BlockEditorHandle } from "@/components/BlockEditor";

export function PageEditor({ pageId }: { pageId: string }) {
  const qc = useQueryClient();
  const { data: page, isLoading } = useQuery({
    queryKey: ["page", pageId],
    queryFn: () => fetchPage(pageId),
  });
  const { data: lib } = useQuery({ queryKey: ["library"], queryFn: fetchLibrary });

  const [title, setTitle] = useState("");
  const initRef = useRef<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<BlockEditorHandle>(null);

  useEffect(() => {
    if (page && initRef.current !== page.id) {
      setTitle(page.title);
      initRef.current = page.id;
      // A freshly created page has a blank title — drop the cursor straight into
      // the heading field so you can start typing immediately.
      if (!page.title) requestAnimationFrame(() => titleRef.current?.focus());
    }
  }, [page]);

  const saveMut = useMutation({
    mutationFn: (patch: { title?: string; body?: string }) => updatePage({ id: pageId, ...patch }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["library"] }),
  });

  // Icon saves immediately (and refreshes both the page and the sidebar tree).
  const iconMut = useMutation({
    mutationFn: (icon: string | null) => updatePage({ id: pageId, icon }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["library"] });
      qc.invalidateQueries({ queryKey: ["page", pageId] });
    },
  });

  // debounce auto-save
  const saveTimer = useRef<number | null>(null);
  function scheduleSave(patch: { title?: string; body?: string }) {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => saveMut.mutate(patch), 600);
  }

  const breadcrumb = useMemo(
    () => ancestorTitles(lib?.pages ?? [], pageId).join(" / "),
    [lib, pageId],
  );

  if (isLoading || !page) {
    return <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Laddar…</div>;
  }

  return (
    <>
      <header className="h-12 sm:h-14 border-b border-border flex items-center justify-between px-4 sm:px-8 shrink-0 gap-3">
        <div className="text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.2em] opacity-40 truncate">
          Arkiv {breadcrumb && `/ ${breadcrumb} `}/ {page.title || "Namnlös"}
        </div>
        <div className="text-[10px] uppercase tracking-widest opacity-30 shrink-0">
          {saveMut.isPending ? "Sparar…" : "Sparat"}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto selection:bg-accent/20">
        <article className="max-w-2xl mx-auto py-10 sm:py-20 px-5 sm:px-8">
          <div className="mb-4">
            <PageIcon icon={page.icon} onChange={(ic) => iconMut.mutate(ic)} size="lg" />
          </div>
          <input
            ref={titleRef}
            type="text"
            value={title}
            placeholder="Namnlös"
            onChange={(e) => {
              setTitle(e.target.value);
              scheduleSave({ title: e.target.value });
            }}
            onKeyDown={(e) => {
              // Enter in the title drops you into the body, like Notion.
              if (e.key === "Enter") {
                e.preventDefault();
                bodyRef.current?.focus();
              }
            }}
            className="w-full bg-transparent font-serif text-4xl sm:text-5xl italic tracking-tight outline-none mb-8 sm:mb-10 placeholder:opacity-20"
          />
          <BlockEditor
            key={pageId}
            ref={bodyRef}
            // Initialise from the loaded page body (not the debounced `body`
            // state, which is empty on first render). Keyed by pageId so it
            // mounts once per page with the correct content.
            value={page.body}
            onChange={(v) => scheduleSave({ body: v })}
          />
        </article>
      </div>
    </>
  );
}
