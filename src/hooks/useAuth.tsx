import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type AppRole = "master_admin" | "tenant_admin" | "user";

const TENANT_OVERRIDE_KEY = "admin_tenant_override";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  tenantId: string | null;
  isMasterAdmin: boolean;
  isTenantAdmin: boolean;
  isImpersonating: boolean;
  isPasswordRecovery: boolean;
  clearPasswordRecovery: () => void;
  setTenantOverride: (id: string) => void;
  clearTenantOverride: () => void;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [profileTenantId, setProfileTenantId] = useState<string | null>(null);
  const [overrideTenantId, setOverrideTenantId] = useState<string | null>(
    () => localStorage.getItem(TENANT_OVERRIDE_KEY)
  );
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(() => {
    const hash = window.location.hash;
    return hash.includes("type=recovery") || hash.includes("type=magiclink");
  });

  const tenantId = overrideTenantId ?? profileTenantId;

  const fetchUserMeta = async (userId: string) => {
    try {
      const [rolesResult, profileResult] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("profiles").select("tenant_id").eq("user_id", userId).single(),
      ]);
      if (rolesResult.data) {
        setRoles(rolesResult.data.map((r) => r.role as AppRole));
      }
      if (profileResult.data) {
        setProfileTenantId(profileResult.data.tenant_id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let initialLoad = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (event === "PASSWORD_RECOVERY") {
          setIsPasswordRecovery(true);
        }
        if (session?.user) {
          if (!initialLoad) {
            setLoading(true);
          }
          setTimeout(() => fetchUserMeta(session.user.id), 0);
        } else {
          setRoles([]);
          setProfileTenantId(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      initialLoad = false;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserMeta(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const clearPasswordRecovery = () => setIsPasswordRecovery(false);

  const setTenantOverride = (id: string) => {
    localStorage.setItem(TENANT_OVERRIDE_KEY, id);
    setOverrideTenantId(id);
  };

  const clearTenantOverride = () => {
    localStorage.removeItem(TENANT_OVERRIDE_KEY);
    setOverrideTenantId(null);
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    clearTenantOverride();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        roles,
        tenantId,
        isMasterAdmin: roles.includes("master_admin"),
        isTenantAdmin: roles.includes("tenant_admin"),
        isImpersonating: overrideTenantId !== null,
        isPasswordRecovery,
        clearPasswordRecovery,
        setTenantOverride,
        clearTenantOverride,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
