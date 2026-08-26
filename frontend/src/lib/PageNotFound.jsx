import { Link } from "react-router-dom";

export default function PageNotFound() {
  return (
    <div className="min-h-screen bg-background px-6 py-16 text-foreground">
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <div className="mb-5 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-semibold text-muted-foreground">
          404
        </div>
        <h1 className="text-4xl font-extrabold">Page not found</h1>
        <p className="mt-4 text-muted-foreground">
          The page you are looking for is not available in this workspace.
        </p>
        <Link
          to="/"
          className="mt-8 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
