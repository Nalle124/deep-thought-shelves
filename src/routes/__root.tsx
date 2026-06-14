import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { ThemeProvider } from "../lib/theme";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-serif italic text-7xl">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">Den här sidan finns inte.</p>
        <Link to="/" className="mt-6 inline-block underline text-sm">Till startsidan</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-serif italic text-3xl">Något gick fel</h1>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 px-4 py-2 rounded-md bg-ink text-paper text-sm"
        >
          Försök igen
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" },
      { title: "Arkiv" },
      { name: "description", content: "Ett stilla, privat arkiv av anteckningar." },
      { property: "og:title", content: "Arkiv — En privat dagbok" },
      { name: "twitter:title", content: "Arkiv — En privat dagbok" },
      { property: "og:description", content: "Ett stilla, privat arkiv av anteckningar." },
      { name: "twitter:description", content: "Ett stilla, privat arkiv av anteckningar." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/2c7493d3-246a-4b1a-ba73-02610e74fa01/id-preview-e6e9f54e--3012d984-a6f3-4225-a585-576520e66a0a.lovable.app-1780918585495.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/2c7493d3-246a-4b1a-ba73-02610e74fa01/id-preview-e6e9f54e--3012d984-a6f3-4225-a585-576520e66a0a.lovable.app-1780918585495.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
      { name: "theme-color", content: "#141312" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Arkiv" },
    ],
    links: [
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.png", type: "image/png", sizes: "48x48" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,300..600;1,6..72,300..500&family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

// Runs before first paint: set the theme class from localStorage so there's no
// light→dark flash on cold loads, and the splash shows the right colour.
const THEME_BOOT = `(function(){try{var t=localStorage.getItem('theme');var d=document.documentElement;d.classList.remove('dark','paper');if(t==='dark')d.classList.add('dark');else if(t==='paper')d.classList.add('paper');else if(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)d.classList.add('dark');}catch(e){}})();`;

// Branded loading veil shown immediately (it's in the server HTML, so it covers
// the JS-download/hydration gap). RootComponent fades it out once mounted.
const SPLASH_CSS = `#arkiv-splash{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:#f9f8f6;color:#1a1a1a;font-family:Fraunces,'Instrument Serif',Georgia,serif;font-style:italic;font-size:2.75rem;letter-spacing:-.01em;transition:opacity .45s ease;opacity:1}.dark #arkiv-splash{background:#2a2826;color:#ecebe7}.paper #arkiv-splash{background:#f3ead2;color:#38322a}#arkiv-splash.arkiv-hide{opacity:0;pointer-events:none}`;

function RootShell({ children }: { children: ReactNode }) {
  return (
    // The theme-boot script sets the html class before hydration; suppress the
    // expected className mismatch warning on this element.
    <html lang="sv" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <style dangerouslySetInnerHTML={{ __html: SPLASH_CSS }} />
        <HeadContent />
      </head>
      <body>
        <div id="arkiv-splash"><span>Arkiv</span></div>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        router.invalidate();
        if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
      }
    });
    return () => subscription.unsubscribe();
  }, [router, queryClient]);

  // Fade out the splash veil once the app has mounted/hydrated.
  useEffect(() => {
    const el = typeof document !== "undefined" && document.getElementById("arkiv-splash");
    if (!el) return;
    const t1 = setTimeout(() => el.classList.add("arkiv-hide"), 120);
    const t2 = setTimeout(() => el.remove(), 650);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Outlet />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
