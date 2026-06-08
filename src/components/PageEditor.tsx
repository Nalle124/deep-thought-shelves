import { useEffect, useRef, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPage, fetchLibrary, updatePage, type Folder } from "@/lib/library";

export function PageEditor({ pageId }: { pageId: string }) {
  const qc = useQueryClient();
  const { data: page, isLoading } = useQuery({
    queryKey: ["page", pageId],
    queryFn: () => fetchPage(pageId),
  });
  const { data: lib } = useQuery({ queryKey: ["library"], queryFn: fetchLibrary });

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const initRef = useRef<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (page && initRef.current !== page.id) {
      setTitle(page.title);
      setBody(page.body);
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

  // debounce auto-save
  const saveTimer = useRef<number | null>(null);
  function scheduleSave(patch: { title?: string; body?: string }) {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => saveMut.mutate(patch), 600);
  }

  const breadcrumb = useMemo(() => buildBreadcrumb(page?.folder_id ?? null, lib?.folders ?? []), [page, lib]);

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
          <input
            ref={titleRef}
            type="text"
            value={title}
            placeholder="Namnlös"
            onChange={(e) => {
              setTitle(e.target.value);
              scheduleSave({ title: e.target.value });
            }}
            className="w-full bg-transparent font-serif text-4xl sm:text-5xl italic tracking-tight outline-none mb-8 sm:mb-10 placeholder:opacity-20"
          />
          <MarkdownEditor
            value={body}
            onChange={(v) => {
              setBody(v);
              scheduleSave({ body: v });
            }}
          />
        </article>
      </div>
    </>
  );
}

function buildBreadcrumb(folderId: string | null, folders: Folder[]): string {
  if (!folderId) return "";
  const parts: string[] = [];
  let id: string | null = folderId;
  while (id) {
    const f: Folder | undefined = folders.find((x) => x.id === id);
    if (!f) break;
    parts.unshift(f.name);
    id = f.parent_id;
  }
  return parts.join(" / ");
}

/* ---------- Markdown editor: plain textarea + live rendered preview side by side?
   No — single-surface editor. We use a textarea overlaid with a "rendered" layer
   would over-complicate. Instead: textarea on top while focused; rendered view
   when blurred. Simpler & matches a writerly feel. ---------- */

function MarkdownEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  // auto-resize
  useEffect(() => {
    const ta = textRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }, [value, editing]);

  if (editing || !value.trim()) {
    return (
      <textarea
        ref={textRef}
        autoFocus={editing}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        placeholder={"Börja skriva…\n\nProva: # rubrik, - punkt, [ ] att göra, --- avdelare"}
        className="w-full bg-transparent outline-none resize-none text-lg leading-relaxed text-ink/85 placeholder:opacity-30 font-sans min-h-[60vh]"
      />
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className="w-full text-lg leading-relaxed text-ink/85 min-h-[60vh] cursor-text"
    >
      <RenderedMarkdown source={value} onToggleCheckbox={(idx) => {
        const lines = value.split("\n");
        const line = lines[idx];
        if (line.match(/^\s*\[x\]\s/i)) lines[idx] = line.replace(/\[x\]/i, "[ ]");
        else if (line.match(/^\s*\[\s\]\s/)) lines[idx] = line.replace(/\[\s\]/, "[x]");
        onChange(lines.join("\n"));
      }} />
    </div>
  );
}

function RenderedMarkdown({ source, onToggleCheckbox }: {
  source: string; onToggleCheckbox: (lineIdx: number) => void;
}) {
  const lines = source.split("\n");
  const out: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "---") {
      out.push(<hr key={i} className="border-none h-px bg-border my-10" />);
      i++; continue;
    }

    let m;
    if ((m = line.match(/^###\s+(.*)$/))) {
      out.push(<h3 key={i} className="font-serif italic text-xl mt-8 mb-3 text-ink">{m[1]}</h3>);
      i++; continue;
    }
    if ((m = line.match(/^##\s+(.*)$/))) {
      out.push(<h2 key={i} className="font-serif italic text-2xl mt-10 mb-4 text-ink">{m[1]}</h2>);
      i++; continue;
    }
    if ((m = line.match(/^#\s+(.*)$/))) {
      out.push(<h1 key={i} className="font-serif italic text-4xl mt-12 mb-5 text-ink">{m[1]}</h1>);
      i++; continue;
    }

    // checkbox block
    if (line.match(/^\s*\[(x|\s)\]\s/i)) {
      const items: { idx: number; checked: boolean; text: string }[] = [];
      while (i < lines.length && lines[i].match(/^\s*\[(x|\s)\]\s/i)) {
        const lm = lines[i].match(/^\s*\[(x|\s)\]\s(.*)$/i)!;
        items.push({ idx: i, checked: lm[1].toLowerCase() === "x", text: lm[2] });
        i++;
      }
      out.push(
        <div key={`cb-${items[0].idx}`} className="space-y-2 my-4">
          {items.map((it) => (
            <div key={it.idx} className="flex items-center gap-3">
              <button
                onClick={(e) => { e.stopPropagation(); onToggleCheckbox(it.idx); }}
                className={`size-5 border border-ink/40 rounded flex items-center justify-center bg-card shrink-0 ${
                  it.checked ? "bg-accent border-accent" : ""
                }`}
                aria-label="toggle"
              >
                {it.checked && <span className="text-[10px] text-accent-foreground">✓</span>}
              </button>
              <span className={it.checked ? "text-ink/40 line-through" : ""}>{it.text}</span>
            </div>
          ))}
        </div>
      );
      continue;
    }

    // bullet list
    if (line.match(/^\s*-\s+/)) {
      const items: { idx: number; text: string }[] = [];
      while (i < lines.length && lines[i].match(/^\s*-\s+/)) {
        items.push({ idx: i, text: lines[i].replace(/^\s*-\s+/, "") });
        i++;
      }
      out.push(
        <ul key={`ul-${items[0].idx}`} className="space-y-2 my-4">
          {items.map((it) => (
            <li key={it.idx} className="flex gap-4">
              <span className="opacity-30">—</span>
              <span>{it.text}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // ordered list
    if (line.match(/^\s*\d+\.\s+/)) {
      const items: { idx: number; text: string }[] = [];
      while (i < lines.length && lines[i].match(/^\s*\d+\.\s+/)) {
        items.push({ idx: i, text: lines[i].replace(/^\s*\d+\.\s+/, "") });
        i++;
      }
      out.push(
        <ol key={`ol-${items[0].idx}`} className="space-y-2 my-4">
          {items.map((it, n) => (
            <li key={it.idx} className="flex gap-4">
              <span className="opacity-40 font-mono text-sm tabular-nums">{n + 1}.</span>
              <span>{it.text}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    if (trimmed === "") {
      out.push(<div key={i} className="h-4" />);
      i++; continue;
    }

    out.push(<p key={i} className="my-3">{line}</p>);
    i++;
  }

  return <>{out}</>;
}
