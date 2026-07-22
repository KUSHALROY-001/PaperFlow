import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, clearStoredAuth, getStoredAuth, storeAuth } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(getStoredAuth().token));
  const [user, setUser] = useState(null);
  const [workspaceId, setWorkspaceId] = useState(() => getStoredAuth().workspaceId);

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
      setIsAuthenticated(true);
      setAuthChecked(true);
      return true;
    } catch {
      clearStoredAuth();
      setUser(null);
      setWorkspaceId(null);
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

  const login = useCallback(async (payload) => {
    const result = await api.login(payload);
    storeAuth(result);
    setUser(result.user);
    setWorkspaceId(result.workspaceId);
    setIsAuthenticated(true);
    return result;
  }, []);

  const signup = useCallback(async (payload) => {
    const result = await api.signup(payload);
    storeAuth(result);
    setUser(result.user);
    setWorkspaceId(result.workspaceId);
    setIsAuthenticated(true);
    return result;
  }, []);

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
      user,
      workspaceId,
    }),
    [authChecked, checkUserAuth, isAuthenticated, login, logout, navigateToLogin, signup, user, workspaceId],
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
