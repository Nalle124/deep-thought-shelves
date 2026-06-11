import { useState, useEffect, useRef, useMemo, type ReactNode, type DragEvent, type MouseEvent } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchLibrary, fetchPage, createPage, deletePage, trashPage, restorePage, fetchTrash,
  renamePage, movePage, reorderPage, setPageIcon, childrenOf, hasChildren, isSelfOrDescendant, type Page,
} from "@/lib/library";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/lib/theme";
import { PageIcon } from "@/components/PageIcon";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  ChevronRight, MoreHorizontal, Plus, Sun, Moon, LogOut, Trash2, Pencil, Menu,
  PanelLeft, PanelLeftClose, House, FileText, RotateCcw,
} from "lucide-react";

const DRAG_TYPE = "application/x-arkiv";
type DragPayload = { id: string };

// Shared "create a top-level page and open it" action.
function useCreateRootPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: () => createPage({ parent_id: null }),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ["library"] });
      navigate({ to: "/app/page/$pageId", params: { pageId: p.id } });
    },
  });
}

function parseDrag(e: DragEvent): DragPayload | null {
  const raw = e.dataTransfer.getData(DRAG_TYPE);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
function setDrag(e: DragEvent, payload: DragPayload) {
  e.dataTransfer.setData(DRAG_TYPE, JSON.stringify(payload));
  e.dataTransfer.effectAllowed = "move";
}

export function AppShell({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { data: lib } = useQuery({ queryKey: ["library"], queryFn: fetchLibrary });
  const params = useParams({ strict: false }) as { pageId?: string };

  // Preload every page (with body) once and seed the per-page cache so jumping
  // between pages is instant — no per-click network fetch / "Laddar" flash.
  // Page text is tiny, so one bulk fetch is cheap.
  const seeded = useRef(false);
  useEffect(() => {
    if (!lib || seeded.current) return;
    seeded.current = true;
    supabase
      .from("pages")
      .select("*")
      .is("deleted_at", null)
      .then(({ data }) => {
        data?.forEach((p) => qc.setQueryData(["page", p.id], p));
      });
  }, [lib, qc]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [deskOpen, setDeskOpen] = useState(true);
  const newPage = useCreateRootPage();

  const pages = lib?.pages ?? [];

  return (
    <div className="flex h-[100dvh] w-full bg-paper text-ink font-sans overflow-hidden">
      <div className={deskOpen ? "hidden md:flex" : "hidden"}>
        <SidebarBody
          pages={pages}
          activePageId={params.pageId}
          onNavigate={() => {}}
          onCollapse={() => setDeskOpen(false)}
        />
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-[82vw] max-w-xs bg-paper border-border [&>button.absolute]:hidden">
          <SidebarBody pages={pages} activePageId={params.pageId} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <main className="flex-1 flex flex-col relative overflow-hidden min-w-0">
        {/* Mobile top bar — pad past the status bar / notch in standalone PWA mode
            (viewport-fit=cover + translucent status bar draws content under it). */}
        <div className="md:hidden min-h-12 border-b border-border flex items-center justify-between px-3 shrink-0 pt-[env(safe-area-inset-top,0px)]">
          <div className="flex items-center">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 -ml-2 hover:bg-ink/5 rounded-md"
              aria-label="Öppna meny"
            >
              <Menu className="size-5" />
            </button>
            <Link to="/app" className="font-serif italic text-xl tracking-tight ml-1">Arkiv</Link>
          </div>
          <button
            onClick={() => newPage.mutate()}
            className="p-2 -mr-2 hover:bg-ink/5 rounded-md"
            aria-label="Ny sida"
          >
            <Plus className="size-5" />
          </button>
        </div>

        {/* Reveal a collapsed desktop sidebar */}
        {!deskOpen && (
          <button
            onClick={() => setDeskOpen(true)}
            className="hidden md:flex absolute top-2.5 left-2.5 z-30 p-2 rounded-md bg-paper/70 backdrop-blur hover:bg-ink/10 items-center"
            aria-label="Visa sidomeny"
          >
            <PanelLeft className="size-4 opacity-70" />
          </button>
        )}

        {children}
        {/* Floating add: only on desktop, and only while the sidebar is open. */}
        {deskOpen && (
          <div className="hidden md:block">
            <FloatingAdd />
          </div>
        )}
      </main>
    </div>
  );
}

function SidebarBody({ pages, activePageId, onNavigate, onCollapse }: {
  pages: Page[]; activePageId?: string; onNavigate: () => void; onCollapse?: () => void;
}) {
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const newPage = useCreateRootPage();

  const roots = childrenOf(pages, null);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  // Drop onto empty sidebar space = move to top level.
  const moveMut = useMutation({
    mutationFn: ({ id, parent }: { id: string; parent: string | null }) => movePage(id, parent),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["library"] }),
  });
  function handleRootDrop(e: DragEvent) {
    e.preventDefault();
    const data = parseDrag(e);
    if (data) moveMut.mutate({ id: data.id, parent: null });
  }

  return (
    <aside className="w-72 max-w-full h-full shrink-0 md:border-r border-border flex flex-col bg-paper">
      <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-[calc(env(safe-area-inset-top,0px)+1.25rem)] sm:pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] flex items-center justify-between">
        <Link to="/app" onClick={onNavigate} className="font-serif italic text-2xl tracking-tight">Arkiv</Link>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => { newPage.mutate(); onNavigate(); }}
            disabled={newPage.isPending}
            className="p-1.5 hover:bg-ink/5 rounded-md transition-colors disabled:opacity-50"
            aria-label="Ny sida"
            title="Ny sida"
          >
            <Plus className="size-4 opacity-60" />
          </button>
          <button
            onClick={toggle}
            className="p-1.5 hover:bg-ink/5 rounded-md transition-colors"
            aria-label="Byt tema"
          >
            {theme === "light" ? <Moon className="size-4 opacity-60" /> : <Sun className="size-4 opacity-60" />}
          </button>
          {onCollapse && (
            <button
              onClick={onCollapse}
              className="hidden md:block p-1.5 hover:bg-ink/5 rounded-md transition-colors"
              aria-label="Dölj sidomeny"
              title="Dölj sidomeny"
            >
              <PanelLeftClose className="size-4 opacity-60" />
            </button>
          )}
        </div>
      </div>

      <nav
        className="flex-1 overflow-y-auto px-3 py-2"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleRootDrop}
      >
        <Link
          to="/app"
          onClick={onNavigate}
          activeOptions={{ exact: true }}
          className={`flex items-center gap-2.5 px-2 py-2.5 md:py-2 text-base md:text-[0.95rem] rounded-md transition-colors ${
            !activePageId ? "bg-accent/15 text-accent" : "opacity-70 hover:opacity-100 hover:bg-ink/5"
          }`}
        >
          <House className="size-4 opacity-60 shrink-0" />
          <span>Hem</span>
        </Link>

        <p className="px-2 mt-6 mb-1.5 text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">
          Sidor
        </p>
        <div className="space-y-0.5">
          {roots.map((p) => (
            <PageNode key={p.id} page={p} pages={pages} depth={0} activePageId={activePageId} onNavigate={onNavigate} />
          ))}
        </div>
        {roots.length === 0 && (
          <p className="px-2 py-6 text-xs text-muted-foreground italic">
            Tomt arkiv. Tryck <span className="font-medium">+</span> för att börja.
          </p>
        )}
      </nav>

      <div className="p-4 border-t border-border flex items-center gap-3">
        <div className="size-8 rounded-full bg-accent/20 border border-accent/30" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">Ditt arkiv</p>
          <p className="text-[10px] opacity-40 uppercase tracking-wider">Privat</p>
        </div>
        <TrashButton />
        <button onClick={signOut} className="p-1.5 hover:bg-ink/5 rounded-md" aria-label="Logga ut">
          <LogOut className="size-3.5 opacity-60" />
        </button>
      </div>
    </aside>
  );
}

