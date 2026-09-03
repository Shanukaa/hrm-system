import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { login as loginRequest, logoutRequest, getMe } from "../api/client.js";

// Only a display cache of non-sensitive user info (name/role/etc.) for a
// fast first paint — never the session token itself, which lives solely in
// an httpOnly cookie the backend sets and this code never touches.
const USER_KEY = "hrm_user";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Always confirm against the server: the httpOnly cookie is the real
    // source of truth, and it may have expired or been cleared since the
    // cached display info was last written.
    getMe()
      .then(({ user }) => {
        setUser(user);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      })
      .catch(() => {
        localStorage.removeItem(USER_KEY);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { user } = await loginRequest(email, password);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest();
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside an AuthProvider");
  return ctx;
}
