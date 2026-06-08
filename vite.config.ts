// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // Declaring `nitro` explicitly makes the deploy build run outside Lovable's sandbox too
  // (needed for Vercel/CLI builds). Preset is env-driven so Lovable's Cloudflare deploy
  // still works unchanged; set NITRO_PRESET=vercel in the Vercel project to target Vercel.
  nitro: nitroOptions(),
});

function nitroOptions() {
  // On Vercel, process.env.VERCEL is set during the build, so we target the vercel
  // preset automatically — no env var needed. NITRO_PRESET still overrides if set.
  const preset =
    process.env.NITRO_PRESET ?? (process.env.VERCEL ? "vercel" : "cloudflare-module");
  // Lovable's wrapper hard-codes output to dist/. For Vercel we redirect to the
  // Build Output API location (.vercel/output) so Vercel auto-detects the build.
  if (preset === "vercel") {
    return {
      preset,
      output: {
        dir: ".vercel/output",
        // Must match nitro's vercel preset layout so the Build Output API routing
        // (config.json -> /__server) resolves to this function directory.
        serverDir: ".vercel/output/functions/__server.func",
        publicDir: ".vercel/output/static",
      },
    };
  }
  return { preset };
}
