import { supabase } from "@/integrations/supabase/client";

// A small per-user JSON blob for home-screen data that should sync across
// devices: the weekly schedule notes and the recurring training goals.
export type Goal = { id: string; label: string };
export type WeekNotes = Record<string, string>; // "mon".."sun" → text

export type UserState = {
  goals: Goal[];
  goalsDone: Record<string, string[]>; // weekKey → done goal ids
  week: Record<string, WeekNotes>; // weekKey → day notes
  coffee: Record<string, number>; // dayKey (YYYY-MM-DD) → cups drunk that day
};

export const EMPTY_STATE: UserState = { goals: [], goalsDone: {}, week: {}, coffee: {} };

// Local-date key, e.g. "2026-06-11" — for things that reset at midnight.
export function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function fetchUserState(): Promise<UserState> {
  const { data, error } = await supabase
    .from("user_state")
    .select("data")
    .maybeSingle();
  if (error) throw error;
  return { ...EMPTY_STATE, ...((data?.data as Partial<UserState>) ?? {}) };
}

export async function saveUserState(state: UserState): Promise<void> {
  const { data: s } = await supabase.auth.getSession();
  const user = s.session?.user;
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase
    .from("user_state")
    .upsert({ user_id: user.id, data: state, updated_at: new Date().toISOString() });
  if (error) throw error;
}

// ISO week key, e.g. "2026-W23".
export function isoWeekKey(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((+date - +yearStart) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export const WEEK_DAYS: { key: string; label: string }[] = [
  { key: "mon", label: "Mån" },
  { key: "tue", label: "Tis" },
  { key: "wed", label: "Ons" },
  { key: "thu", label: "Tor" },
  { key: "fri", label: "Fre" },
  { key: "sat", label: "Lör" },
  { key: "sun", label: "Sön" },
];

// Date of each day in the given ISO week (Mon–Sun), for showing the day numbers.
export function weekDates(d = new Date()): Date[] {
  const date = new Date(d);
  const day = date.getDay() || 7;
  const monday = new Date(date);
  monday.setDate(date.getDate() - day + 1);
  return WEEK_DAYS.map((_, i) => {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    return dd;
  });
}
