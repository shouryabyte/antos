import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAppStore } from "../store/useAppStore";
import { demoUsers, rolePermissions, type DemoUser, type Permission, type RoleName } from "./permissions";

const LOCAL_KEY = "antos-auth-session";
const SESSION_KEY = "antos-auth-session-tab";

export type AuthProfile = Omit<DemoUser, "password">;
type LoginInput = { email: string; password: string; remember?: boolean };
type AuthContextValue = {
  user: AuthProfile | null;
  profile: AuthProfile | null;
  role: RoleName | null;
  permissions: Permission[];
  employeeId?: string;
  studentId?: string;
  partnerId?: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  loginAsDemo: (role: RoleName) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (role: RoleName | RoleName[]) => boolean;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_KEY) || sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as AuthProfile;
      setProfile(parsed);
      useAppStore.getState().setRole(parsed.role);
    }
    setIsLoading(false);
  }, []);

  const persist = useCallback((next: AuthProfile, remember = true) => {
    const value = JSON.stringify(next);
    localStorage.removeItem(LOCAL_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    if (remember) localStorage.setItem(LOCAL_KEY, value);
    else sessionStorage.setItem(SESSION_KEY, value);
    setProfile(next);
    useAppStore.getState().setRole(next.role);
  }, []);

  const login = useCallback(async ({ email, password, remember = true }: LoginInput) => {
    const match = demoUsers.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!match) throw new Error("Invalid email or password");
    const { password: _password, ...next } = match;
    void _password;
    persist(next, remember);
  }, [persist]);

  const loginAsDemo = useCallback(async (role: RoleName) => {
    const match = demoUsers.find((u) => u.role === role);
    if (!match) throw new Error("Demo user not found");
    const { password: _password, ...next } = match;
    void _password;
    persist(next, true);
  }, [persist]);

  const logout = useCallback(() => {
    localStorage.removeItem(LOCAL_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    setProfile(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const permissions = profile ? rolePermissions[profile.role] : [];
    return {
      user: profile,
      profile,
      role: profile?.role ?? null,
      permissions,
      employeeId: profile?.employeeId,
      studentId: profile?.studentId,
      partnerId: profile?.partnerId,
      isAuthenticated: Boolean(profile),
      isLoading,
      login,
      loginAsDemo,
      logout,
      hasPermission: (permission) => permissions.includes(permission),
      hasRole: (role) => profile ? (Array.isArray(role) ? role.includes(profile.role) : profile.role === role) : false
    };
  }, [profile, isLoading, login, loginAsDemo, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
