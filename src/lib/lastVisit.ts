import { dayKey } from "@/lib/userState";

// Where the app lands when launched: the home screen once per day, otherwise the
// page you last had open — so you drop straight back into what you were writing.
const LAST_PAGE = "arkiv:lastPage";
const HOME_SEEN = "arkiv:homeSeenDay";

export function rememberPage(id: string) {
  try { localStorage.setItem(LAST_PAGE, id); } catch { /* ignore */ }
}

export function clearLastPage() {
  try { localStorage.removeItem(LAST_PAGE); } catch { /* ignore */ }
}

// Mark that the home screen has been seen today (so later launches skip it).
export function rememberHomeSeen() {
  try { localStorage.setItem(HOME_SEEN, dayKey()); } catch { /* ignore */ }
}

// Decide the launch destination. New day (or no remembered page) → home;
// otherwise the last opened page.
export function launchTarget(): { to: "/app" } | { to: "/app/page/$pageId"; params: { pageId: string } } {
  try {
    const seen = localStorage.getItem(HOME_SEEN);
    const last = localStorage.getItem(LAST_PAGE);
    if (seen === dayKey() && last) return { to: "/app/page/$pageId", params: { pageId: last } };
  } catch { /* ignore */ }
  return { to: "/app" };
}
