import { resolveAmbient, type AmbientChoice } from "@/lib/ambient";

// Full-bleed animated ambient + a paper scrim so the foreground text stays
// readable. Meant to sit behind the home content (pinned while scrolling).
export function AmbientBackground({ choice }: { choice: AmbientChoice }) {
  const id = resolveAmbient(choice);
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div key={id} className={`ambient ambient-${id} absolute inset-0`} />
      {/* Theme-aware scrim: calmer/more muted in light mode, lighter in dark mode
          so the motion reads clearly. Slightly stronger at top/bottom for text. */}
      <div className="absolute inset-0 bg-gradient-to-b from-paper/80 via-paper/60 to-paper/80 dark:from-paper/65 dark:via-paper/30 dark:to-paper/55" />
    </div>
  );
}
