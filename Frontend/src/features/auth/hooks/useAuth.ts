import { useState, useCallback } from "react";
import type { AuthState } from "../../../types/common";
import { authService } from "../services/auth.service";

function loadStoredAuth(): AuthState {
  try {
    const stored = sessionStorage.getItem("sms_auth");
    if (stored) return JSON.parse(stored) as AuthState;
  } catch {
    // ignore
  }
  return { user: null, token: null, isAuthenticated: false };
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>(loadStoredAuth);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const res = await authService.login({ email, password });
    const state: AuthState = { user: res.user, token: res.token, isAuthenticated: true };
    sessionStorage.setItem("sms_auth", JSON.stringify(state));
    setAuth(state);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem("sms_auth");
    setAuth({ user: null, token: null, isAuthenticated: false });
  }, []);

  return { ...auth, login, logout };
}

