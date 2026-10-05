import { createContext } from "react";

import type { Admin, Permission } from "../api/auth";

export type AuthStatus = "loading" | "authenticated" | "anonymous";

export type AuthContextValue = {
  status: AuthStatus;
  admin: Admin | null;
  login: (email: string, password: string) => Promise<Admin>;
  logout: () => void;
  /** Store a replacement token (e.g. after change-password). */
  replaceToken: (token: string) => void;
  can: (permission: Permission) => boolean;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
