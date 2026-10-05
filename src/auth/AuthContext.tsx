import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { authApi, type Admin, type Permission } from "../api/auth";
import { getToken, onUnauthorized, setToken } from "../lib/api";
import { AuthContext, type AuthStatus } from "./authContextValue";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [status, setStatus] = useState<AuthStatus>(() => (getToken() ? "loading" : "anonymous"));

  const logout = useCallback(() => {
    setToken(null);
    setAdmin(null);
    setStatus("anonymous");
  }, []);

  // Any 401 means the token expired or was revoked: no refresh tokens for admins.
  useEffect(() => {
    onUnauthorized(logout);
    return () => onUnauthorized(null);
  }, [logout]);

  // Restore the session from a stored token.
  useEffect(() => {
    if (!getToken()) return;
    const controller = new AbortController();
    authApi
      .me(controller.signal)
      .then((me) => {
        setAdmin(me);
        setStatus("authenticated");
      })
      .catch((error: Error) => {
        if (error.name === "AbortError") return;
        logout();
      });
    return () => controller.abort();
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const { admin: signedIn, token } = await authApi.login({ email, password });
    setToken(token);
    setAdmin(signedIn);
    setStatus("authenticated");
    return signedIn;
  }, []);

  const replaceToken = useCallback((token: string) => setToken(token), []);

  const can = useCallback((permission: Permission) => admin?.permissions.includes(permission) ?? false, [admin]);

  const value = useMemo(
    () => ({ status, admin, login, logout, replaceToken, can }),
    [status, admin, login, logout, replaceToken, can],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
