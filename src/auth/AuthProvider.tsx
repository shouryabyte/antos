import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { acceptPendingInvitationForUser, generateOnboardingTasks, logAudit } from "../lib/onboardingAutomation";
import { demoUsers, rolePermissions, type DemoUser, type Permission, type RoleName } from "./permissions";

const LOCAL_KEY = "antos-auth-session";
const SESSION_KEY = "antos-auth-session-tab";

export type AuthProfile = {
  id: string;
  email: string;
  name: string;
  fullName: string;
  role: RoleName;
  employeeId?: string;
  studentId?: string;
  partnerId?: string;
  avatarUrl?: string;
  status?: string;
};

type LoginInput = { email: string; password: string; remember?: boolean };
type AuthContextValue = {
  user: User | AuthProfile | null;
  profile: AuthProfile | null;
  role: RoleName | null;
  permissions: Permission[];
  employeeId?: string;
  studentId?: string;
  partnerId?: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  isSupabaseAuth: boolean;
  login: (input: LoginInput) => Promise<void>;
  loginAsDemo: (role: RoleName) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (role: RoleName | RoleName[]) => boolean;
};

type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  role_id: string | null;
  employee_id: string | null;
  student_id: string | null;
  corporate_partner_id: string | null;
  avatar_url: string | null;
  status: string | null;
  roles: { name: string | null } | null;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | AuthProfile | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const applyAuth = useCallback((nextUser: User | AuthProfile | null, nextProfile: AuthProfile | null, nextPermissions: Permission[]) => {
    setUser(nextUser);
    setProfile(nextProfile);
    setPermissions(nextPermissions);
  }, []);

  const loadSupabaseProfile = useCallback(async (authUser: User) => {
    if (!supabase) throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");

    const { data: row, error: profileError } = await supabase
      .from("profiles")
      .select("id,email,full_name,role_id,employee_id,student_id,corporate_partner_id,avatar_url,status,roles(name)")
      .eq("id", authUser.id)
      .single<ProfileRow>();

    if (profileError || !row) {
      const accepted = authUser.email ? await acceptPendingInvitationForUser(authUser.id, authUser.email) : null;
      if (accepted) return loadSupabaseProfile(authUser);
      throw new Error("Your account is authenticated, but no AntOS profile was found. Ask an administrator to seed, invite, or approve your profile.");
    }

    const roleName = row.roles?.name;
    if (!roleName || !isRoleName(roleName)) {
      throw new Error("Your AntOS profile is missing a valid role. Ask an administrator to assign a role.");
    }

    const { data: permissionRows, error: permissionsError } = await supabase
      .from("role_permissions")
      .select("permissions(code)")
      .eq("role_id", row.role_id);

    if (permissionsError) {
      throw new Error("AntOS could not load your role permissions. Please try again or contact an administrator.");
    }

    const dbPermissions = (permissionRows || [])
      .map((item: any) => Array.isArray(item.permissions) ? item.permissions[0]?.code : item.permissions?.code)
      .filter((code: unknown): code is Permission => typeof code === "string");

    if (!dbPermissions.length) {
      throw new Error("Your role has no permissions assigned. Ask an administrator to review role permissions.");
    }

    const nextProfile: AuthProfile = {
      id: row.id,
      email: row.email || authUser.email || "",
      name: row.full_name,
      fullName: row.full_name,
      role: roleName,
      employeeId: row.employee_id || undefined,
      studentId: row.student_id || undefined,
      partnerId: row.corporate_partner_id || undefined,
      avatarUrl: row.avatar_url || undefined,
      status: row.status || undefined
    };

    applyAuth(authUser, nextProfile, dbPermissions);
    if (nextProfile.status === "Pending Profile Completion" || nextProfile.status === "Invited") {
      await generateOnboardingTasks(nextProfile.id, nextProfile.role);
    }
  }, [applyAuth]);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      setIsLoading(true);
      setAuthError(null);

      if (!isSupabaseConfigured || !supabase) {
        const stored = localStorage.getItem(LOCAL_KEY) || sessionStorage.getItem(SESSION_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as AuthProfile;
            if (active) applyAuth(parsed, parsed, rolePermissions[parsed.role] || []);
          } catch {
            localStorage.removeItem(LOCAL_KEY);
            sessionStorage.removeItem(SESSION_KEY);
          }
        }
        if (active) setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      if (error) {
        if (active) setAuthError("Could not restore your Supabase session. Please sign in again.");
      } else if (data.session?.user) {
        try {
          await loadSupabaseProfile(data.session.user);
        } catch (err) {
          if (active) {
            setAuthError(errorMessage(err));
            applyAuth(null, null, []);
          }
        }
      }

      if (active) setIsLoading(false);
    }

    restoreSession();

    if (!isSupabaseConfigured || !supabase) {
      return () => { active = false; };
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (!session?.user) {
        applyAuth(null, null, []);
        setAuthError(null);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      loadSupabaseProfile(session.user)
        .then(() => setAuthError(null))
        .catch((err) => {
          setAuthError(errorMessage(err));
          applyAuth(null, null, []);
        })
        .finally(() => setIsLoading(false));
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [applyAuth, loadSupabaseProfile]);

  const persistDemo = useCallback((next: AuthProfile, remember = true) => {
    const value = JSON.stringify(next);
    localStorage.removeItem(LOCAL_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    if (remember) localStorage.setItem(LOCAL_KEY, value);
    else sessionStorage.setItem(SESSION_KEY, value);
    applyAuth(next, next, rolePermissions[next.role] || []);
  }, [applyAuth]);

  const login = useCallback(async ({ email, password, remember = true }: LoginInput) => {
    setAuthError(null);

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        throw new Error("Invalid email or password. Use a seeded Supabase account and try again.");
      }
      await loadSupabaseProfile(data.user);
      await logAudit(null, "login", "Security", data.user.id, { email });
      return;
    }

    const match = demoUsers.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!match) throw new Error("Invalid demo email or password.");
    const next = demoToProfile(match);
    persistDemo(next, remember);
  }, [loadSupabaseProfile, persistDemo]);

  const loginAsDemo = useCallback(async (role: RoleName) => {
    if (isSupabaseConfigured) {
      throw new Error("Demo bypass is disabled when Supabase Auth is configured.");
    }
    const match = demoUsers.find((u) => u.role === role);
    if (!match) throw new Error("Demo user not found.");
    persistDemo(demoToProfile(match), true);
  }, [persistDemo]);

  const logout = useCallback(async () => {
    const currentProfile = profile;
    localStorage.removeItem(LOCAL_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    if (isSupabaseConfigured && supabase) {
      await logAudit(currentProfile, "logout", "Security", currentProfile?.id, { email: currentProfile?.email });
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error("Could not sign out. Please try again.");
    }
    applyAuth(null, null, []);
  }, [applyAuth, profile]);

  const refreshAuth = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return;
    await loadSupabaseProfile(data.user);
  }, [loadSupabaseProfile]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    profile,
    role: profile?.role ?? null,
    permissions,
    employeeId: profile?.employeeId,
    studentId: profile?.studentId,
    partnerId: profile?.partnerId,
    isAuthenticated: Boolean(profile),
    isLoading,
    authError,
    isSupabaseAuth: isSupabaseConfigured,
    login,
    loginAsDemo,
    logout,
    refreshAuth,
    hasPermission: (permission) => permissions.includes(permission),
    hasRole: (role) => profile ? (Array.isArray(role) ? role.includes(profile.role) : profile.role === role) : false
  }), [user, profile, permissions, isLoading, authError, login, loginAsDemo, logout, refreshAuth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function demoToProfile(user: DemoUser): AuthProfile {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    fullName: user.name,
    role: user.role,
    employeeId: user.employeeId,
    studentId: user.studentId,
    partnerId: user.partnerId
  };
}

function isRoleName(value: string): value is RoleName {
  return [
    "Super Admin",
    "HR Manager",
    "Project Manager",
    "Mentor",
    "Finance Manager",
    "Employee",
    "Intern",
    "Student",
    "Corporate Partner"
  ].includes(value);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "AntOS could not complete authentication. Please try again.";
}
