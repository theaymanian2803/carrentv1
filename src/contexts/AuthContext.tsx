import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { data } from '@/lib/data';
import { onAuthFailure } from '@/lib/authEvents';
import type { AuthUser, AppRole, Profile } from '@/lib/data/types';

interface AuthContextType {
  user: AuthUser | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ user: AuthUser; roles: AppRole[] }>;
  signUp: (input: {
    email: string;
    password: string;
    fullName: string;
    role: 'owner' | 'renter';
  }) => Promise<{ user: AuthUser; roles: AppRole[] }>;
  signOut: () => Promise<void>;
  continueAsGuest: () => Promise<{ user: AuthUser; roles: AppRole[] }>;
  startGoogleSignIn: () => void;
  refresh: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<AuthUser | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const load = useCallback(async () => {
    try {
      const result = await data.auth.me();
      setUser(result.user);
      setProfile(result.profile);
      setRoles(result.roles);
      return result;
    } catch {
      void data.auth.logout();
      setUser(null);
      setProfile(null);
      setRoles([]);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(
    () =>
      onAuthFailure(() => {
        if (!userRef.current) return;
        void data.auth.logout();
        setUser(null);
        setProfile(null);
        setRoles([]);
        queryClient.clear();
      }),
    [queryClient]
  );

  const signIn = async (email: string, password: string) => {
    queryClient.clear();
    const session = await data.auth.login({ email, password });
    setUser(session.user);
    try {
      const result = await data.auth.me();
      setUser(result.user);
      setProfile(result.profile);
      setRoles(result.roles);
      return { user: result.user, roles: result.roles };
    } catch (err) {
      void data.auth.logout();
      setUser(null);
      setProfile(null);
      setRoles([]);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (input: {
    email: string;
    password: string;
    fullName: string;
    role: 'owner' | 'renter';
  }) => {
    queryClient.clear();
    const session = await data.auth.register(input);
    setUser(session.user);
    try {
      const result = await data.auth.me();
      setUser(result.user);
      setProfile(result.profile);
      setRoles(result.roles);
      return { user: result.user, roles: result.roles };
    } catch (err) {
      void data.auth.logout();
      setUser(null);
      setProfile(null);
      setRoles([]);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const continueAsGuest = async () => {
    queryClient.clear();
    const session = await data.auth.guest();
    setUser(session.user);
    try {
      const result = await data.auth.me();
      setUser(result.user);
      setProfile(result.profile);
      setRoles(result.roles);
      return { user: result.user, roles: result.roles };
    } catch (err) {
      void data.auth.logout();
      setUser(null);
      setProfile(null);
      setRoles([]);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const startGoogleSignIn = () => {
    window.location.href = '/api/auth/google';
  };

  const signOut = async () => {
    await data.auth.logout();
    setUser(null);
    setProfile(null);
    setRoles([]);
    queryClient.clear();
  };

  const refresh = async () => {
    await load();
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        roles,
        loading,
        signIn,
        signUp,
        signOut,
        continueAsGuest,
        startGoogleSignIn,
        refresh,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
