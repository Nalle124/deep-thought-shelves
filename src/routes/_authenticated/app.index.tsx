import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchLibrary, type Page } from "@/lib/library";
import {
  isoWeekKey, weekDates, WEEK_DAYS, dayKey, type Goal,
} from "@/lib/userState";
import { useUserState } from "@/lib/useUserState";
import { AmbientBackground } from "@/components/AmbientBackground";
import {
  AMBIENTS, loadAmbientChoice, saveAmbientChoice, type AmbientChoice,
} from "@/lib/ambient";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { fetchSearchIndex, searchDocs, exportArchive } from "@/lib/search";
import { dailyCuriosity, type Curiosity } from "@/lib/curiosities";
import { fetchWeather } from "@/lib/weather";
import { fetchOnThisDay } from "@/lib/onThisDay";
import {
  ChevronRight, FileText, Sparkles, Plus, X, Check, SlidersHorizontal, Search, Download,
  ScrollText, ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/")({
  component: Overview,
});

const GREETINGS = [
  "Välkommen tillbaka.", "En ny dag att minnas.", "Vad bär du med dig idag?",
  "Låt tankarna landa.", "En tom sida väntar.", "Var god dröj vid tanken.",
  "Skriv ner det innan det glöms.", "Tystnaden är din.", "Vad vill du bevara idag?",
  "Börja där du står.", "Ny dag, nya rader.", "Här vilar dina ord.",
  "Lugnt och stilla.", "Något att lägga till arkivet?", "Dagen är fortfarande oskriven.",
];
const greetingForToday = () => GREETINGS[Math.floor(Date.now() / 86_400_000) % GREETINGS.length];

// localStorage for which sections are shown (a light "customize").
type Sections = { week: boolean; goals: boolean; onThisDay: boolean; coffee: boolean };
const SECTIONS_KEY = "arkiv:home-sections";
const DEFAULT_SECTIONS: Sections = { week: true, goals: true, onThisDay: true, coffee: false };
function loadSections(): Sections {
  try {
    return { ...DEFAULT_SECTIONS, ...(JSON.parse(localStorage.getItem(SECTIONS_KEY) || "{}")) };
  } catch {
    return DEFAULT_SECTIONS;
  }
}

