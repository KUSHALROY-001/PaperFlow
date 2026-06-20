import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import ThemeProvider from "./components/ThemeProvider";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";

// Page imports
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import ClusterWorkspace from "./pages/ClusterWorkspace";
import ClustersLibrary from "./pages/ClustersLibrary";
import Settings from "./pages/Settings";
import ActiveJobs from "./pages/ActiveJobs";
import AppShell from "./components/AppShell";
import MockSession from "./pages/MockSession";
import QuestionEditor from "./pages/QuestionEditor";
import Templates from "./pages/Templates";
import Team from "./pages/Team";
import Analytics from "./pages/Analytics";
import BatchUpload from "./pages/BatchUpload";
import SharedMock from "./pages/SharedMock";
import Integrations from "./pages/Integrations";
import Billing from "./pages/Billing";
import MyResults from "./pages/MyResults";
import AuthPage from "./pages/AuthPage";

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } =
    useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === "user_not_registered") {
      return <UserNotRegisteredError />;
    } else if (authError.type === "auth_required") {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route
        path="/login"
        element={
          <AuthPage
            mode="login"
            title="Welcome back to MockCraft"
            description="Sign in to continue building and reviewing structured mock tests."
          />
        }
      />
      <Route
        path="/signup"
        element={
          <AuthPage
            mode="signup"
            title="Create your MockCraft workspace"
            description="Start turning scanned papers into searchable, reviewable mock tests."
          />
        }
      />

      {/* Public shared mock — no shell */}
      <Route path="/shared/:token" element={<SharedMock />} />
      <Route path="/session/:id" element={<MockSession />} />

      {/* App shell with sidebar */}
      <Route element={<AppShell />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/clusters" element={<ClustersLibrary />} />
        <Route path="/cluster/:id" element={<ClusterWorkspace />} />
        <Route path="/cluster/:clusterId/editor" element={<QuestionEditor />} />
        <Route path="/jobs" element={<ActiveJobs />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/team" element={<Team />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/batch" element={<BatchUpload />} />
        <Route path="/integrations" element={<Integrations />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/my-results" element={<MyResults />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
