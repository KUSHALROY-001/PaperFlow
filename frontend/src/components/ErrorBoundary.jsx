import { Component } from "react";
import { AlertTriangle } from "lucide-react";

// Catches render-time errors anywhere below it in the tree (a bad prop, a
// null dereference in JSX, etc.) that would otherwise unmount the whole
// React tree and leave a blank page with nothing but a raw stack trace in
// the console. This can only ever catch RENDER errors - it does not (and
// per React's own error-boundary contract, cannot) catch errors from event
// handlers or async code like a rejected fetch; those already go through
// apiRequest()'s own error handling (see lib/api.js) and each page/modal's
// own try/catch around it.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // The one place this raw detail is allowed to show up - a developer's
    // console, not the page itself.
    console.error("Unhandled render error:", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-foreground">
            Something went wrong
          </h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            This page ran into an unexpected error. Reloading usually fixes
            it - if it keeps happening, please let us know.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
        >
          Reload page
        </button>
      </div>
    );
  }
}
