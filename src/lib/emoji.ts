// Native unicode emoji — these render as Apple's own glyphs on macOS/iOS.
// Grouped so the picker is browsable; flattened for the "random omen" roll.
// The point isn't a curated set — it's a wide pool so a random pick can surprise
// you, like a small sign each time you mark a page.
//
// Listed as explicit array elements (NOT str.split) so multi-codepoint glyphs
// like ❄️ / 🏔️ / 🕊️ are preserved.

export const EMOJI_GROUPS: { name: string; emojis: string[] }[] = [
  {
    name: "Tecken",
    emojis: [
      "✨", "🌟", "⭐", "💫", "🔥", "⚡", "🌈", "☀️", "🌙", "🌑", "🌒", "🌓",
      "🌔", "🌕", "🌖", "🌗", "🌘", "🪐", "🌠", "☄️", "🌍", "🌊", "💧", "❄️",
    ],
  },
  {
    name: "Natur",
    emojis: [
      "🍀", "🌿", "🌱", "🌾", "🌻", "🌸", "🌼", "🌷", "🌹", "🪷", "🍃", "🌳",
      "🌲", "🌴", "🪵", "🍄", "🌵", "🪴", "🍂", "🍁",
    ],
  },
  {
    name: "Känslor",
    emojis: [
      "🙂", "😌", "😊", "😍", "🥰", "😎", "🤔", "🧐", "😇", "🥹", "😴", "🤍",
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🤎", "🖤", "💭", "🙏", "👁️", "🧠",
    ],
  },
  {
    name: "Djur",
    emojis: [
      "🦊", "🐺", "🐻", "🐼", "🐨", "🦁", "🐯", "🦌", "🐱", "🐶", "🦉", "🕊️",
      "🦅", "🦢", "🦋", "🐝", "🐌", "🐚", "🪶", "🐢", "🐉", "🐳", "🐬", "🦔",
    ],
  },
  {
    name: "Saker",
    emojis: [
      "📔", "📕", "📗", "📘", "📙", "📓", "📒", "📚", "📖", "✏️", "🖊️", "🖋️",
      "🪶", "📜", "🗝️", "🔑", "🕯️", "🔮", "🧭", "⏳", "⌛", "🪞", "🖼️", "📷",
    ],
  },
  {
    name: "Resa",
    emojis: [
      "🏔️", "⛰️", "🌋", "🏕️", "🏝️", "🏜️", "🛶", "⛵", "🗺️", "🧳", "🎒", "⛩️",
      "🏛️", "🏰", "🗿", "🌉", "🌁", "🚂", "🎡", "🎠",
    ],
  },
  {
    name: "Mat & dryck",
    emojis: [
      "☕", "🍵", "🍶", "🍷", "🥂", "🍓", "🍑", "🍒", "🍇", "🍊", "🍋", "🍎",
      "🍏", "🫐", "🥝", "🍯", "🥐", "🍞", "🧀", "🍫", "🍪", "🥥", "🌰", "🫖",
    ],
  },
  {
    name: "Symboler",
    emojis: [
      "♻️", "♾️", "☯️", "☮️", "⚜️", "🔱", "⚖️", "🧿", "🕉️", "✝️", "☪️", "🔆",
      "✦", "✧", "❖", "◆", "◇", "○", "●", "⟡", "❀", "✺",
    ],
  },
];

export const ALL_EMOJI: string[] = Array.from(
  new Set(EMOJI_GROUPS.flatMap((g) => g.emojis)),
);

export function randomEmoji(exclude?: string | null): string {
  if (ALL_EMOJI.length === 0) return "✦";
  let pick = ALL_EMOJI[Math.floor(Math.random() * ALL_EMOJI.length)];
  // Avoid handing back the same glyph twice in a row when re-rolling.
  if (exclude && ALL_EMOJI.length > 1) {
    let guard = 0;
    while (pick === exclude && guard++ < 8) {
      pick = ALL_EMOJI[Math.floor(Math.random() * ALL_EMOJI.length)];
    }
  }
  return pick;
}
