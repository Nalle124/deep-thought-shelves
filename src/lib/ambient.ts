// Calming ambient backgrounds for the home screen. Lightweight CSS animations
// (no video, works offline). One can be picked manually or follow the time of day.
export type AmbientId = "brasa" | "vatten" | "aurora" | "gryning";

export const AMBIENTS: { id: AmbientId; label: string }[] = [
  { id: "brasa", label: "Brasa" },
  { id: "vatten", label: "Stilla vatten" },
  { id: "aurora", label: "Aurora" },
  { id: "gryning", label: "Gryning" },
];

export type AmbientChoice = "auto" | AmbientId;

// Time-of-day mapping for "auto".
export function ambientForTime(d = new Date()): AmbientId {
  const h = d.getHours();
  if (h >= 21 || h < 5) return "brasa"; // night → fire
  if (h < 9) return "gryning"; // early morning → dawn
  if (h < 17) return "vatten"; // day → water
  return "aurora"; // evening → aurora
}

export function resolveAmbient(choice: AmbientChoice): AmbientId {
  return choice === "auto" ? ambientForTime() : choice;
}

const KEY = "arkiv:ambient";

export function loadAmbientChoice(): AmbientChoice {
  if (typeof localStorage === "undefined") return "auto";
  const v = localStorage.getItem(KEY);
  if (v === "auto" || v === "brasa" || v === "vatten" || v === "aurora" || v === "gryning") return v;
  return "auto";
}

export function saveAmbientChoice(choice: AmbientChoice) {
  try {
    localStorage.setItem(KEY, choice);
  } catch {
    /* ignore */
  }
}
