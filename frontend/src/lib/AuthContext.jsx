import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, clearStoredAuth, getStoredAuth, storeAuth } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    Boolean(getStoredAuth().token),
  );
  const [user, setUser] = useState(null);
  const [workspaceId, setWorkspaceId] = useState(
    () => getStoredAuth().workspaceId,
  );
  const [workspaces, setWorkspaces] = useState([]);

  const checkUserAuth = useCallback(async () => {
    const { token } = getStoredAuth();

    if (!token) {
      setAuthChecked(true);
      setIsAuthenticated(false);
      setUser(null);
      return false;
    }

    try {
      const session = await api.me();
      setUser(session.user);
      setWorkspaceId(session.workspaceId);
      setWorkspaces(session.workspaces || []);
      setIsAuthenticated(true);
      setAuthChecked(true);
      return true;
    } catch {
      clearStoredAuth();
      setUser(null);
      setWorkspaceId(null);
      setWorkspaces([]);
      setIsAuthenticated(false);
      setAuthChecked(true);
      return false;
    }
  }, []);

  useEffect(() => {
    checkUserAuth();
  }, [checkUserAuth]);

  const navigateToLogin = useCallback(() => {
    if (typeof window !== "undefined") {
      window.location.assign("/login");
    }
  }, []);

  const logout = useCallback(() => {
    clearStoredAuth();
    setUser(null);
    setWorkspaceId(null);
    setIsAuthenticated(false);
    navigateToLogin();
  }, [navigateToLogin]);

  const login = useCallback(
    async (payload) => {
      const result = await api.login(payload);
      storeAuth(result);
      setUser(result.user);
      setWorkspaceId(result.workspaceId);
      setIsAuthenticated(true);
      await checkUserAuth();
      return result;
    },
    [checkUserAuth],
  );

  const signup = useCallback(
    async (payload) => {
      const result = await api.signup(payload);
      storeAuth(result);
      setUser(result.user);
      setWorkspaceId(result.workspaceId);
      setIsAuthenticated(true);
      await checkUserAuth();
      return result;
    },
    [checkUserAuth],
  );

  // Switching workspace changes which data every page-scoped query returns
  // (clusters, mock tests, dashboard summary, team - all of it). Rather than
  // hand-picking every react-query key to invalidate, a full reload is the
  // same "clean slate" approach logout() already uses below - simplest way
  // to guarantee nothing from the old workspace lingers in memory.
  const switchWorkspace = useCallback(
    (newWorkspaceId) => {
      if (!newWorkspaceId || newWorkspaceId === workspaceId) return;
      storeAuth({ token: getStoredAuth().token, workspaceId: newWorkspaceId });
      window.location.assign("/dashboard");
    },
    [workspaceId],
  );

  const currentWorkspace = useMemo(
    () => workspaces.find((w) => w.id === workspaceId) || null,
    [workspaces, workspaceId],
  );
  const role = currentWorkspace?.role || user?.role || "owner";
  const isViewer = role === "viewer";
  // Mirrors requireRole("admin") in require-role.js (ROLE_RANK: viewer < editor
  // < admin < owner) - "admin or higher", not an exact match, so an owner
  // still passes an isAdmin check the same way the backend's requireRole
  // would let them through an admin-gated route.
  const isAdmin = role === "admin" || role === "owner";

  const value = useMemo(
    () => ({
      authChecked,
      authError: null,
      checkUserAuth,
      isAuthenticated,
      isLoadingAuth: !authChecked,
      isLoadingPublicSettings: false,
      login,
      logout,
      navigateToLogin,
      signup,
      switchWorkspace,
      user,
      workspaceId,
      workspaces,
      currentWorkspace,
      role,
      isViewer,
      isAdmin,
    }),
    [
      authChecked,
      checkUserAuth,
      isAuthenticated,
      login,
      logout,
      navigateToLogin,
      signup,
      switchWorkspace,
      user,
      workspaceId,
      workspaces,
      currentWorkspace,
      role,
      isViewer,
      isAdmin,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
