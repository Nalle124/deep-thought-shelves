import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/app" });
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  // Prefill remembered email
  useEffect(() => {
    const saved = localStorage.getItem("anthology:remembered-email");
    if (saved) setEmail(saved);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/app` },
        });
        if (error) throw error;
        toast.success("Welcome to Anthology.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      if (remember) localStorage.setItem("anthology:remembered-email", email);
      else localStorage.removeItem("anthology:remembered-email");
      navigate({ to: "/app" });
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-paper px-6 py-12">
      <form onSubmit={handleSubmit} className="w-full max-w-sm" autoComplete="on">
        <div className="text-center mb-12">
          <h1 className="font-serif italic text-5xl tracking-tight text-ink">Anthology</h1>
          <p className="mt-3 text-sm text-muted-foreground">A private library of notes.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Email</label>
            <input
              id="email" name="email" type="email" required
              autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-card border border-border rounded-md px-3 py-2.5 text-base sm:text-sm outline-none focus:border-accent transition-colors"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Password</label>
            <input
              id="password" name="password" type="password" required minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-card border border-border rounded-md px-3 py-2.5 text-base sm:text-sm outline-none focus:border-accent transition-colors"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox" checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="size-3.5 accent-accent"
            />
            Remember me on this device
          </label>

          <button
            type="submit" disabled={loading}
            className="w-full py-3 sm:py-2.5 bg-ink text-paper rounded-md text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="w-full mt-6 text-xs text-muted-foreground hover:text-ink transition-colors"
        >
          {mode === "signin" ? "No account yet? Create one." : "Already have an account? Sign in."}
        </button>
      </form>
    </div>
  );
}
