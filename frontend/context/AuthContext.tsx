"use client";
import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { User } from "@/types/user";
import { apiClient, tokenStore } from "@/lib/api-client";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkSession = useCallback(async () => {
    // Only check session if we have a stored token
    const token = tokenStore.get();
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const u = await apiClient.get<User>("/auth/me");
      setUser(u);
    } catch {
      tokenStore.clear();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = async (email: string, password: string) => {
    const data = await apiClient.post<{ user: User; token: string }>("/auth/login", {
      email,
      password,
    });
    // Store token so every subsequent request includes Authorization: Bearer <token>
    tokenStore.set(data.token);
    setUser(data.user);
  };

  const logout = async () => {
    await apiClient.post("/auth/logout", {}).catch(() => {});
    tokenStore.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
