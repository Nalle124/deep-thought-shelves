// Page covers. A cover value is either "preset:<id>" (a built-in gradient) or a
// full URL (an uploaded image). Presets let you give each page its own vibe
// without uploading anything — a small palette of moods from warm to cool to dark.
export const COVER_PRESETS: { id: string; label: string; css: string }[] = [
  { id: "red", label: "Röd", css: "linear-gradient(135deg, #b91c1c 0%, #f97316 100%)" },
  { id: "ember", label: "Glöd", css: "linear-gradient(135deg, #7c2d12 0%, #f59e0b 100%)" },
  { id: "dawn", label: "Gryning", css: "linear-gradient(135deg, #f59e0b 0%, #ec4899 55%, #8b5cf6 100%)" },
  { id: "rose", label: "Ros", css: "linear-gradient(135deg, #9f1239 0%, #fb7185 100%)" },
  { id: "dusk", label: "Skymning", css: "linear-gradient(135deg, #4c1d95 0%, #db2777 100%)" },
  { id: "lavender", label: "Lavendel", css: "linear-gradient(135deg, #6d28d9 0%, #c4b5fd 100%)" },
  { id: "sea", label: "Hav", css: "linear-gradient(135deg, #0e7490 0%, #15803d 100%)" },
  { id: "aurora", label: "Norrsken", css: "linear-gradient(135deg, #0f766e 0%, #6366f1 100%)" },
  { id: "night", label: "Natt", css: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)" },
  { id: "forest", label: "Skog", css: "linear-gradient(135deg, #14532d 0%, #4d7c0f 100%)" },
  { id: "sage", label: "Salvia", css: "linear-gradient(135deg, #4d7c5f 0%, #a7c4a0 100%)" },
  { id: "sand", label: "Sand", css: "linear-gradient(135deg, #a16207 0%, #ca8a04 100%)" },
  { id: "mocha", label: "Mocka", css: "linear-gradient(135deg, #3b2417 0%, #a67c52 100%)" },
  { id: "mist", label: "Dimma", css: "linear-gradient(135deg, #475569 0%, #94a3b8 100%)" },
  { id: "ink", label: "Bläck", css: "linear-gradient(135deg, #1f2937 0%, #4b5563 100%)" },
];

// A hand-picked set of calm, aesthetic photo covers (real Unsplash photography
// served via Lorem Picsum's stable, key-free CDN). Each is a mood — sea, forest,
// fog, fields, texture, mono — so a page can feel like a magazine spread.
export const COVER_PHOTOS: { id: string; label: string }[] = [
  { id: "12", label: "Klippstrand" },
  { id: "16", label: "Öppet hav" },
  { id: "28", label: "Skogsbäck" },
  { id: "44", label: "Dimrygg" },
  { id: "56", label: "Ljusspel" },
  { id: "80", label: "Kottar" },
  { id: "89", label: "Grönska" },
  { id: "98", label: "Sädesfält" },
  { id: "115", label: "Daggdroppar" },
  { id: "123", label: "Sten" },
  { id: "131", label: "Stillhet" },
  { id: "135", label: "Havsdis" },
  { id: "140", label: "Dis" },
  { id: "144", label: "Pir" },
  { id: "162", label: "Kustlinje" },
  { id: "166", label: "Bergsdal" },
  { id: "170", label: "Ekbacke" },
  { id: "186", label: "Dimskog" },
  { id: "194", label: "Brygga" },
  { id: "198", label: "Fjällsluttning" },
  { id: "202", label: "Skogsljus" },
];

// Picsum image URL for a photo cover at a given size.
export function photoUrl(id: string, w: number, h: number): string {
  return `https://picsum.photos/id/${id}/${w}/${h}`;
}

// A random photo cover (full-size URL), avoiding the current one.
export function randomPhotoCover(current?: string | null): string {
  const pool = COVER_PHOTOS.filter((p) => !current?.includes(`/id/${p.id}/`));
  const pick = pool[Math.floor(Math.random() * pool.length)] ?? COVER_PHOTOS[0];
  return photoUrl(pick.id, 1600, 600);
}

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

// A random preset cover, avoiding the current one so "Slumpa" always visibly changes.
export function randomCover(current?: string | null): string {
  const currentId = current?.startsWith("preset:") ? current.slice("preset:".length) : null;
  const pool = COVER_PRESETS.filter((p) => p.id !== currentId);
  const pick = pool[Math.floor(Math.random() * pool.length)] ?? COVER_PRESETS[0];
  return `preset:${pick.id}`;
}
