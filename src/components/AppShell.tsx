import { useState, useMemo, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchLibrary, createFolder, createPage, deleteFolder, deletePage,
  renameFolder, renamePage, type Folder, type Page,
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
import {
  ChevronRight, FileText, Folder as FolderIcon, MoreHorizontal, Plus,
  Sun, Moon, LogOut, Trash2, Pencil,
} from "lucide-react";

export function AppShell({ children }: { children: ReactNode }) {
  const { data: lib } = useQuery({ queryKey: ["library"], queryFn: fetchLibrary });
  const params = useParams({ strict: false }) as { pageId?: string };

  return (
    <div className="flex h-screen w-full bg-paper text-ink font-sans overflow-hidden">
      <Sidebar folders={lib?.folders ?? []} pages={lib?.pages ?? []} activePageId={params.pageId} />
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {children}
        <FloatingAdd activeFolderId={getActiveFolderId(lib?.pages ?? [], params.pageId)} />
      </main>
    </div>
  );
}

function getActiveFolderId(pages: Page[], pageId?: string): string | null {
  if (!pageId) return null;
  return pages.find((p) => p.id === pageId)?.folder_id ?? null;
}

function Sidebar({ folders, pages, activePageId }: {
  folders: Folder[]; pages: Page[]; activePageId?: string;
}) {
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const rootFolders = folders.filter((f) => f.parent_id === null);
  const rootPages = pages.filter((p) => p.folder_id === null);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <aside className="w-72 shrink-0 border-r border-border flex flex-col bg-paper">
      <div className="p-6 flex items-center justify-between">
        <Link to="/app" className="font-serif italic text-2xl tracking-tight">Anthology</Link>
        <button
          onClick={toggle}
          className="p-1.5 hover:bg-ink/5 rounded-md transition-colors"
          aria-label="Toggle theme"
        >
          {theme === "light" ? <Moon className="size-4 opacity-60" /> : <Sun className="size-4 opacity-60" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {rootFolders.map((f) => (
          <FolderNode key={f.id} folder={f} folders={folders} pages={pages} depth={0} activePageId={activePageId} />
        ))}
        {rootPages.map((p) => (
          <PageNode key={p.id} page={p} depth={0} active={p.id === activePageId} />
        ))}
        {rootFolders.length === 0 && rootPages.length === 0 && (
          <p className="px-3 py-8 text-xs text-muted-foreground italic">
            Empty library. Press <span className="font-medium">+</span> to begin.
          </p>
        )}
      </nav>

      <div className="p-4 border-t border-border flex items-center gap-3">
        <div className="size-8 rounded-full bg-accent/20 border border-accent/30" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">Your library</p>
          <p className="text-[10px] opacity-40 uppercase tracking-wider">Private</p>
        </div>
        <button onClick={signOut} className="p-1.5 hover:bg-ink/5 rounded-md" aria-label="Sign out">
          <LogOut className="size-3.5 opacity-60" />
        </button>
      </div>
    </aside>
  );
}

function FolderNode({ folder, folders, pages, depth, activePageId }: {
  folder: Folder; folders: Folder[]; pages: Page[]; depth: number; activePageId?: string;
}) {
  const [open, setOpen] = useState(true);
  const children = folders.filter((f) => f.parent_id === folder.id);
  const childPages = pages.filter((p) => p.folder_id === folder.id);

  return (
    <div>
      <Row depth={depth} onClick={() => setOpen(!open)}>
        <ChevronRight className={`size-3 opacity-40 transition-transform ${open ? "rotate-90" : ""}`} />
        <FolderIcon className="size-3.5 opacity-50" />
        <span className="truncate">{folder.name}</span>
        <FolderMenu folder={folder} />
      </Row>
      {open && (
        <div className="ml-3 border-l border-border/60 pl-1">
          {children.map((f) => (
            <FolderNode key={f.id} folder={f} folders={folders} pages={pages} depth={depth + 1} activePageId={activePageId} />
          ))}
          {childPages.map((p) => (
            <PageNode key={p.id} page={p} depth={depth + 1} active={p.id === activePageId} />
          ))}
        </div>
      )}
    </div>
  );
}

function PageNode({ page, depth, active }: { page: Page; depth: number; active: boolean }) {
  return (
    <Link
      to="/app/page/$pageId"
      params={{ pageId: page.id }}
      className={`group flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm transition-colors ${
        active ? "bg-accent/15 text-accent" : "opacity-60 hover:opacity-100 hover:bg-ink/5"
      }`}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
    >
      <FileText className="size-3.5 opacity-50 shrink-0" />
      <span className="truncate flex-1">{page.title || "Untitled"}</span>
      <PageMenu page={page} />
    </Link>
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

  const renameMut = useMutation({
    mutationFn: () => renameFolder(folder.id, name.trim() || folder.name),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["library"] }); setRenaming(false); },
  });
  const delMut = useMutation({
    mutationFn: () => deleteFolder(folder.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["library"] }); toast.success("Folder deleted"); },
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <span
            onClick={(e) => e.stopPropagation()}
            className="ml-auto opacity-0 group-hover:opacity-100 p-1 hover:bg-ink/10 rounded"
          >
            <MoreHorizontal className="size-3" />
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onSelect={() => setRenaming(true)}>
            <Pencil className="size-3.5 mr-2" /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setConfirmDel(true)} className="text-destructive">
            <Trash2 className="size-3.5 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-serif italic text-2xl">Rename folder</DialogTitle></DialogHeader>
          <input
            autoFocus value={name} onChange={(e) => setName(e.target.value)}
            className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <DialogFooter>
            <button onClick={() => setRenaming(false)} className="px-3 py-1.5 text-sm">Cancel</button>
            <button onClick={() => renameMut.mutate()} className="px-3 py-1.5 text-sm bg-ink text-paper rounded-md">Save</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDel} onOpenChange={setConfirmDel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif italic text-2xl">Delete this folder?</AlertDialogTitle>
            <AlertDialogDescription>
              All pages and subfolders inside will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => delMut.mutate()}>Delete</AlertDialogAction>
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
    mutationFn: () => renamePage(page.id, title.trim() || "Untitled"),
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
      toast.success("Page deleted");
      navigate({ to: "/app" });
    },
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <span
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-ink/10 rounded"
          >
            <MoreHorizontal className="size-3" />
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onSelect={() => setRenaming(true)}>
            <Pencil className="size-3.5 mr-2" /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setConfirmDel(true)} className="text-destructive">
            <Trash2 className="size-3.5 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-serif italic text-2xl">Rename page</DialogTitle></DialogHeader>
          <input
            autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <DialogFooter>
            <button onClick={() => setRenaming(false)} className="px-3 py-1.5 text-sm">Cancel</button>
            <button onClick={() => renameMut.mutate()} className="px-3 py-1.5 text-sm bg-ink text-paper rounded-md">Save</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDel} onOpenChange={setConfirmDel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif italic text-2xl">Delete this page?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => delMut.mutate()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function FloatingAdd({ activeFolderId }: { activeFolderId: string | null }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<null | "page" | "folder">(null);
  const [name, setName] = useState("");
  const [parentFolder, setParentFolder] = useState<string | null>(activeFolderId);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: lib } = useQuery({ queryKey: ["library"], queryFn: fetchLibrary });

  function openDialog(kind: "page" | "folder") {
    setName("");
    setParentFolder(activeFolderId);
    setDialog(kind);
    setMenuOpen(false);
  }

  const allFolders = useMemo(() => lib?.folders ?? [], [lib]);

  const pageMut = useMutation({
    mutationFn: () => createPage({ title: name.trim() || "Untitled", folder_id: parentFolder }),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ["library"] });
      setDialog(null);
      navigate({ to: "/app/page/$pageId", params: { pageId: p.id } });
    },
  });
  const folderMut = useMutation({
    mutationFn: () => createFolder({ name: name.trim() || "New folder", parent_id: parentFolder }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["library"] });
      setDialog(null);
    },
  });

  return (
    <>
      <div className="absolute bottom-8 right-8 z-20">
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <button
              className="size-12 rounded-full bg-ink text-paper shadow-2xl flex items-center justify-center hover:scale-105 transition-transform"
              aria-label="Add new"
            >
              <Plus className="size-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" side="top" className="w-48 p-2">
            <button
              onClick={() => openDialog("page")}
              className="w-full text-left px-3 py-2 text-sm hover:bg-ink/5 rounded-md flex items-center justify-between"
            >
              New page
            </button>
            <button
              onClick={() => openDialog("folder")}
              className="w-full text-left px-3 py-2 text-sm hover:bg-ink/5 rounded-md flex items-center justify-between"
            >
              New folder
            </button>
          </PopoverContent>
        </Popover>
      </div>

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif italic text-3xl">
              {dialog === "page" ? "New page" : "New folder"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Name</label>
              <input
                autoFocus value={name} onChange={(e) => setName(e.target.value)}
                placeholder={dialog === "page" ? "June 8" : "2026"}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    dialog === "page" ? pageMut.mutate() : folderMut.mutate();
                  }
                }}
                className="w-full bg-card border border-border rounded-md px-3 py-2.5 text-sm outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Location</label>
              <select
                value={parentFolder ?? ""} onChange={(e) => setParentFolder(e.target.value || null)}
                className="w-full bg-card border border-border rounded-md px-3 py-2.5 text-sm outline-none focus:border-accent"
              >
                <option value="">Top level</option>
                {allFolders.map((f) => (
                  <option key={f.id} value={f.id}>{folderPath(f, allFolders)}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setDialog(null)} className="px-3 py-2 text-sm">Cancel</button>
            <button
              onClick={() => dialog === "page" ? pageMut.mutate() : folderMut.mutate()}
              className="px-4 py-2 text-sm bg-ink text-paper rounded-md hover:opacity-90"
            >
              Create
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
