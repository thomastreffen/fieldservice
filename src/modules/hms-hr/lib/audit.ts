import { supabase } from "@/integrations/supabase/client"

interface HmsAuditParams {
  tenant_id: string
  action: string
  entity_type?: string
  entity_id?: string
  payload?: unknown
}

export async function logHmsAudit(params: HmsAuditParams) {
  const { data: { user } } = await supabase.auth.getUser()
  const sb = supabase as any
  await sb.from("hms_audit_log").insert({
    tenant_id: params.tenant_id,
    user_id: user?.id ?? null,
    action: params.action,
    entity_type: params.entity_type ?? null,
    entity_id: params.entity_id ?? null,
    payload: params.payload ?? null,
  })
}
