import { useState, type ReactNode, type DragEvent, type MouseEvent } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchLibrary, createPage, deletePage, renamePage, movePage, setPageIcon,
  childrenOf, hasChildren, isSelfOrDescendant, type Page,
} from "@/lib/library";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/lib/theme";
import { toast } from "sonner";
import { PageIcon } from "@/components/PageIcon";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  ChevronRight, MoreHorizontal, Plus, Sun, Moon, LogOut, Trash2, Pencil, Menu,
} from "lucide-react";

const DRAG_TYPE = "application/x-arkiv";
type DragPayload = { id: string };

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
  const { data: lib } = useQuery({ queryKey: ["library"], queryFn: fetchLibrary });
  const params = useParams({ strict: false }) as { pageId?: string };
  const [mobileOpen, setMobileOpen] = useState(false);

  const pages = lib?.pages ?? [];

  return (
    <div className="flex h-[100dvh] w-full bg-paper text-ink font-sans overflow-hidden">
      <div className="hidden md:flex">
        <SidebarBody pages={pages} activePageId={params.pageId} onNavigate={() => {}} />
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-[85vw] max-w-xs bg-paper border-border">
          <SidebarBody pages={pages} activePageId={params.pageId} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <main className="flex-1 flex flex-col relative overflow-hidden min-w-0">
        <div className="md:hidden h-12 border-b border-border flex items-center px-3 shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 -ml-2 hover:bg-ink/5 rounded-md"
            aria-label="Öppna meny"
          >
            <Menu className="size-5" />
          </button>
          <Link to="/app" className="font-serif italic text-xl tracking-tight ml-1">Arkiv</Link>
        </div>
        {children}
        <FloatingAdd />
      </main>
    </div>
  );
}

function SidebarBody({ pages, activePageId, onNavigate }: {
  pages: Page[]; activePageId?: string; onNavigate: () => void;
}) {
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const qc = useQueryClient();

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
      <div className="p-5 sm:p-6 flex items-center justify-between">
        <Link to="/app" onClick={onNavigate} className="font-serif italic text-2xl tracking-tight">Arkiv</Link>
        <button
          onClick={toggle}
          className="p-1.5 hover:bg-ink/5 rounded-md transition-colors"
          aria-label="Byt tema"
        >
          {theme === "light" ? <Moon className="size-4 opacity-60" /> : <Sun className="size-4 opacity-60" />}
        </button>
      </div>

      <nav
        className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleRootDrop}
      >
        {roots.map((p) => (
          <PageNode key={p.id} page={p} pages={pages} depth={0} activePageId={activePageId} onNavigate={onNavigate} />
        ))}
        {roots.length === 0 && (
          <p className="px-3 py-8 text-xs text-muted-foreground italic">
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
  const [hover, setHover] = useState(false);
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

  function onDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setHover(false);
    const data = parseDrag(e);
    if (!data || data.id === page.id) return;
    if (isSelfOrDescendant(pages, data.id, page.id)) {
      toast.error("Kan inte flytta en sida in i sig själv");
      return;
    }
    moveMut.mutate({ id: data.id, parent: page.id });
    setOpen(true);
  }

  const stop = (e: MouseEvent) => { e.preventDefault(); e.stopPropagation(); };

  return (
    <div>
      <div
        draggable
        onDragStart={(e) => { e.stopPropagation(); setDrag(e, { id: page.id }); }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setHover(true); }}
        onDragLeave={() => setHover(false)}
        onDrop={onDrop}
        className={`group flex items-center gap-1 pr-1 rounded-sm transition-colors ${
          hover ? "bg-accent/15" : active ? "bg-accent/15" : "hover:bg-ink/5"
        }`}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
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
          className={`flex-1 min-w-0 py-1.5 text-sm truncate ${active ? "text-accent" : "opacity-80 group-hover:opacity-100"}`}
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
        <RowMenu page={page} />
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

function RowMenu({ page }: { page: Page }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(page.title);
  const [confirmDel, setConfirmDel] = useState(false);

  const renameMut = useMutation({
    mutationFn: () => renamePage(page.id, title.trim() || "Namnlös"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["library"] });
      qc.invalidateQueries({ queryKey: ["page", page.id] });
      setRenaming(false);
    },
  });
  const delMut = useMutation({
    mutationFn: () => deletePage(page.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["library"] });
      toast.success("Sida borttagen");
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
          <DropdownMenuItem onSelect={() => setConfirmDel(true)} className="text-destructive">
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

      <AlertDialog open={confirmDel} onOpenChange={setConfirmDel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif italic text-2xl">Ta bort den här sidan?</AlertDialogTitle>
            <AlertDialogDescription>
              Alla undersidor inuti tas också bort permanent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={() => delMut.mutate()}>Ta bort</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Single action: create a new top-level page and jump straight into it. No choice
// between page/folder — a page becomes a "folder" the moment something nests in it.
function FloatingAdd() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const pageMut = useMutation({
    mutationFn: () => createPage({ parent_id: null }),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ["library"] });
      navigate({ to: "/app/page/$pageId", params: { pageId: p.id } });
    },
  });

  return (
    <div className="absolute bottom-6 right-6 sm:bottom-8 sm:right-8 z-20">
      <button
        onClick={() => pageMut.mutate()}
        disabled={pageMut.isPending}
        className="size-14 sm:size-12 rounded-full bg-ink text-paper shadow-2xl flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-60"
        aria-label="Ny sida"
      >
        <Plus className="size-6 sm:size-5" />
      </button>
    </div>
  );
}
