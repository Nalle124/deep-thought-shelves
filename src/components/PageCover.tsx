import { useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  COVER_PRESETS, COVER_PHOTOS, coverBackground, randomCover, randomPhotoCover, photoUrl,
} from "@/lib/covers";
import { uploadMedia } from "@/lib/storage";
import { ImagePlus, Upload, Loader2, Shuffle } from "lucide-react";

function CoverMenu({
  onPick,
  current,
  children,
}: {
  onPick: (cover: string) => void;
  current?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const url = await uploadMedia(file);
      onPick(url);
      setOpen(false);
    } catch (e) {
      console.error("Cover upload failed", e);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-3 space-y-3">
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Färg</p>
            <button
              type="button"
              onClick={() => { onPick(randomCover(current)); setOpen(false); }}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-ink transition"
              title="Slumpa en vibe"
            >
              <Shuffle className="size-3" /> Slumpa
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {COVER_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                title={p.label}
                onClick={() => { onPick(`preset:${p.id}`); setOpen(false); }}
                className="h-10 rounded-md border border-border hover:ring-2 hover:ring-accent/40 transition"
                style={{ background: p.css }}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Foto</p>
            <button
              type="button"
              onClick={() => { onPick(randomPhotoCover(current)); setOpen(false); }}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-ink transition"
              title="Slumpa ett foto"
            >
              <Shuffle className="size-3" /> Slumpa foto
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 max-h-44 overflow-y-auto pr-0.5">
            {COVER_PHOTOS.map((p) => (
              <button
                key={p.id}
                type="button"
                title={p.label}
                onClick={() => { onPick(photoUrl(p.id, 1600, 600)); setOpen(false); }}
                className="h-12 rounded-md border border-border bg-cover bg-center hover:ring-2 hover:ring-accent/40 transition"
                style={{ backgroundImage: `url("${photoUrl(p.id, 240, 140)}")` }}
              />
            ))}
          </div>
        </div>
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm rounded-md bg-ink/5 hover:bg-ink/10 transition-colors disabled:opacity-60"
        >
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {uploading ? "Laddar upp…" : "Ladda upp bild"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
        />
      </PopoverContent>
    </Popover>
  );
}

export function AddCoverButton({ onChange }: { onChange: (cover: string | null) => void }) {
  return (
    <CoverMenu onPick={onChange}>
      <button
        type="button"
        className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm text-muted-foreground/70 hover:text-ink hover:bg-ink/5 transition-colors"
      >
        <ImagePlus className="size-4" /> Lägg till omslag
      </button>
    </CoverMenu>
  );
}

export function CoverBanner({
  cover,
  onChange,
}: {
  cover: string;
  onChange: (cover: string | null) => void;
}) {
  const bg = coverBackground(cover);
  return (
    <div
      className="group/cover relative h-40 sm:h-56 w-full"
      style={bg ? { background: bg } : undefined}
    >
      <div className="absolute bottom-3 right-4 flex gap-2 opacity-0 group-hover/cover:opacity-100 transition-opacity">
        <CoverMenu onPick={onChange} current={cover}>
          <button className="px-2.5 py-1.5 text-xs rounded-md bg-paper/85 backdrop-blur hover:bg-paper text-ink shadow-sm">
            Byt omslag
          </button>
        </CoverMenu>
        <button
          onClick={() => onChange(null)}
          className="px-2.5 py-1.5 text-xs rounded-md bg-paper/85 backdrop-blur hover:bg-paper text-ink shadow-sm"
        >
          Ta bort
        </button>
      </div>
    </div>
  );
}
