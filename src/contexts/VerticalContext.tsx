import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DEFAULT_LABELS, mergeWithOverrides } from "@/lib/vertical-labels";

interface Vertical {
  id: string;
  slug: string;
  display_name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  is_active: boolean;
  default_modules: string[];
  config: Record<string, unknown>;
}

interface VerticalModule {
  id: string;
  vertical_id: string;
  module_slug: string;
  enabled_by_default: boolean;
  label_overrides: Record<string, string>;
  field_config: Record<string, unknown>;
}

interface VerticalContextValue {
  vertical: Vertical | null;
  verticalModules: VerticalModule[];
  loading: boolean;
  /** Returns the vertical-specific label for a domain key, falls back to DEFAULT_LABELS */
  getLabel: (key: string) => string;
  /** True if the module is enabled for this vertical (permissive: unknown modules return true) */
  hasVerticalModule: (moduleSlug: string) => boolean;
}

const VerticalContext = createContext<VerticalContextValue>({
  vertical: null,
  verticalModules: [],
  loading: true,
  getLabel: (key) => DEFAULT_LABELS[key] ?? key,
  hasVerticalModule: () => true,
});

export function useVerticalContext() {
  return useContext(VerticalContext);
}

export function VerticalProvider({ children }: { children: ReactNode }) {
  const { tenantId } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["tenant-vertical", tenantId],
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 min
    queryFn: async () => {
      // Get tenant's vertical_id
      const { data: tenant } = await (supabase as any)
        .from("tenants")
        .select("vertical_id")
        .eq("id", tenantId)
        .single();

      if (!tenant?.vertical_id) return null;

      const [verticalRes, modulesRes] = await Promise.all([
        (supabase as any)
          .from("verticals")
          .select("*")
          .eq("id", tenant.vertical_id)
          .single(),
        (supabase as any)
          .from("vertical_modules")
          .select("*")
          .eq("vertical_id", tenant.vertical_id),
      ]);

      return {
        vertical: (verticalRes.data as Vertical) ?? null,
        modules: (modulesRes.data as VerticalModule[]) ?? [],
      };
    },
  });

  const mergedLabels = useMemo(() => {
    if (!data?.modules?.length) return DEFAULT_LABELS;
    const overrides = data.modules.reduce<Record<string, string>>((acc, m) => ({
      ...acc,
      ...(m.label_overrides ?? {}),
    }), {});
    return mergeWithOverrides(DEFAULT_LABELS, overrides);
  }, [data]);

  const value = useMemo<VerticalContextValue>(() => ({
    vertical: data?.vertical ?? null,
    verticalModules: data?.modules ?? [],
    loading: isLoading,
    getLabel: (key: string) => mergedLabels[key] ?? DEFAULT_LABELS[key] ?? key,
    hasVerticalModule: (slug: string) => {
      if (!data?.modules?.length) return true;
      const mod = data.modules.find((m) => m.module_slug === slug);
      return mod ? mod.enabled_by_default : true;
    },
  }), [data, isLoading, mergedLabels]);

  return (
    <VerticalContext.Provider value={value}>
      {children}
    </VerticalContext.Provider>
  );
}
