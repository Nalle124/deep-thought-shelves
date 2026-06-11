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

// Drop the most overtly party-political / election items — the user likes
// history, not politics. Soft filter: only applied if enough non-political
// events remain, so we never end up with an empty card.
const POLITICS =
  /\b(president|statsminister|regering(?:en|s)?|riksdag|parti(?:et|er)?|valdes|omval|kandidat|senat|kongress|premiärminister|förbundskansler|guvernör)\b/i;

export async function fetchOnThisDay(d = new Date()): Promise<HistEvent[]> {
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

  const apolitical = mapped.filter((e) => !POLITICS.test(e.text));
  return apolitical.length >= 3 ? apolitical : mapped;
}
