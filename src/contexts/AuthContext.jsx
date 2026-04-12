/**
 * Admin AuthContext — JWT-only authentication.
 *
 * Flow:
 *  1. POST /auth/login  → backend validates credentials, returns JWT tokens
 *  2. Tokens stored in localStorage, attached to every API request
 *  3. On page reload, session restored from localStorage
 *  4. Logout clears localStorage and removes the Authorization header
 *
 * ⚠️  No Firebase Auth here.
 *     Firebase is used in this app ONLY for Firestore real-time reads
 *     (Live Orders page).  The Firestore SDK does not require Firebase Auth
 *     when security rules are set to allow the relevant reads.
 */

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

const TOKEN_KEY   = "admin_access_token";
const REFRESH_KEY = "admin_refresh_token";
const USER_KEY    = "admin_user";

export function AuthProvider({ children }) {
  const [admin, setAdmin]            = useState(null);
  const [loading, setLoading]        = useState(true);   // true while restoring session
  const [isAuthenticated, setIsAuth] = useState(false);

  // ── Restore session from localStorage on mount ──────────────────────────
  useEffect(() => {
    const token  = localStorage.getItem(TOKEN_KEY);
    const stored = localStorage.getItem(USER_KEY);

    if (token && stored) {
      try {
        const user = JSON.parse(stored);
        if (user?.role === "admin") {
          // The request interceptor in api.js will attach this automatically,
          // but set it here too so it's available synchronously for the first render.
          api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          setAdmin(user);
          setIsAuth(true);
        } else {
          _clearStorage();
        }
      } catch {
        _clearStorage();
      }
    }

    setLoading(false);
  }, []);

  // ── Login ────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const res = await api.post("/auth/login", { email, password });

    const payload = res.data?.data ?? res.data;
    const { user } = payload;
    // Backend wraps tokens: { user, tokens: { accessToken, refreshToken } }
    const accessToken  = payload.accessToken  ?? payload.tokens?.accessToken;
    const refreshToken = payload.refreshToken ?? payload.tokens?.refreshToken;

    if (!user || user.role !== "admin") {
      throw new Error("Access denied. This account does not have admin privileges.");
    }

    localStorage.setItem(TOKEN_KEY,   accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
    localStorage.setItem(USER_KEY,    JSON.stringify(user));

    api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;

    setAdmin(user);
    setIsAuth(true);

    return user;
  }, []);

  // ── Logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore backend errors — always clear locally
    } finally {
      _clearStorage();
      delete api.defaults.headers.common["Authorization"];
      setAdmin(null);
      setIsAuth(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ admin, isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

// ── Private helper ────────────────────────────────────────────────────────────
function _clearStorage() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}
