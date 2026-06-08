// Page covers. A cover value is either "preset:<id>" (a built-in gradient) or a
// full URL (an uploaded image). Presets let you add a splash of colour without
// uploading anything — starting with a red one.
export const COVER_PRESETS: { id: string; label: string; css: string }[] = [
  { id: "red", label: "Röd", css: "linear-gradient(135deg, #b91c1c 0%, #f97316 100%)" },
  { id: "dusk", label: "Skymning", css: "linear-gradient(135deg, #4c1d95 0%, #db2777 100%)" },
  { id: "sea", label: "Hav", css: "linear-gradient(135deg, #0e7490 0%, #15803d 100%)" },
  { id: "sand", label: "Sand", css: "linear-gradient(135deg, #a16207 0%, #ca8a04 100%)" },
  { id: "forest", label: "Skog", css: "linear-gradient(135deg, #14532d 0%, #4d7c0f 100%)" },
  { id: "ink", label: "Bläck", css: "linear-gradient(135deg, #1f2937 0%, #4b5563 100%)" },
];

// CSS `background` value for a cover, or null if none.
export function coverBackground(cover: string | null): string | null {
  if (!cover) return null;
  if (cover.startsWith("preset:")) {
    const id = cover.slice("preset:".length);
    return COVER_PRESETS.find((p) => p.id === id)?.css ?? null;
  }
  // An uploaded image URL.
  return `center / cover no-repeat url("${cover}")`;
}
