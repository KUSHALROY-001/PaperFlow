import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
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
import MockTestWorkspace from "./pages/MockTestWorkspace";
import QuestionEditor from "./pages/QuestionEditor";
import Templates from "./pages/Templates";
import Team from "./pages/Team";
import Students from "./pages/Students";
import StudentDetail from "./pages/StudentDetail";
import QuestionBank from "./pages/QuestionBank";
import ReviewQueue from "./pages/ReviewQueue";
import Duplicates from "./pages/Duplicates";
import PublicMockTests from "./pages/PublicMockTests";
import PublicCatalog from "./pages/PublicCatalog";
import SharedMock from "./pages/SharedMock";
import Billing from "./pages/Billing";
import MyResults from "./pages/MyResults";
import AuthPage from "./pages/AuthPage";
import MyInvitations from "./pages/MyInvitations";
import AcceptInvite from "./pages/AcceptInvite";

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated } =
    useAuth();
  const location = useLocation();

  const publicPaths = ["/", "/login", "/signup", "/accept-invite"];
  const isPublicRoute =
    publicPaths.includes(location.pathname) ||
    location.pathname.startsWith("/shared/") ||
    location.pathname.startsWith("/session/") ||
    location.pathname === "/catalog" ||
    location.pathname.startsWith("/catalog/");

  if (!isPublicRoute && (isLoadingPublicSettings || isLoadingAuth)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isPublicRoute && !isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!isPublicRoute && authError) {
    if (authError.type === "user_not_registered") {
      return <UserNotRegisteredError />;
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
      <Route path="/accept-invite" element={<AcceptInvite />} />
      <Route path="/catalog/:slug" element={<PublicCatalog />} />
      <Route path="/catalog" element={<PublicCatalog />} />

      {/* App shell with sidebar */}
      <Route element={<AppShell />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/clusters" element={<ClustersLibrary />} />
        <Route path="/cluster/:id" element={<ClusterWorkspace />} />
        <Route
          path="/cluster/:clusterId/mocktest/:mockTestId"
          element={<MockTestWorkspace />}
        />
        <Route path="/cluster/:clusterId/editor" element={<QuestionEditor />} />
        <Route
          path="/cluster/:clusterId/mock/:mockTestId/editor"
          element={<QuestionEditor />}
        />
        <Route path="/jobs" element={<ActiveJobs />} />
        <Route path="/review-queue" element={<ReviewQueue />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/duplicates" element={<Duplicates />} />
        <Route path="/public-mocktest" element={<PublicMockTests />} />
        <Route path="/team" element={<Team />} />
        <Route path="/students" element={<Students />} />
        <Route path="/students/:email" element={<StudentDetail />} />
        <Route path="/invitations" element={<MyInvitations />} />
        <Route path="/question-bank" element={<QuestionBank />} />
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
