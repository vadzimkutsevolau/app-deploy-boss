import { createFileRoute, Link } from "@tanstack/react-router";
export const Route = createFileRoute("/dashboard/events/$id/edit")({
  component: () => {
    const { id } = Route.useParams();
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold">Edit event</h1>
        <p className="text-muted-foreground mt-2">Editing UI coming soon. Event ID: <code className="text-xs">{id}</code></p>
        <Link to="/dashboard" className="text-primary text-sm mt-4 inline-block">← Back to dashboard</Link>
      </div>
    );
  },
});