import { createFileRoute } from "@tanstack/react-router";
import { PageEditor } from "@/components/PageEditor";

export const Route = createFileRoute("/_authenticated/app/page/$pageId")({
  component: PageRoute,
});

function PageRoute() {
  const { pageId } = Route.useParams();
  return <PageEditor pageId={pageId} />;
}
