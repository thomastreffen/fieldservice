import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ActivityEntry {
  id: string;
  type: string;
  action: string;
  title: string | null;
  description: string | null;
  performed_by: string | null;
  performer_name: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function useActivityLog(entityType: string, entityId: string | undefined) {
  const { tenantId, user } = useAuth();
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchActivities = useCallback(async () => {
    if (!entityId || !tenantId) return;
    setLoading(true);
    try {
      const { data } = await (supabase as any)
        .from("activity_log")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (!data) { setActivities([]); return; }

      const performerIds = [...new Set((data as any[]).map((a: any) => a.performed_by).filter(Boolean))];
      let nameMap = new Map<string, string>();
      if (performerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", performerIds);
        nameMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name || "Ukjent"]));
      }

      setActivities(
        (data as any[]).map((a: any) => ({
          id: a.id,
          type: a.type ?? "note",
          action: a.action,
          title: a.title ?? null,
          description: a.description ?? null,
          performed_by: a.performed_by ?? null,
          performer_name: a.performed_by ? (nameMap.get(a.performed_by) ?? "Ukjent") : null,
          metadata: (a.metadata as Record<string, unknown>) ?? {},
          created_at: a.created_at,
        }))
      );
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, tenantId]);

  const logActivity = useCallback(
    async (params: {
      type: string;
      action: string;
      title?: string;
      description: string;
      metadata?: Record<string, unknown>;
    }) => {
      if (!entityId || !tenantId) return;
      await (supabase as any).from("activity_log").insert({
        tenant_id: tenantId,
        entity_type: entityType,
        entity_id: entityId,
        type: params.type,
        action: params.action,
        title: params.title ?? null,
        description: params.description,
        performed_by: user?.id ?? null,
        metadata: params.metadata ?? {},
      });
    },
    [entityType, entityId, tenantId, user]
  );

  return { activities, loading, fetchActivities, logActivity };
}
