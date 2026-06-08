import { useState, useMemo, type ReactNode, type DragEvent } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchLibrary, createFolder, createPage, deleteFolder, deletePage,
  renameFolder, renamePage, moveFolder, movePage, setFolderIcon,
  type Folder, type Page,
} from "@/lib/library";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/lib/theme";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  ChevronRight, FileText, Folder as FolderIcon, MoreHorizontal, Plus,
  Sun, Moon, LogOut, Trash2, Pencil, Menu, Smile,
} from "lucide-react";

const EMOJI_CHOICES = [
  "📁","📂","📔","📕","📗","📘","📙","📓","📒","📚","📝","✏️","🖊️","🖋️","📌","📎","🗂️","🗃️","🗒️","📅",
  "📆","🗓️","⭐","✨","🌟","💡","🔥","🎯","🎨","🎵","☕","🌱","🌿","🍃","🌳","🌊","🌙","☀️","⛅","🌈",
  "❤️","🧡","💛","💚","💙","💜","🤍","🖤","🤎","🏠","🏡","🏢","🏛️","✈️","🚗","🎒","💼","👤","👥","🐾",
];

export function AppShell({ children }: { children: ReactNode }) {
  const { data: lib } = useQuery({ queryKey: ["library"], queryFn: fetchLibrary });
  const params = useParams({ strict: false }) as { pageId?: string };
  const [mobileOpen, setMobileOpen] = useState(false);

  const folders = lib?.folders ?? [];
  const pages = lib?.pages ?? [];
  const activeFolderId = getActiveFolderId(pages, params.pageId);

  return (
    <div className="flex h-[100dvh] w-full bg-paper text-ink font-sans overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <SidebarBody folders={folders} pages={pages} activePageId={params.pageId} onNavigate={() => {}} />
      </div>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-[85vw] max-w-xs bg-paper border-border">
          <SidebarBody
            folders={folders}
            pages={pages}
            activePageId={params.pageId}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <main className="flex-1 flex flex-col relative overflow-hidden min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden h-12 border-b border-border flex items-center px-3 shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 -ml-2 hover:bg-ink/5 rounded-md"
            aria-label="Öppna meny"
          >
            <Menu className="size-5" />
          </button>
          <Link to="/app" className="font-serif italic text-xl tracking-tight ml-1">Anthology</Link>
        </div>
        {children}
        <FloatingAdd activeFolderId={activeFolderId} />
      </main>
    </div>
  );
}

function getActiveFolderId(pages: Page[], pageId?: string): string | null {
  if (!pageId) return null;
  return pages.find((p) => p.id === pageId)?.folder_id ?? null;
}

