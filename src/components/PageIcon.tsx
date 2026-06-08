import { useState, type MouseEvent } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EMOJI_GROUPS, randomEmoji } from "@/lib/emoji";
import { Dices, Smile } from "lucide-react";

type Size = "sm" | "lg";

/**
 * Inline page icon. Clicking always opens an anchored picker (not a modal) where
 * you can choose any of Apple's native emoji, roll a random one (🎲, just one
 * option among the rest), or remove it.
 */
export function PageIcon({
  icon,
  onChange,
  size = "sm",
}: {
  icon: string | null;
  onChange: (icon: string | null) => void;
  size?: Size;
}) {
  const [open, setOpen] = useState(false);
  const stop = (e: MouseEvent) => e.stopPropagation();

  const trigger = icon ? (
    <button
      type="button"
      onClick={stop}
      aria-label="Byt ikon"
      className={
        size === "lg"
          ? "size-16 rounded-xl hover:bg-ink/5 flex items-center justify-center text-5xl leading-none transition-colors"
          : "size-5 flex items-center justify-center text-sm leading-none shrink-0 hover:scale-110 transition-transform"
      }
    >
      <span aria-hidden>{icon}</span>
    </button>
  ) : (
    <button
      type="button"
      onClick={stop}
      aria-label="Lägg till ikon"
      className={
        size === "lg"
          ? "group/icon inline-flex items-center gap-2 px-2.5 py-1.5 -ml-1 rounded-md text-sm text-muted-foreground/70 hover:text-ink hover:bg-ink/5 transition-colors"
          : "size-5 rounded text-muted-foreground/40 hover:text-ink hover:bg-ink/5 flex items-center justify-center shrink-0 transition-colors"
      }
    >
      <Smile className={size === "lg" ? "size-4" : "size-3.5"} />
      {size === "lg" && <span>Lägg till ikon</span>}
    </button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="start"
        side={size === "lg" ? "bottom" : "right"}
        className="w-72 p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 p-2 border-b border-border">
          <button
            type="button"
            onClick={() => onChange(randomEmoji(icon))}
            className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium rounded-md bg-ink/5 hover:bg-ink/10 transition-colors"
            title="Slumpa en emoji"
          >
            <Dices className="size-3.5" /> Slumpa
          </button>
          {icon && (
            <button
              type="button"
              onClick={() => { onChange(null); setOpen(false); }}
              className="px-2.5 py-1.5 text-xs text-muted-foreground hover:text-ink transition-colors"
            >
              Ta bort
            </button>
          )}
        </div>
        <div className="max-h-64 overflow-y-auto p-2 space-y-3">
          {EMOJI_GROUPS.map((group) => (
            <div key={group.name}>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground px-1 mb-1.5">
                {group.name}
              </p>
              <div className="grid grid-cols-8 gap-0.5">
                {group.emojis.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => { onChange(e); setOpen(false); }}
                    className={`aspect-square text-lg rounded hover:bg-ink/10 transition-colors ${
                      icon === e ? "bg-accent/20" : ""
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
