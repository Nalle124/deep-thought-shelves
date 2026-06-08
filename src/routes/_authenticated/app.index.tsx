import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchLibrary } from "@/lib/library";
import { FileText, FolderTree } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/")({
  component: Overview,
});

// A fresh greeting each day — picked deterministically from the date so it stays
// stable through the day but changes when you open the archive on a new day.
const GREETINGS = [
  "Välkommen tillbaka.",
  "En ny dag att minnas.",
  "Vad bär du med dig idag?",
  "Låt tankarna landa.",
  "En tom sida väntar.",
  "Var god dröj vid tanken.",
  "Skriv ner det innan det glöms.",
  "Tystnaden är din.",
  "Vad vill du bevara idag?",
  "Börja där du står.",
  "Ny dag, nya rader.",
  "Här vilar dina ord.",
  "Lugnt och stilla.",
  "Något att lägga till arkivet?",
  "Dagen är fortfarande oskriven.",
];

function greetingForToday(): string {
  const dayNumber = Math.floor(Date.now() / 86_400_000);
  return GREETINGS[dayNumber % GREETINGS.length];
}

function Overview() {
  const { data: lib } = useQuery({ queryKey: ["library"], queryFn: fetchLibrary });
  const pages = lib?.pages ?? [];
  // A "collection" is just a page that contains other pages.
  const collections = pages.filter((p) => pages.some((c) => c.parent_id === p.id)).length;
  const recent = [...pages]
    .sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at))
    .slice(0, 6);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 sm:px-10 py-12 sm:py-20">
        <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground mb-3">Arkiv</p>
        <h1 className="font-serif italic text-4xl sm:text-6xl tracking-tight">{greetingForToday()}</h1>
        <p className="mt-4 text-muted-foreground text-sm sm:text-base max-w-md">
          En stilla plats för dina tankar. {pages.length} sid{pages.length === 1 ? "a" : "or"} i arkivet.
        </p>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-10">
          <Stat label="Sidor" value={pages.length} icon={<FileText className="size-4 opacity-40" />} />
          <Stat label="Samlingar" value={collections} icon={<FolderTree className="size-4 opacity-40" />} />
        </div>

        <section className="mt-12">
          <h2 className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground mb-4">Senaste</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Inget än. Tryck <span className="text-ink font-medium">+</span> för att börja.
            </p>
          ) : (
            <ul className="divide-y divide-border border-t border-b border-border">
              {recent.map((p) => {
                const parent = pages.find((x) => x.id === p.parent_id);
                return (
                  <li key={p.id}>
                    <Link
                      to="/app/page/$pageId"
                      params={{ pageId: p.id }}
                      className="flex items-center justify-between gap-4 py-3 sm:py-4 hover:opacity-70 transition-opacity"
                    >
                      <div className="min-w-0 flex items-center gap-3">
                        {p.icon && <span className="text-lg shrink-0" aria-hidden>{p.icon}</span>}
                        <div className="min-w-0">
                          <p className="font-serif italic text-lg sm:text-xl truncate">{p.title || "Namnlös"}</p>
                          {parent && (
                            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mt-1 truncate">
                              {parent.icon ? `${parent.icon}  ` : ""}{parent.title || "Namnlös"}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] uppercase tracking-widest text-muted-foreground shrink-0">
                        {timeAgo(p.updated_at)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="border border-border rounded-lg p-4 sm:p-5 bg-card">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}</p>
        {icon}
      </div>
      <p className="font-serif italic text-3xl sm:text-4xl mt-2">{value}</p>
    </div>
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
