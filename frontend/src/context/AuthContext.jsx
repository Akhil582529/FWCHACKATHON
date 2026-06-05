import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { authAPI, saveToken, clearToken, getToken } from "../services/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from token on page load
  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }

    authAPI.getMe()
      .then((data) => setUser(data.user ?? data))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  // Called by LoginForm after successful login/register
  const handleLoginSuccess = useCallback((token, userData) => {
    saveToken(token);
    setUser(userData);   // ← triggers AppRouter to redirect to dashboard
  }, []);

  const handleLogout = useCallback(async () => {
    try { await authAPI.logout(); } catch {}
    clearToken();
    setUser(null);       // ← triggers AppRouter to show LoginPage fresh
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, handleLoginSuccess, handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);