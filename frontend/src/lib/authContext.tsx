"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any; data: any }>;
  signUp: (email: string, password: string, fullName: string, roleCode?: string) => Promise<{ error: any; data: any }>;
  signOut: () => Promise<void>;
  updateUserProfile: (data: {
    fullName?: string;
    roleCode?: string;
    timezone?: string;
    password?: string;
  }) => Promise<{ error: any }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signIn: async () => ({ error: null, data: null }),
  signUp: async () => ({ error: null, data: null }),
  signOut: async () => {},
  updateUserProfile: async () => ({ error: null }),
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Limpieza de hash de token de acceso en la barra de URL
  const cleanUrlHash = () => {
    if (typeof window !== "undefined" && window.location.hash && window.location.hash.includes("access_token")) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  };

  useEffect(() => {
    // 1. Obtener sesión activa al cargar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      cleanUrlHash();
    });

    // 2. Escuchar cambios de autenticación en tiempo real
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      cleanUrlHash();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const result = await supabase.auth.signInWithPassword({ email, password });
    if (result.data?.session) {
      setSession(result.data.session);
      setUser(result.data.user);
    }
    setLoading(false);
    cleanUrlHash();
    return result;
  };

  const signUp = async (email: string, password: string, fullName: string, roleCode: string = "trader") => {
    setLoading(true);
    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role_code: roleCode,
          timezone: "America/New_York",
        },
      },
    });

    if (result.data?.session) {
      setSession(result.data.session);
      setUser(result.data.user);
    }
    setLoading(false);
    cleanUrlHash();
    return result;
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setLoading(false);
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  const refreshUser = async () => {
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      setUser(data.user);
    }
  };

  const updateUserProfile = async (data: {
    fullName?: string;
    roleCode?: string;
    timezone?: string;
    password?: string;
  }) => {
    try {
      const updateData: any = {};
      const metaData: any = { ...user?.user_metadata };

      if (data.fullName !== undefined) {
        metaData.full_name = data.fullName;
      }
      if (data.roleCode !== undefined) {
        metaData.role_code = data.roleCode;
      }
      if (data.timezone !== undefined) {
        metaData.timezone = data.timezone;
      }

      updateData.data = metaData;

      if (data.password && data.password.trim().length >= 6) {
        updateData.password = data.password.trim();
      }

      const { data: updated, error } = await supabase.auth.updateUser(updateData);
      if (error) {
        return { error };
      }

      if (updated?.user) {
        setUser(updated.user);
      }

      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        updateUserProfile,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