function Overview() {
  const { data: lib } = useQuery({ queryKey: ["library"], queryFn: fetchLibrary });
  const pages = lib?.pages ?? [];
  const recent = useMemo(
    () => [...pages].sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at)).slice(0, 6),
    [pages],
  );

  const { data: weather } = useQuery({
    queryKey: ["weather"],
    queryFn: fetchWeather,
    staleTime: 30 * 60_000,
    retry: false,
  });
  const curiosity = useMemo(() => dailyCuriosity(), []);

  const [ambient, setAmbient] = useState<AmbientChoice>("auto");
  const [sections, setSections] = useState<Sections>(DEFAULT_SECTIONS);
  useEffect(() => {
    setAmbient(loadAmbientChoice());
    setSections(loadSections());
  }, []);

  function pickAmbient(c: AmbientChoice) { setAmbient(c); saveAmbientChoice(c); }
  function toggleSection(k: keyof Sections) {
    setSections((s) => {
      const next = { ...s, [k]: !s[k] };
      try { localStorage.setItem(SECTIONS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  return (
    <div className="flex-1 overflow-y-auto relative">
      <div className="sticky top-0 h-[100dvh] -mb-[100dvh] pointer-events-none">
        <AmbientBackground choice={ambient} />
      </div>

      <div className="relative max-w-3xl mx-auto px-6 sm:px-10 py-12 sm:py-16">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground mb-3">
              {new Date().toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long" })}
              {" · Vecka "}{isoWeekKey().split("-W")[1]}
              {weather && <span className="normal-case tracking-normal"> · {weather.emoji} {weather.temp}°</span>}
            </p>
            <h1 className="font-serif italic text-4xl sm:text-6xl tracking-tight">{greetingForToday()}</h1>
            <p className="mt-4 text-muted-foreground text-sm sm:text-base">
              En stilla plats för dina tankar. {pages.length} sid{pages.length === 1 ? "a" : "or"} i arkivet.
            </p>
          </div>
          <HomeMenu ambient={ambient} onPickAmbient={pickAmbient} sections={sections} onToggle={toggleSection} />
        </div>

        <SearchBox />
        <CuriosityCard curiosity={curiosity} />
        {sections.onThisDay && <OnThisDay />}
        {sections.coffee && <CoffeeCup />}
        <RecentCards recent={recent} pages={pages} />

        {sections.week && <WeeklySchedule />}
        {sections.goals && <TrainingGoals />}
      </div>
    </div>
  );
}

function HomeMenu({
  ambient, onPickAmbient, sections, onToggle,
}: {
  ambient: AmbientChoice;
  onPickAmbient: (c: AmbientChoice) => void;
  sections: Sections;
  onToggle: (k: keyof Sections) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="shrink-0 p-2 rounded-md hover:bg-ink/10 text-muted-foreground hover:text-ink transition" aria-label="Anpassa hemskärmen">
          <SlidersHorizontal className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2 flex items-center gap-1.5">
            <Sparkles className="size-3.5" /> Bakgrund
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            <AmbientChip label="Auto" active={ambient === "auto"} onClick={() => onPickAmbient("auto")} />
            {AMBIENTS.map((a) => (
              <AmbientChip key={a.id} label={a.label} active={ambient === a.id} onClick={() => onPickAmbient(a.id)} />
            ))}
          </div>
        </div>
        <div className="border-t border-border pt-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Visa</p>
          <ToggleRow label="På denna dag" on={sections.onThisDay} onClick={() => onToggle("onThisDay")} />
          <ToggleRow label="Dagens kaffe" on={sections.coffee} onClick={() => onToggle("coffee")} />
          <ToggleRow label="Veckoschema" on={sections.week} onClick={() => onToggle("week")} />
          <ToggleRow label="Veckans mål" on={sections.goals} onClick={() => onToggle("goals")} />
        </div>
        <div className="border-t border-border pt-3">
          <button
            onClick={() => exportArchive().catch((e) => console.error("Export failed", e))}
            className="w-full flex items-center gap-2 py-1.5 text-sm hover:text-ink transition"
          >
            <Download className="size-3.5" /> Exportera allt (backup)
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function emphasize(s: string): string {
  return s.replace(/\*(.+?)\*/g, "<em>$1</em>");
}

function CuriosityCard({ curiosity }: { curiosity: Curiosity }) {
  return (
    <section className="mt-8">
      <div className="rounded-xl border border-border bg-card/70 backdrop-blur-sm p-5">
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2 flex items-center gap-1.5">
          <Sparkles className="size-3.5" /> Dagens · {curiosity.tag}
        </p>
        <p
          className="font-text text-[1.15rem] leading-relaxed text-ink/90"
          dangerouslySetInnerHTML={{ __html: emphasize(curiosity.text) }}
        />
      </div>
    </section>
  );
}

// A small daily ritual: tap the mug to add a cup of coffee. The liquid rises
// with each cup and resets at midnight (keyed by local date). Synced via user_state.
function CoffeeCup() {
  const { state, update } = useUserState();
  const key = dayKey();
  const count = state.coffee?.[key] ?? 0;

  const MAX_VISUAL = 4; // 4 cups = a full mug; counting keeps going beyond.
  const fill = Math.min(count, MAX_VISUAL) / MAX_VISUAL;

  // Liquid surface inside the mug (viewBox 0..64). Fills from bottom (51) up to ~19.
  const top = 19, bottom = 51;
  const surfaceY = bottom - (bottom - top) * fill;

  function add(delta: number) {
    update((prev) => {
      const cur = prev.coffee?.[key] ?? 0;
      return { ...prev, coffee: { ...prev.coffee, [key]: Math.max(0, cur + delta) } };
    });
  }

  return (
    <section className="mt-4">
      <div className="rounded-xl border border-border bg-card/70 backdrop-blur-sm p-5 flex items-center gap-5">
        <button
          onClick={() => add(1)}
          className="relative shrink-0 active:scale-90 transition-transform"
          aria-label="Lägg till en kopp kaffe"
          title="Lägg till en kopp"
        >
          <svg width="68" height="68" viewBox="0 0 64 64" className="overflow-visible">
            {/* Steam — fades in once there's coffee in the cup */}
            <g
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              className="text-muted-foreground transition-opacity duration-500"
              style={{ opacity: fill > 0 ? 0.45 : 0 }}
            >
              <path d="M26 13 q3 -3 0 -6 q-3 -3 0 -6" />
              <path d="M34 13 q3 -3 0 -6 q-3 -3 0 -6" />
            </g>

            {/* Mug interior clip so the liquid takes the cup's shape */}
            <defs>
              <clipPath id="mug-inside">
                <path d="M16 18 L42 18 L40 50 Q40 52 38 52 L20 52 Q18 52 18 50 Z" />
              </clipPath>
            </defs>

            {/* Coffee */}
            <g clipPath="url(#mug-inside)">
              <rect
                x="14"
                width="32"
                y={surfaceY}
                height={fill > 0 ? bottom - surfaceY + 6 : 0}
                fill="#7a4a2b"
                className="transition-all duration-500 ease-out"
              />
            </g>

            {/* Mug body + handle outline */}
            <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" className="text-ink">
              <path d="M16 18 L42 18 L40 50 Q40 52 38 52 L20 52 Q18 52 18 50 Z" />
              <path d="M42 24 q9 0 9 7 q0 7 -9 7" strokeWidth="2.4" />
            </g>
          </svg>
        </button>

        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1">Dagens kaffe</p>
          <p className="font-serif italic text-2xl leading-none">
            {count} {count === 1 ? "kopp" : "koppar"}
          </p>
          {count > 0 && (
            <button
              onClick={() => add(-1)}
              className="mt-2 text-xs text-muted-foreground hover:text-ink transition"
            >
              Ångra
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

// "På denna dag" — one historical event for today's date, with a discreet link to
// read more on Wikipedia and an expandable list of a few more events. A small
// morning-newspaper moment, not a takeover of the home screen.
function OnThisDay() {
  const { data } = useQuery({
    queryKey: ["onThisDay", dayKey()],
    queryFn: () => fetchOnThisDay(),
    staleTime: 6 * 60 * 60_000,
    retry: false,
  });
  const [expanded, setExpanded] = useState(false);

  if (!data || data.events.length === 0) return null;
  const { events, mainCount } = data;

  // The headline rotates daily among the clean, interesting items only (heavy
  // politics/war items sit lower under "Fler händelser").
  const dayNumber = Math.floor(Date.now() / 86_400_000);
  const mainIdx = dayNumber % mainCount;
  const main = events[mainIdx];
  const more = events.filter((_, i) => i !== mainIdx).slice(0, 4);
  const yearsAgo = new Date().getFullYear() - main.year;

  return (
    <section className="mt-4">
      <div className="rounded-xl border border-border bg-card/70 backdrop-blur-sm p-5">
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2 flex items-center gap-1.5">
          <ScrollText className="size-3.5" /> På denna dag · {main.year}
          {yearsAgo > 0 && <span className="opacity-50 normal-case tracking-normal">· {yearsAgo} år sedan</span>}
        </p>
        <p className="font-text text-[1.15rem] leading-relaxed text-ink/90">{main.text}</p>
        <div className="mt-3 flex items-center gap-5">
          {main.url && (
            <a
              href={main.url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-ink transition"
            >
              Läs mer <ExternalLink className="size-3" />
            </a>
          )}
          {more.length > 0 && (
            <button
              onClick={() => setExpanded((o) => !o)}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-ink transition"
            >
              <ChevronRight className={`size-3 transition-transform ${expanded ? "rotate-90" : ""}`} />
              Fler händelser idag
            </button>
          )}
        </div>
        {expanded && more.length > 0 && (
          <ul className="mt-3 space-y-2 border-t border-border pt-3">
            {more.map((e, i) => (
              <li key={i} className="text-sm leading-snug">
                <span className="text-muted-foreground tabular-nums mr-2">{e.year}</span>
                {e.url ? (
                  <a href={e.url} target="_blank" rel="noreferrer noopener" className="text-ink/80 hover:text-ink transition">
                    {e.text}
                  </a>
                ) : (
                  <span className="text-ink/80">{e.text}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function SearchBox() {
  const { data: index } = useQuery({ queryKey: ["searchIndex"], queryFn: fetchSearchIndex, staleTime: 30_000 });
  const [q, setQ] = useState("");
  const results = useMemo(() => searchDocs(index ?? [], q), [index, q]);
  return (
    <div className="mt-8">
      <div className="relative">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Sök i arkivet…"
          className="w-full bg-card/70 backdrop-blur-sm border border-border rounded-lg pl-9 pr-3 py-2.5 text-base sm:text-sm outline-none focus:border-accent placeholder:opacity-50"
        />
      </div>
      {q.trim() && (
        <div className="mt-2 rounded-lg border border-border bg-card/85 backdrop-blur-sm divide-y divide-border overflow-hidden">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">Inga träffar.</p>
          ) : (
            results.map((d) => (
              <Link
                key={d.id}
                to="/app/page/$pageId"
                params={{ pageId: d.id }}
                className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-ink/5 transition-colors"
              >
                <span className="shrink-0 text-base leading-none">
                  {d.icon ?? <FileText className="size-4 opacity-40" />}
                </span>
                <span className="text-sm truncate">{d.title || "Namnlös"}</span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function AmbientChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1.5 text-xs rounded-md border transition ${
        active ? "border-accent bg-accent/15 text-ink" : "border-border hover:bg-ink/5 text-muted-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function ToggleRow({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between py-1.5 text-sm hover:text-ink transition">
      <span>{label}</span>
      <span className={`size-4 rounded border flex items-center justify-center ${on ? "bg-accent border-accent" : "border-ink/30"}`}>
        {on && <Check className="size-3 text-accent-foreground" />}
      </span>
    </button>
  );
}

function RecentCards({ recent, pages }: { recent: Page[]; pages: Page[] }) {
  return (
    <section className="mt-12">
      <h2 className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground mb-4">Senaste</h2>
      {recent.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Inget än. Tryck + för att börja.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {recent.map((p) => {
            const parent = pages.find((x) => x.id === p.parent_id);
            return (
              <Link
                key={p.id}
                to="/app/page/$pageId"
                params={{ pageId: p.id }}
                className="group rounded-xl border border-border bg-card/70 backdrop-blur-sm p-4 hover:border-accent/50 hover:-translate-y-0.5 transition-all min-h-[7rem] flex flex-col"
              >
                <div className="text-xl mb-2">{p.icon ?? <FileText className="size-4 opacity-40" />}</div>
                <p className="font-serif italic text-lg leading-tight line-clamp-2">{p.title || "Namnlös"}</p>
                <span className="mt-auto pt-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                  {parent ? parent.title || "Namnlös" : timeAgo(p.updated_at)}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

// --- user_state backed sections (useUserState lives in @/lib/useUserState) ---

function WeeklySchedule() {
  const [open, setOpen] = useState(false);
  const { state, update } = useUserState();
  const wk = isoWeekKey();
  const dates = weekDates();
  const notes = state.week[wk] ?? {};

  function setDay(dayKey: string, text: string) {
    update((prev) => ({
      ...prev,
      week: { ...prev.week, [wk]: { ...(prev.week[wk] ?? {}), [dayKey]: text } },
    }));
  }

  return (
    <section className="mt-12">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-muted-foreground hover:text-ink transition"
      >
        <ChevronRight className={`size-3.5 transition-transform ${open ? "rotate-90" : ""}`} />
        Veckoschema
      </button>
      {open && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-7 gap-2">
          {WEEK_DAYS.map((d, i) => {
            const isToday = dates[i].toDateString() === new Date().toDateString();
            return (
              <div
                key={d.key}
                className={`rounded-lg border bg-card/70 backdrop-blur-sm p-2.5 min-h-[6.5rem] flex flex-col ${
                  isToday ? "border-accent/60" : "border-border"
                }`}
              >
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{d.label}</span>
                  <span className={`text-xs ${isToday ? "text-accent font-medium" : "text-muted-foreground/60"}`}>
                    {dates[i].getDate()}
                  </span>
                </div>
                <textarea
                  value={notes[d.key] ?? ""}
                  onChange={(e) => setDay(d.key, e.target.value)}
                  placeholder="…"
                  className="flex-1 w-full bg-transparent resize-none outline-none text-base sm:text-sm leading-snug placeholder:opacity-30 font-text"
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function TrainingGoals() {
  const { state, update } = useUserState();
  const wk = isoWeekKey();
  const done = state.goalsDone[wk] ?? [];
  const [draft, setDraft] = useState("");

  function addGoal() {
    const label = draft.trim();
    if (!label) return;
    const goal: Goal = { id: crypto.randomUUID(), label };
    update((prev) => ({ ...prev, goals: [...prev.goals, goal] }));
    setDraft("");
  }
  function removeGoal(id: string) {
    update((prev) => ({
      ...prev,
      goals: prev.goals.filter((g) => g.id !== id),
    }));
  }
  function toggleDone(id: string) {
    update((prev) => {
      const cur = prev.goalsDone[wk] ?? [];
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      return { ...prev, goalsDone: { ...prev.goalsDone, [wk]: next } };
    });
  }

  return (
    <section className="mt-12">
      <h2 className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground mb-4">Veckans mål</h2>
      <ul className="space-y-1">
        {state.goals.map((g) => {
          const checked = done.includes(g.id);
          return (
            <li key={g.id} className="group flex items-center gap-3 py-1.5">
              <button
                onClick={() => toggleDone(g.id)}
                className={`size-5 rounded-md border flex items-center justify-center shrink-0 transition ${
                  checked ? "bg-accent border-accent" : "border-ink/30 hover:border-ink/60"
                }`}
                aria-label="Markera mål"
              >
                {checked && <Check className="size-3.5 text-accent-foreground" />}
              </button>
              <span className={`flex-1 text-[1.05rem] font-text ${checked ? "line-through opacity-50" : ""}`}>
                {g.label}
              </span>
              <button
                onClick={() => removeGoal(g.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition"
                aria-label="Ta bort mål"
              >
                <X className="size-3.5" />
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addGoal(); }}
          placeholder="Nytt mål, t.ex. Gym 4 ggr"
          className="flex-1 bg-card/70 backdrop-blur-sm border border-border rounded-md px-3 py-2 text-base sm:text-sm outline-none focus:border-accent placeholder:opacity-40"
        />
        <button onClick={addGoal} className="p-2 rounded-md bg-ink text-paper hover:opacity-90 transition" aria-label="Lägg till mål">
          <Plus className="size-4" />
        </button>
      </div>
    </section>
  );
}

function timeAgo(iso: string): string {
  const d = (Date.now() - +new Date(iso)) / 1000;
  if (d < 60) return "nyss";
  if (d < 3600) return `${Math.floor(d / 60)} min`;
  if (d < 86400) return `${Math.floor(d / 3600)} tim`;
  if (d < 86400 * 7) return `${Math.floor(d / 86400)} d`;
  return new Date(iso).toLocaleDateString("sv-SE");
}
