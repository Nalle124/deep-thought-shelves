import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchLibrary } from "@/lib/library";
import { FileText, Folder as FolderIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/")({
  component: Overview,
});

function Overview() {
  const { data: lib } = useQuery({ queryKey: ["library"], queryFn: fetchLibrary });
  const folders = lib?.folders ?? [];
  const pages = lib?.pages ?? [];
  const recent = [...pages]
    .sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at))
    .slice(0, 6);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 sm:px-10 py-12 sm:py-20">
        <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground mb-3">Library</p>
        <h1 className="font-serif italic text-4xl sm:text-6xl tracking-tight">Welcome back.</h1>
        <p className="mt-4 text-muted-foreground text-sm sm:text-base max-w-md">
          A quiet place for your thinking. {pages.length} note{pages.length === 1 ? "" : "s"} across {folders.length} folder{folders.length === 1 ? "" : "s"}.
        </p>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-10">
          <Stat label="Notes" value={pages.length} icon={<FileText className="size-4 opacity-40" />} />
          <Stat label="Folders" value={folders.length} icon={<FolderIcon className="size-4 opacity-40" />} />
        </div>

        <section className="mt-12">
          <h2 className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground mb-4">Recent</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Nothing yet. Press <span className="text-ink font-medium">+</span> to begin.
            </p>
          ) : (
            <ul className="divide-y divide-border border-t border-b border-border">
              {recent.map((p) => {
                const f = folders.find((x) => x.id === p.folder_id);
                return (
                  <li key={p.id}>
                    <Link
                      to="/app/page/$pageId"
                      params={{ pageId: p.id }}
                      className="flex items-center justify-between gap-4 py-3 sm:py-4 hover:opacity-70 transition-opacity"
                    >
                      <div className="min-w-0">
                        <p className="font-serif italic text-lg sm:text-xl truncate">{p.title || "Untitled"}</p>
                        {f && (
                          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mt-1 truncate">
                            {f.icon ? `${f.icon}  ` : ""}{f.name}
                          </p>
                        )}
                      </div>
                      <span className="text-[11px] uppercase tracking-widest text-muted-foreground shrink-0">
                        {timeAgo(p.updated_at)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="border border-border rounded-lg p-4 sm:p-5 bg-card">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}</p>
        {icon}
      </div>
      <p className="font-serif italic text-3xl sm:text-4xl mt-2">{value}</p>
    </div>
  );
}

function timeAgo(iso: string): string {
  const d = (Date.now() - +new Date(iso)) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  if (d < 86400 * 7) return `${Math.floor(d / 86400)}d`;
  return new Date(iso).toLocaleDateString();
}
