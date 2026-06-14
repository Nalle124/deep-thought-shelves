import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { launchTarget } from "@/lib/lastVisit";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
    // Home once per day; otherwise straight to the last page you had open.
    throw redirect(launchTarget());
  },
  component: () => null,
});
