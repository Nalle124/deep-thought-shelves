import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // getSession() reads the persisted session from localStorage (refreshing the
    // token in the background when needed) — no blocking network round-trip on
    // every navigation, so opening the app and jumping between pages stays instant.
    // getUser() would hit /auth/v1/user each time and make navigation hang on a
    // slow connection.
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) throw redirect({ to: "/auth" });
    return { user: data.session.user };
  },
  component: () => <Outlet />,
});
