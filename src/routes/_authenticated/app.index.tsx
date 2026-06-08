import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/app/")({
  component: () => (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-sm px-8">
        <h2 className="font-serif italic text-4xl tracking-tight">A blank page awaits.</h2>
        <p className="mt-4 text-sm text-muted-foreground">
          Select a note from your library, or press the <span className="text-ink font-medium">+</span> to begin a new one.
        </p>
      </div>
    </div>
  ),
});
