import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AdminUser {
  id: string;
  email: string | null;
  full_name: string | null;
}

// Two-step query: user_roles → profiles via shared user_id.
// PostgREST can't resolve this indirect FK chain automatically, so we do it manually.
export function useAdminUsers() {
  return useQuery<AdminUser[]>({
    queryKey: ["admin-users-list"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: roles } = await (supabase as any)
        .from("user_roles")
        .select("user_id")
        .eq("role", "master_admin");
      const userIds: string[] = (roles ?? []).map((r: any) => r.user_id);
      if (!userIds.length) return [];
      const { data: profiles } = await (supabase as any)
        .from("profiles")
        .select("user_id, email, full_name")
        .in("user_id", userIds);
      return (profiles ?? []).map((p: any) => ({
        id: p.user_id,
        email: p.email ?? null,
        full_name: p.full_name ?? null,
      }));
    },
  });
}
