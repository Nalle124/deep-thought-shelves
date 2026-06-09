import { resolveAmbient, type AmbientChoice } from "@/lib/ambient";

// Full-bleed animated ambient + a paper scrim so the foreground text stays
// readable. Meant to sit behind the home content (pinned while scrolling).
export function AmbientBackground({ choice }: { choice: AmbientChoice }) {
  const id = resolveAmbient(choice);
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div key={id} className={`ambient ambient-${id} absolute inset-0`} />
      <div className="absolute inset-0 bg-gradient-to-b from-paper/65 via-paper/50 to-paper/85" />
    </div>
  );
}
