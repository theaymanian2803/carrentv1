import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { data } from '@/lib/data';
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
  refresh: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!data.auth.getToken()) {
      setUser(null);
      setProfile(null);
      setRoles([]);
      setLoading(false);
      return null;
    }

    try {
      const result = await data.auth.me();
      setUser(result.user);
      setProfile(result.profile);
      setRoles(result.roles);
      return result;
    } catch {
      data.auth.logout();
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

  const signIn = async (email: string, password: string) => {
    const session = await data.auth.login({ email, password });
    setUser(session.user);
    try {
      const result = await data.auth.me();
      setUser(result.user);
      setProfile(result.profile);
      setRoles(result.roles);
      return { user: result.user, roles: result.roles };
    } catch (err) {
      data.auth.logout();
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
    const session = await data.auth.register(input);
    setUser(session.user);
    try {
      const result = await data.auth.me();
      setUser(result.user);
      setProfile(result.profile);
      setRoles(result.roles);
      return { user: result.user, roles: result.roles };
    } catch (err) {
      data.auth.logout();
      setUser(null);
      setProfile(null);
      setRoles([]);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    data.auth.logout();
    setUser(null);
    setProfile(null);
    setRoles([]);
  };

  const refresh = async () => {
    await load();
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  return (
    <AuthContext.Provider
      value={{ user, profile, roles, loading, signIn, signUp, signOut, refresh, hasRole }}
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
