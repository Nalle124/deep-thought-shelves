import { useEffect, useRef, useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPage, fetchLibrary, updatePage, ancestorChain, childrenOf } from "@/lib/library";
import { PageIcon } from "@/components/PageIcon";
import { CoverBanner, AddCoverButton } from "@/components/PageCover";
import { BlockEditor, type BlockEditorHandle } from "@/components/BlockEditor";
import { FileText } from "lucide-react";

export function PageEditor({ pageId }: { pageId: string }) {
  const qc = useQueryClient();
  const { data: page, isLoading } = useQuery({
    queryKey: ["page", pageId],
    queryFn: () => fetchPage(pageId),
    // Keep fetched pages in cache so revisiting is instant (no refetch flicker).
    staleTime: 60_000,
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

  // Icon + cover save immediately (and refresh the page + sidebar tree).
  const iconMut = useMutation({
    mutationFn: (icon: string | null) => updatePage({ id: pageId, icon }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["library"] });
      qc.invalidateQueries({ queryKey: ["page", pageId] });
    },
  });
  const coverMut = useMutation({
    mutationFn: (cover: string | null) => updatePage({ id: pageId, cover }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["page", pageId] }),
  });

  // debounce auto-save
  const saveTimer = useRef<number | null>(null);
  function scheduleSave(patch: { title?: string; body?: string }) {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => saveMut.mutate(patch), 600);
  }

  const crumbs = useMemo(
    () => ancestorChain(lib?.pages ?? [], pageId),
    [lib, pageId],
  );
  const childPages = useMemo(
    () => childrenOf(lib?.pages ?? [], pageId),
    [lib, pageId],
  );

  if (isLoading || !page) {
    return <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Laddar…</div>;
  }

  return (
    <>
      <header className="h-12 sm:h-14 border-b border-border flex items-center justify-between px-4 sm:px-8 shrink-0 gap-3">
        <div className="text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.2em] truncate flex items-center gap-1.5">
          <Link to="/app" className="opacity-40 hover:opacity-90 transition-opacity">Arkiv</Link>
          {crumbs.map((c) => (
            <span key={c.id} className="flex items-center gap-1.5 min-w-0">
              <span className="opacity-25">/</span>
              <Link
                to="/app/page/$pageId"
                params={{ pageId: c.id }}
                className="opacity-40 hover:opacity-90 transition-opacity truncate max-w-[12ch]"
              >
                {c.title || "Namnlös"}
              </Link>
            </span>
          ))}
          <span className="opacity-25">/</span>
          <span className="opacity-60 truncate">{page.title || "Namnlös"}</span>
        </div>
        <div className="text-[10px] uppercase tracking-widest opacity-30 shrink-0">
          {saveMut.isPending ? "Sparar…" : "Sparat"}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto selection:bg-accent/20">
        {page.cover && <CoverBanner cover={page.cover} onChange={(c) => coverMut.mutate(c)} />}
        <article className={`max-w-2xl mx-auto px-5 sm:px-8 pb-[45vh] ${page.cover ? "pt-6" : "pt-10 sm:pt-20"}`}>
          <div className="mb-4 flex items-center gap-2 flex-wrap">
            <PageIcon icon={page.icon} onChange={(ic) => iconMut.mutate(ic)} size="lg" />
            {!page.cover && <AddCoverButton onChange={(c) => coverMut.mutate(c)} />}
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

          {childPages.length > 0 && (
            <section className="mt-10 border-t border-border pt-6">
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">Undersidor</p>
              <ul className="space-y-0.5">
                {childPages.map((c) => (
                  <li key={c.id}>
                    <Link
                      to="/app/page/$pageId"
                      params={{ pageId: c.id }}
                      className="flex items-center gap-2.5 px-2 py-2 -mx-2 rounded-md hover:bg-ink/5 transition-colors"
                    >
                      {c.icon ? (
                        <span className="text-base leading-none shrink-0" aria-hidden>{c.icon}</span>
                      ) : (
                        <FileText className="size-4 opacity-40 shrink-0" />
                      )}
                      <span className="text-[1.05rem] font-text">{c.title || "Namnlös"}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>
      </div>
    </>
  );
}
