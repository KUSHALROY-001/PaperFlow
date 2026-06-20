import { createContext, useCallback, useContext, useMemo, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authChecked, setAuthChecked] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  const checkUserAuth = useCallback(async () => {
    setAuthChecked(true);
    setIsAuthenticated(true);
    return true;
  }, []);

  const navigateToLogin = useCallback(() => {
    if (typeof window !== "undefined") {
      window.location.assign("/login");
    }
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    navigateToLogin();
  }, [navigateToLogin]);

  const value = useMemo(
    () => ({
      authChecked,
      authError: null,
      checkUserAuth,
      isAuthenticated,
      isLoadingAuth: false,
      isLoadingPublicSettings: false,
      logout,
      navigateToLogin,
    }),
    [authChecked, checkUserAuth, isAuthenticated, logout, navigateToLogin],
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
