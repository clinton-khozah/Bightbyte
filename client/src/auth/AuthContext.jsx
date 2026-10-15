import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, clearToken, setToken } from "../api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  const refreshUser = async () => {
    const data = await api("/api/me");
    setUser(data.user);
    return data.user;
  };

  useEffect(() => {
    api("/api/me")
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    const onFocus = () => {
      api("/api/me")
        .then((data) => setUser(data.user))
        .catch(() => {});
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const value = useMemo(
    () => ({
      user,
      ready,
      refreshUser,
      setUser,
      login: async (email, password) => {
        const data = await api("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        setToken(data.token);
        setUser(data.user);
        return data.user;
      },
      register: async (payload) => {
        const data = await api("/api/auth/register", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (data.pending) return data;
        setToken(data.token);
        setUser(data.user);
        return data.user;
      },
      logout: () => {
        clearToken();
        setUser(null);
      },
    }),
    [user, ready],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
