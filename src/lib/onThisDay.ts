// "På denna dag" — a historical event for today's date, pulled from Wikipedia's
// free REST feed (Swedish, no API key). Curated "selected" highlights, so the
// quality is high and it's lighter on politics than the raw events list.
// Picked deterministically by the day so it's stable through the day, fresh daily.

export type HistEvent = {
  year: number;
  text: string;
  url?: string; // Wikipedia article — the "fördjupa dig" link
  thumb?: string;
};

// The events ordered best-first, plus how many of the leading items are "clean"
// (non-political, ideally people/art/science). The home rotates the day's main
// highlight only within `mainCount`, so heavy items never headline the card —
// they still appear lower down under "Fler händelser".
export type OnThisDay = { events: HistEvent[]; mainCount: number };

// Drop politics / war / nation-geopolitics — the user likes history about
// people, art and culture, not parties, elections, wars or statecraft. Soft
// filter: only applied if enough events remain, so the card is never empty.
const EXCLUDE =
  /(\bpresident|\bstatsminister|\bpremiärminister|\bförbundskansler|\bregering|\briksdag|\bparlament|\bsenat|\bkongress|\bguvernör|\bparti(?:et|er|s)?\b|\bval\b|\bvalet\b|\bvalen\b|\bvaldes\b|\bomval|europaparlament|\bröstade|\brösterna|\bkandidat|krig|\bmilitär|\barmé|\btrupp|\bsoldat|\binvasion|\bockup|\bfördrag|\btraktat|\ballians|\bkoloni|\bsjälvständ|\bnationaldag|\bimperium|\bstatskupp|\bkupp\b|\bdiktator|\bnazist|\butrensning|\bpolitisk|\bfredsavtal|\bvapenvila|\bbelägring|\buppror|\bslaget\b|raket|\bbomb|\battack|\bstupa|\bsänk(?:s|te|t)\b|\bskjuts ner)/i;

// Prefer the fun stuff: people (births/deaths), art, music, film, literature,
// science, discovery, sport, records, openings/launches. These get ranked
// first so the day's main highlight leans toward people/culture/random.
const INTEREST =
  /(\bföd|\bavled|\bavlider|\bdog\b|\bkonstnär|\bmålning|\bmålare|\btavla|\bskulptur|\bkompositör|\bmusik|\bsymfoni|\bopera|\bförfattare|\broman\b|\bpoet|\bdiktare|\bfilm|\bregissör|\bskådespelare|\buppfann|\buppfinn|\bupptäck|\bpatent|\bpremiär|\bpublicer|\bpresenter|\blanser|\binvig|\buruppför|\balbum|\bgrundade|\bteori|\bvetenskap|\bastronom|\bplanet|\bteleskop|\bnobelpris|\brekord|\bolympisk|\bmästare|\bmästerskap|\bexpedition|\bbestiger|\bsjösätt|\bdebut)/i;

function interestScore(e: HistEvent): number {
  return INTEREST.test(e.text) ? 1 : 0;
}

export async function fetchOnThisDay(d = new Date()): Promise<OnThisDay> {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const res = await fetch(
    `https://sv.wikipedia.org/api/rest_v1/feed/onthisday/selected/${mm}/${dd}`,
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`onthisday ${res.status}`);
  const data = (await res.json()) as { selected?: unknown[] };

  const mapped: HistEvent[] = (data.selected ?? [])
    .map((raw) => {
      const it = raw as {
        year?: number;
        text?: string;
        pages?: { content_urls?: { desktop?: { page?: string } }; thumbnail?: { source?: string } }[];
      };
      const page = it.pages?.[0];
      return {
        year: it.year ?? NaN,
        text: it.text ?? "",
        url: page?.content_urls?.desktop?.page,
        thumb: page?.thumbnail?.source,
      };
    })
    .filter((e) => e.text && Number.isFinite(e.year));

  // Split into clean vs. heavy (politics/war/geopolitics). Within the clean set,
  // rank people/art/science first. Heavy items go last, so the headline is
  // always clean when any clean item exists — but nothing is thrown away.
  const sortByInterest = (list: HistEvent[]) =>
    list
      .map((e, i) => ({ e, i, s: interestScore(e) }))
      .sort((a, b) => b.s - a.s || a.i - b.i)
      .map((x) => x.e);

  const clean = sortByInterest(mapped.filter((e) => !EXCLUDE.test(e.text)));
  const heavy = mapped.filter((e) => EXCLUDE.test(e.text));
  const events = clean.length ? [...clean, ...heavy] : sortByInterest(mapped);
  // Rotate the daily headline among up to 3 leading clean items (≥1).
  const mainCount = Math.min(clean.length || Math.min(events.length, 1), 3) || 1;
  return { events, mainCount };
}