function SidebarBody({ folders, pages, activePageId, onNavigate }: {
  folders: Folder[]; pages: Page[]; activePageId?: string; onNavigate: () => void;
}) {
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const rootFolders = folders.filter((f) => f.parent_id === null);
  const rootPages = pages.filter((p) => p.folder_id === null);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  // Drop on root = unset parent
  const moveFolderMut = useMutation({
    mutationFn: ({ id, parent }: { id: string; parent: string | null }) => moveFolder(id, parent),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["library"] }),
  });
  const movePageMut = useMutation({
    mutationFn: ({ id, folder }: { id: string; folder: string | null }) => movePage(id, folder),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["library"] }),
  });

  function handleRootDrop(e: DragEvent) {
    e.preventDefault();
    const data = parseDrag(e);
    if (!data) return;
    if (data.kind === "folder") moveFolderMut.mutate({ id: data.id, parent: null });
    else movePageMut.mutate({ id: data.id, folder: null });
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
        {rootFolders.map((f) => (
          <FolderNode key={f.id} folder={f} folders={folders} pages={pages} depth={0} activePageId={activePageId} onNavigate={onNavigate} />
        ))}
        {rootPages.map((p) => (
          <PageNode key={p.id} page={p} depth={0} active={p.id === activePageId} onNavigate={onNavigate} />
        ))}
        {rootFolders.length === 0 && rootPages.length === 0 && (
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

type DragPayload = { kind: "folder" | "page"; id: string };
function parseDrag(e: DragEvent): DragPayload | null {
  const raw = e.dataTransfer.getData("application/x-anthology");
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
function setDrag(e: DragEvent, payload: DragPayload) {
  e.dataTransfer.setData("application/x-anthology", JSON.stringify(payload));
  e.dataTransfer.effectAllowed = "move";
}

function FolderNode({ folder, folders, pages, depth, activePageId, onNavigate }: {
  folder: Folder; folders: Folder[]; pages: Page[]; depth: number; activePageId?: string; onNavigate: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [hover, setHover] = useState(false);
  const qc = useQueryClient();
  const children = folders.filter((f) => f.parent_id === folder.id);
  const childPages = pages.filter((p) => p.folder_id === folder.id);

  const moveFolderMut = useMutation({
    mutationFn: ({ id, parent }: { id: string; parent: string | null }) => moveFolder(id, parent),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["library"] }),
  });
  const movePageMut = useMutation({
    mutationFn: ({ id, fid }: { id: string; fid: string | null }) => movePage(id, fid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["library"] }),
  });

  function isDescendant(maybeAncestor: string, target: string): boolean {
    if (maybeAncestor === target) return true;
    const f = folders.find((x) => x.id === target);
    if (!f || !f.parent_id) return false;
    return isDescendant(maybeAncestor, f.parent_id);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setHover(false);
    const data = parseDrag(e);
    if (!data) return;
    if (data.kind === "folder") {
      if (data.id === folder.id) return;
      if (isDescendant(data.id, folder.id)) {
        toast.error("Kan inte flytta en mapp in i sig själv");
        return;
      }
      moveFolderMut.mutate({ id: data.id, parent: folder.id });
    } else {
      movePageMut.mutate({ id: data.id, fid: folder.id });
    }
    setOpen(true);
  }

  return (
    <div>
      <div
        draggable
        onDragStart={(e) => { e.stopPropagation(); setDrag(e, { kind: "folder", id: folder.id }); }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setHover(true); }}
        onDragLeave={() => setHover(false)}
        onDrop={onDrop}
        className={hover ? "bg-accent/15 rounded-sm" : ""}
      >
        <Row depth={depth} onClick={() => setOpen(!open)}>
          <ChevronRight className={`size-3 opacity-40 transition-transform shrink-0 ${open ? "rotate-90" : ""}`} />
          {folder.icon ? (
            <span className="text-sm leading-none shrink-0" aria-hidden>{folder.icon}</span>
          ) : (
            <FolderIcon className="size-3.5 opacity-50 shrink-0" />
          )}
          <span className="truncate flex-1 text-left">{folder.name}</span>
          <FolderMenu folder={folder} />
        </Row>
      </div>
      {open && (
        <div className="ml-3 border-l border-border/60 pl-1">
          {children.map((f) => (
            <FolderNode key={f.id} folder={f} folders={folders} pages={pages} depth={depth + 1} activePageId={activePageId} onNavigate={onNavigate} />
          ))}
          {childPages.map((p) => (
            <PageNode key={p.id} page={p} depth={depth + 1} active={p.id === activePageId} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}

function PageNode({ page, depth, active, onNavigate }: { page: Page; depth: number; active: boolean; onNavigate: () => void }) {
  return (
    <div
      draggable
      onDragStart={(e) => { e.stopPropagation(); setDrag(e, { kind: "page", id: page.id }); }}
    >
      <Link
        to="/app/page/$pageId"
        params={{ pageId: page.id }}
        onClick={onNavigate}
        // Let the wrapper div own the drag (anchors are natively draggable as a
        // URL, which would otherwise hijack the move payload).
        draggable={false}
        className={`group flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm transition-colors ${
          active ? "bg-accent/15 text-accent" : "opacity-60 hover:opacity-100 hover:bg-ink/5"
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <FileText className="size-3.5 opacity-50 shrink-0" />
        <span className="truncate flex-1">{page.title || "Namnlös"}</span>
        <PageMenu page={page} />
      </Link>
    </div>
  );
}

function Row({ depth, children, onClick }: { depth: number; children: ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group w-full flex items-center gap-2 px-2 py-1.5 text-sm font-medium rounded-sm hover:bg-ink/5 transition-colors text-left"
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
    >
      {children}
    </button>
  );
}

function FolderMenu({ folder }: { folder: Folder }) {
  const qc = useQueryClient();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(folder.name);
  const [confirmDel, setConfirmDel] = useState(false);
  const [iconOpen, setIconOpen] = useState(false);

  const renameMut = useMutation({
    mutationFn: () => renameFolder(folder.id, name.trim() || folder.name),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["library"] }); setRenaming(false); },
  });
  const delMut = useMutation({
    mutationFn: () => deleteFolder(folder.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["library"] }); toast.success("Mapp borttagen"); },
  });
  const iconMut = useMutation({
    mutationFn: (icon: string | null) => setFolderIcon(folder.id, icon),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["library"] }); setIconOpen(false); },
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <span
            onClick={(e) => e.stopPropagation()}
            className="ml-auto opacity-60 md:opacity-0 md:group-hover:opacity-100 p-1 hover:bg-ink/10 rounded"
          >
            <MoreHorizontal className="size-3.5" />
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onSelect={() => setIconOpen(true)}>
            <Smile className="size-3.5 mr-2" /> Byt ikon
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setRenaming(true)}>
            <Pencil className="size-3.5 mr-2" /> Byt namn
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setConfirmDel(true)} className="text-destructive">
            <Trash2 className="size-3.5 mr-2" /> Ta bort
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={iconOpen} onOpenChange={setIconOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-serif italic text-2xl">Välj ikon</DialogTitle></DialogHeader>
          <div className="grid grid-cols-8 gap-1 max-h-72 overflow-y-auto">
            {EMOJI_CHOICES.map((e) => (
              <button
                key={e}
                onClick={() => iconMut.mutate(e)}
                className={`aspect-square text-xl rounded hover:bg-ink/5 transition-colors ${folder.icon === e ? "bg-accent/20" : ""}`}
              >
                {e}
              </button>
            ))}
          </div>
          <DialogFooter>
            <button onClick={() => iconMut.mutate(null)} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-ink">
              Ta bort ikon
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-serif italic text-2xl">Byt namn på mapp</DialogTitle></DialogHeader>
          <input
            autoFocus value={name} onChange={(e) => setName(e.target.value)}
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
            <AlertDialogTitle className="font-serif italic text-2xl">Ta bort den här mappen?</AlertDialogTitle>
            <AlertDialogDescription>
              Alla sidor och undermappar tas bort permanent.
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

function PageMenu({ page }: { page: Page }) {
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
            className="opacity-60 md:opacity-0 md:group-hover:opacity-100 p-1 hover:bg-ink/10 rounded"
          >
            <MoreHorizontal className="size-3.5" />
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onSelect={() => setRenaming(true)}>
            <Pencil className="size-3.5 mr-2" /> Byt namn
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setConfirmDel(true)} className="text-destructive">
            <Trash2 className="size-3.5 mr-2" /> Ta bort
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-serif italic text-2xl">Byt namn på sida</DialogTitle></DialogHeader>
          <input
            autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
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
            <AlertDialogDescription>Det går inte att ångra.</AlertDialogDescription>
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

function FloatingAdd({ activeFolderId }: { activeFolderId: string | null }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<null | "folder">(null);
  const [name, setName] = useState("");
  const [parentFolder, setParentFolder] = useState<string | null>(activeFolderId);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: lib } = useQuery({ queryKey: ["library"], queryFn: fetchLibrary });

  function openFolderDialog() {
    setName("");
    setParentFolder(activeFolderId);
    setDialog("folder");
    setMenuOpen(false);
  }

  const allFolders = useMemo(() => lib?.folders ?? [], [lib]);

  // New page: create an empty, untitled page in the current folder and jump
  // straight into it — no naming dialog, the cursor lands in the heading field.
  const pageMut = useMutation({
    mutationFn: () => createPage({ title: "", folder_id: activeFolderId }),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ["library"] });
      setMenuOpen(false);
      navigate({ to: "/app/page/$pageId", params: { pageId: p.id } });
    },
  });
  const folderMut = useMutation({
    mutationFn: () => createFolder({ name: name.trim() || "Ny mapp", parent_id: parentFolder }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["library"] });
      setDialog(null);
    },
  });

  return (
    <>
      <div className="absolute bottom-6 right-6 sm:bottom-8 sm:right-8 z-20">
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <button
              className="size-14 sm:size-12 rounded-full bg-ink text-paper shadow-2xl flex items-center justify-center hover:scale-105 transition-transform"
              aria-label="Lägg till"
            >
              <Plus className="size-6 sm:size-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" side="top" className="w-48 p-2">
            <button
              onClick={() => pageMut.mutate()}
              className="w-full text-left px-3 py-2 text-sm hover:bg-ink/5 rounded-md flex items-center justify-between"
            >
              Ny sida
            </button>
            <button
              onClick={openFolderDialog}
              className="w-full text-left px-3 py-2 text-sm hover:bg-ink/5 rounded-md flex items-center justify-between"
            >
              Ny mapp
            </button>
          </PopoverContent>
        </Popover>
      </div>

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif italic text-3xl">Ny mapp</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Namn</label>
              <input
                autoFocus value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Vecka 1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") folderMut.mutate();
                }}
                className="w-full bg-card border border-border rounded-md px-3 py-2.5 text-base sm:text-sm outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Plats</label>
              <select
                value={parentFolder ?? ""} onChange={(e) => setParentFolder(e.target.value || null)}
                className="w-full bg-card border border-border rounded-md px-3 py-2.5 text-base sm:text-sm outline-none focus:border-accent"
              >
                <option value="">Översta nivån</option>
                {allFolders.map((f) => (
                  <option key={f.id} value={f.id}>{folderPath(f, allFolders)}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setDialog(null)} className="px-3 py-2 text-sm">Avbryt</button>
            <button
              onClick={() => folderMut.mutate()}
              className="px-4 py-2 text-sm bg-ink text-paper rounded-md hover:opacity-90"
            >
              Skapa
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function folderPath(folder: Folder, all: Folder[]): string {
  const parts: string[] = [folder.name];
  let current = folder;
  while (current.parent_id) {
    const parent = all.find((f) => f.id === current.parent_id);
    if (!parent) break;
    parts.unshift(parent.name);
    current = parent;
  }
  return parts.join(" / ");
}