function PageNode({ page, pages, depth, activePageId, onNavigate }: {
  page: Page; pages: Page[]; depth: number; activePageId?: string; onNavigate: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [dropZone, setDropZone] = useState<null | "before" | "after" | "inside">(null);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const kids = childrenOf(pages, page.id);
  const isParent = kids.length > 0;
  const active = page.id === activePageId;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["library"] });

  const moveMut = useMutation({
    mutationFn: ({ id, parent }: { id: string; parent: string | null }) => movePage(id, parent),
    onSuccess: invalidate,
  });
  const reorderMut = useMutation({
    mutationFn: (v: { draggedId: string; place: "before" | "after" }) =>
      reorderPage(v.draggedId, page.id, v.place, pages),
    onSuccess: invalidate,
  });
  const iconMut = useMutation({
    mutationFn: (icon: string | null) => setPageIcon(page.id, icon),
    onSuccess: invalidate,
  });
  const addChildMut = useMutation({
    mutationFn: () => createPage({ parent_id: page.id }),
    onSuccess: (child) => {
      invalidate();
      setOpen(true);
      navigate({ to: "/app/page/$pageId", params: { pageId: child.id } });
      onNavigate();
    },
  });

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const h = rect.height || 1;
    // Top/bottom edges = reorder (before/after); middle = nest inside.
    setDropZone(y < h * 0.28 ? "before" : y > h * 0.72 ? "after" : "inside");
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const zone = dropZone;
    setDropZone(null);
    const data = parseDrag(e);
    if (!data || data.id === page.id) return;
    if (zone === "inside") {
      if (isSelfOrDescendant(pages, data.id, page.id)) return;
      moveMut.mutate({ id: data.id, parent: page.id });
      setOpen(true);
    } else if (zone) {
      // Reorder among siblings (drops it at this page's level).
      if (page.parent_id && isSelfOrDescendant(pages, data.id, page.parent_id)) return;
      reorderMut.mutate({ draggedId: data.id, place: zone });
    }
  }

  const stop = (e: MouseEvent) => { e.preventDefault(); e.stopPropagation(); };

  return (
    <div>
      <div
        draggable
        onDragStart={(e) => { e.stopPropagation(); setDrag(e, { id: page.id }); }}
        onDragOver={onDragOver}
        onDragLeave={() => setDropZone(null)}
        onDrop={onDrop}
        className={`group relative flex items-center gap-1 pr-1 rounded-sm transition-colors ${
          dropZone === "inside" ? "bg-accent/15" : active ? "bg-accent/15" : "hover:bg-ink/5"
        }`}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        {dropZone === "before" && <div className="absolute -top-px left-1 right-1 h-0.5 rounded bg-accent z-10" />}
        {dropZone === "after" && <div className="absolute -bottom-px left-1 right-1 h-0.5 rounded bg-accent z-10" />}
        <button
          onClick={() => setOpen(!open)}
          className={`size-5 flex items-center justify-center shrink-0 rounded hover:bg-ink/10 ${isParent ? "" : "invisible"}`}
          aria-label={open ? "Fäll ihop" : "Fäll ut"}
        >
          <ChevronRight className={`size-3 opacity-50 transition-transform ${open ? "rotate-90" : ""}`} />
        </button>

        <PageIcon icon={page.icon} onChange={(ic) => iconMut.mutate(ic)} size="sm" />

        <Link
          to="/app/page/$pageId"
          params={{ pageId: page.id }}
          onClick={onNavigate}
          draggable={false}
          // Preload the page body on hover so the click navigates instantly.
          onPointerEnter={() =>
            qc.prefetchQuery({
              queryKey: ["page", page.id],
              queryFn: () => fetchPage(page.id),
              staleTime: 60_000,
            })
          }
          className={`flex-1 min-w-0 py-2.5 md:py-2 text-base md:text-[0.95rem] truncate ${active ? "text-accent" : "opacity-80 group-hover:opacity-100"}`}
        >
          {page.title || "Namnlös"}
        </Link>

        <button
          onClick={(e) => { stop(e); addChildMut.mutate(); }}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-ink/10 rounded shrink-0 transition-opacity"
          aria-label="Lägg till undersida"
        >
          <Plus className="size-3.5" />
        </button>
        <RowMenu page={page} pages={pages} />
      </div>

      {isParent && open && (
        <div className="ml-3 border-l border-border/60">
          {kids.map((c) => (
            <PageNode key={c.id} page={c} pages={pages} depth={depth + 1} activePageId={activePageId} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}

function RowMenu({ page, pages }: { page: Page; pages: Page[] }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(page.title);

  const renameMut = useMutation({
    mutationFn: () => renamePage(page.id, title.trim() || "Namnlös"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["library"] });
      qc.invalidateQueries({ queryKey: ["page", page.id] });
      setRenaming(false);
    },
  });
  const delMut = useMutation({
    mutationFn: () => trashPage(page.id, pages),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["library"] });
      navigate({ to: "/app" });
    },
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <span
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className="opacity-60 md:opacity-0 md:group-hover:opacity-100 p-1 hover:bg-ink/10 rounded shrink-0 cursor-pointer"
          >
            <MoreHorizontal className="size-3.5" />
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onSelect={() => { setTitle(page.title); setRenaming(true); }}>
            <Pencil className="size-3.5 mr-2" /> Byt namn
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => delMut.mutate()} className="text-destructive">
            <Trash2 className="size-3.5 mr-2" /> Ta bort
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-serif italic text-2xl">Byt namn</DialogTitle></DialogHeader>
          <input
            autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") renameMut.mutate(); }}
            className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <DialogFooter>
            <button onClick={() => setRenaming(false)} className="px-3 py-1.5 text-sm">Avbryt</button>
            <button onClick={() => renameMut.mutate()} className="px-3 py-1.5 text-sm bg-ink text-paper rounded-md">Spara</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Single action: create a new top-level page and jump straight into it. No choice
// between page/folder — a page becomes a "folder" the moment something nests in it.
function TrashButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="p-1.5 hover:bg-ink/5 rounded-md" aria-label="Papperskorg" title="Papperskorg">
        <Trash2 className="size-3.5 opacity-60" />
      </button>
      <TrashDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function TrashDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const { data: trash } = useQuery({ queryKey: ["trash"], queryFn: fetchTrash, enabled: open });
  // Only show the roots of each deleted subtree (a deleted page whose parent
  // isn't itself in the trash).
  const items = useMemo(() => {
    const t = trash ?? [];
    const ids = new Set(t.map((p) => p.id));
    return t.filter((p) => !p.parent_id || !ids.has(p.parent_id));
  }, [trash]);

  const restoreMut = useMutation({
    mutationFn: (id: string) => restorePage(id, trash ?? []),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trash"] });
      qc.invalidateQueries({ queryKey: ["library"] });
    },
  });
  const purgeMut = useMutation({
    mutationFn: (id: string) => deletePage(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trash"] }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif italic text-2xl">Papperskorg</DialogTitle>
        </DialogHeader>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Papperskorgen är tom.</p>
        ) : (
          <ul className="max-h-80 overflow-y-auto -mx-1">
            {items.map((p) => (
              <li key={p.id} className="flex items-center gap-2 px-1 py-2 border-b border-border last:border-0">
                <span className="text-base leading-none shrink-0">
                  {p.icon ?? <FileText className="size-4 opacity-40" />}
                </span>
                <span className="flex-1 truncate text-sm">{p.title || "Namnlös"}</span>
                <button
                  onClick={() => restoreMut.mutate(p.id)}
                  className="p-1.5 rounded-md hover:bg-ink/5 text-muted-foreground hover:text-ink"
                  title="Återställ"
                >
                  <RotateCcw className="size-4" />
                </button>
                <button
                  onClick={() => purgeMut.mutate(p.id)}
                  className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  title="Ta bort permanent"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FloatingAdd() {
  const newPage = useCreateRootPage();

  return (
    <div className="absolute bottom-6 right-6 sm:bottom-8 sm:right-8 z-20">
      <button
        onClick={() => newPage.mutate()}
        disabled={newPage.isPending}
        className="size-14 sm:size-12 rounded-full bg-ink text-paper shadow-2xl flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-60"
        aria-label="Ny sida"
      >
        <Plus className="size-6 sm:size-5" />
      </button>
    </div>
  );
}
