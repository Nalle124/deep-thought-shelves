import { useEffect, useRef, useState, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPage, fetchLibrary, updatePage, trashPage, ancestorChain, childrenOf } from "@/lib/library";
import { PageIcon } from "@/components/PageIcon";
import { CoverBanner, AddCoverButton } from "@/components/PageCover";
import { BlockEditor, type BlockEditorHandle } from "@/components/BlockEditor";
import { QuickScroll } from "@/components/QuickScroll";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileText, MoreHorizontal, Check, Type, ImagePlus, Loader2 } from "lucide-react";

const PAGE_STYLES: { id: string; label: string; hint: string }[] = [
  { id: "classic", label: "Klassisk", hint: "Serif, kursiv rubrik" },
  { id: "modern", label: "Modern", hint: "Ren sans-serif" },
  { id: "grand", label: "Grand", hint: "Stor display-serif" },
];

export function PageEditor({ pageId }: { pageId: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  // Keyboard offset (mobile): keep the action bar pinned just above the keyboard.
  const [kbOffset, setKbOffset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setKbOffset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    update();
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  async function handlePickImage(file: File) {
    setUploadingImg(true);
    try {
      await bodyRef.current?.insertImage(file);
    } catch (e) {
      console.error("Image upload failed", e);
    } finally {
      setUploadingImg(false);
    }
  }

  // Tapping the empty area (incl. the bottom padding) focuses the editor so the
  // keyboard pops up right away — no slow custom handling.
  function handleEditorAreaPointer(e: React.MouseEvent) {
    const t = e.target as HTMLElement;
    if (
      t.closest(".bn-block-content") || t.closest("input") || t.closest("textarea") ||
      t.closest("button") || t.closest("a") || t.closest('[contenteditable="true"]') ||
      t.closest('[role="menu"]') || t.closest('[role="toolbar"]')
    ) return;
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) return; // don't steal a selection
    bodyRef.current?.focus();
  }

  useEffect(() => {
    if (page && initRef.current !== page.id) {
      setTitle(page.title);
      initRef.current = page.id;
      // A freshly created page has a blank title — drop the cursor straight into
      // the heading field so you can start typing immediately.
      if (!page.title) requestAnimationFrame(() => titleRef.current?.focus());
    }
  }, [page]);

  // Browser tab title = the page heading (just "Arkiv" elsewhere).
  useEffect(() => {
    document.title = title.trim() ? title.trim() : "Arkiv";
    return () => { document.title = "Arkiv"; };
  }, [title]);

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
  const styleMut = useMutation({
    mutationFn: (style: string) => updatePage({ id: pageId, style }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["page", pageId] }),
  });
  const delMut = useMutation({
    mutationFn: () => trashPage(pageId, lib?.pages ?? []),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["library"] });
      navigate({ to: "/app" });
    },
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
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <span className="hidden sm:inline text-[10px] uppercase tracking-widest opacity-30">
            {saveMut.isPending ? "Sparar…" : "Sparat"}
          </span>
          <button
            onClick={() => imageInputRef.current?.click()}
            disabled={uploadingImg}
            className="p-1.5 hover:bg-ink/5 rounded-md opacity-60 hover:opacity-100 transition disabled:opacity-40"
            aria-label="Lägg till bild"
            title="Lägg till bild"
          >
            {uploadingImg ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
          </button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePickImage(f); e.target.value = ""; }}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 -mr-1 hover:bg-ink/5 rounded-md opacity-60 hover:opacity-100 transition" aria-label="Sidinställningar">
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                <Type className="size-3.5" /> Typografi
              </DropdownMenuLabel>
              {PAGE_STYLES.map((s) => {
                const active = (page.style ?? "classic") === s.id;
                return (
                  <DropdownMenuItem key={s.id} onSelect={() => styleMut.mutate(s.id)} className="flex items-center justify-between gap-2">
                    <span className="flex flex-col">
                      <span>{s.label}</span>
                      <span className="text-[11px] text-muted-foreground">{s.hint}</span>
                    </span>
                    {active && <Check className="size-3.5 shrink-0" />}
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => delMut.mutate()}
                className="text-destructive"
              >
                Ta bort sida
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto selection:bg-accent/20 cursor-text" onClick={handleEditorAreaPointer}>
        {page.cover && <CoverBanner cover={page.cover} onChange={(c) => coverMut.mutate(c)} />}
        <article
          data-pagestyle={page.style ?? "classic"}
          className={`max-w-2xl mx-auto px-5 sm:px-8 pb-[50vh] ${page.cover ? "pt-6" : "pt-10 sm:pt-20"}`}
        >
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
            className="page-title w-full bg-transparent font-serif text-4xl sm:text-5xl italic tracking-tight outline-none mb-8 sm:mb-10 placeholder:opacity-20"
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

      <QuickScroll scrollRef={scrollRef} />

      {/* Mobile action bar — pinned above the keyboard so adding an image is
          always one tap away, wherever you are in the document. */}
      <div
        className="md:hidden fixed left-0 right-0 z-30 px-3 pointer-events-none"
        style={{ bottom: kbOffset }}
      >
        <div className="pointer-events-auto mb-2 flex items-center gap-1 rounded-full border border-border bg-card/95 backdrop-blur px-1.5 py-1.5 shadow-xl w-fit">
          <button
            onClick={() => imageInputRef.current?.click()}
            disabled={uploadingImg}
            className="p-2.5 rounded-full hover:bg-ink/5 disabled:opacity-50"
            aria-label="Lägg till bild"
          >
            {uploadingImg ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
          </button>
        </div>
      </div>
    </>
  );
}
