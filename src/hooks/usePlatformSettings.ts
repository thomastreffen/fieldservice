import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PlatformSettings {
  teams_enabled: boolean;
  teams_webhook_url: string;
  teams_notify_new_ticket: boolean;
  teams_notify_assignment: boolean;
  teams_notify_status_change: boolean;
  devops_enabled: boolean;
  devops_org_url: string;
  devops_project: string;
  devops_pat: string;
  devops_work_item_type: string;
}

function parse(rows: { key: string; value: string | null }[]): PlatformSettings {
  const m: Record<string, string> = {};
  for (const r of rows) if (r.value != null) m[r.key] = r.value;
  return {
    teams_enabled: m.teams_enabled === "true",
    teams_webhook_url: m.teams_webhook_url ?? "",
    teams_notify_new_ticket: m.teams_notify_new_ticket !== "false",
    teams_notify_assignment: m.teams_notify_assignment !== "false",
    teams_notify_status_change: m.teams_notify_status_change !== "false",
    devops_enabled: m.devops_enabled === "true",
    devops_org_url: m.devops_org_url ?? "",
    devops_project: m.devops_project ?? "",
    devops_pat: m.devops_pat ?? "",
    devops_work_item_type: m.devops_work_item_type ?? "User Story",
  };
}

export function usePlatformSettings() {
  return useQuery<PlatformSettings>({
    queryKey: ["platform-settings"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("platform_settings")
        .select("key, value");
      return parse(data ?? []);
    },
  });
}
