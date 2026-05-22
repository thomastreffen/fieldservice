// ─────────────────────────────────────────────────────────────────────────────
// HMS & HR — shared TypeScript types
// All company_id references from MCS Ressurs have been replaced with tenant_id.
// ─────────────────────────────────────────────────────────────────────────────

export type HmsIncidentSeverity = 'low' | 'medium' | 'high' | 'critical'
export type HmsIncidentStatus = 'open' | 'in_progress' | 'action_pending' | 'closed' | 'rejected'
export type HmsIncidentType =
  | 'hms'
  | 'near_miss'
  | 'personal_injury'
  | 'material_damage'
  | 'quality'
  | 'environment'
  | 'observation'

export interface HmsIncident {
  id: string
  tenant_id: string
  title: string
  description?: string | null
  severity: HmsIncidentSeverity
  status: HmsIncidentStatus
  incident_type: HmsIncidentType
  location?: string | null
  occurred_at?: string | null
  created_at: string
  reported_by?: string | null
  project_id?: string | null
  assigned_to?: string | null
  due_date?: string | null
  attachments: unknown[]
  deleted_at?: string | null
}

export interface HmsActionItem {
  id: string
  tenant_id: string
  incident_id?: string | null
  title: string
  due_date?: string | null
  priority?: string | null
  status: string
  created_at: string
  deleted_at?: string | null
}

export interface HmsAuditLogEntry {
  id: string
  tenant_id: string
  user_id?: string | null
  action: string
  entity_type?: string | null
  entity_id?: string | null
  payload?: unknown
  created_at: string
}

export type WorktimeAlertSeverity = 'warning' | 'critical'
export type WorktimeAlertStatus = 'open' | 'acknowledged' | 'resolved'

export interface WorktimeEntry {
  id: string
  tenant_id: string
  user_id?: string | null
  work_date: string
  ordinary_hours?: number | null
  hours_overtime?: number | null
  total_hours?: number | null
  break_minutes?: number | null
  activity?: string | null
  adjustment_reason?: string | null
  manually_adjusted: boolean
  created_manually: boolean
  source_system?: string | null
  source_hash?: string | null
  status: string
  employee_name?: string | null
  external_employee_id?: string | null
  raw_payload?: unknown
  created_at: string
}

export interface WorktimeAlert {
  id: string
  tenant_id: string
  user_id?: string | null
  severity: WorktimeAlertSeverity
  status: WorktimeAlertStatus
  rule_key?: string | null
  title?: string | null
  explanation?: string | null
  why?: string | null
  period_start?: string | null
  period_end?: string | null
  value?: number | null
  threshold?: number | null
  recommended_action?: string | null
  created_at: string
  updated_at: string
}

export type OvertimeApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface OvertimeApproval {
  id: string
  tenant_id: string
  user_id?: string | null
  period_start?: string | null
  period_end?: string | null
  approved_hours?: number | null
  status: OvertimeApprovalStatus
  reason_type?: string | null
  approved_by?: string | null
  approved_at?: string | null
  rejection_reason?: string | null
  created_at: string
}

export interface WorktimeRules {
  max_daily_hours?: number
  max_weekly_hours?: number
  max_daily_overtime?: number
  max_weekly_overtime_7d?: number
  max_weekly_overtime_28d?: number
  max_weekly_overtime_52d?: number
  min_rest_hours_daily?: number
  min_rest_hours_weekly?: number
  warn_daily_hours?: number
  warn_weekly_hours?: number
  critical_daily_hours?: number
  critical_weekly_hours?: number
  require_overtime_approval?: boolean
}

export interface WorktimeRuleset {
  id: string
  tenant_id: string
  name: string
  description?: string | null
  is_default: boolean
  rules: WorktimeRules
  version: number
  active_from?: string | null
  active_to?: string | null
  created_at: string
  updated_at: string
}

export interface WorktimeImportBatch {
  id: string
  tenant_id: string
  filename?: string | null
  status?: string | null
  total_rows?: number | null
  new_rows?: number | null
  updated_rows?: number | null
  skipped_rows?: number | null
  source_system?: string | null
  created_at: string
  finished_at?: string | null
}

export interface EmployeeWorkProfile {
  id: string
  tenant_id: string
  user_id: string
  external_employee_id?: string | null
  is_active: boolean
  created_at: string
}

export interface EmployeeProfileLookup {
  user_id: string
  external_employee_id?: string | null
  full_name?: string | null
  email?: string | null
  avatar_url?: string | null
}

export type HmsTemplateKind = 'sja' | 'checklist'
export type HmsTemplateItemType =
  | 'yes_no_na'
  | 'text'
  | 'long_text'
  | 'attachment'
  | 'risk'
  | 'mitigation'
  | 'signature'
  | 'responsible'
  | 'due_date'

export interface HmsTemplate {
  id: string
  tenant_id: string
  name: string
  kind: HmsTemplateKind
  description?: string | null
  category?: string | null
  is_active: boolean
  suggested_work_types: string[]
  current_version_id?: string | null
  created_at: string
  updated_at: string
}

export interface HmsTemplateSection {
  id: string
  template_id: string
  title: string
  description?: string | null
  ordering: number
  items?: HmsTemplateItem[]
}

export interface HmsTemplateItem {
  id: string
  template_id: string
  section_id: string
  ordering: number
  item_type: HmsTemplateItemType
  label: string
  help_text?: string | null
  is_required: boolean
}

export type HmsSubmissionStatus = 'draft' | 'submitted' | 'approved' | 'rejected'

export interface HmsSubmission {
  id: string
  tenant_id: string
  title?: string | null
  kind?: string | null
  status: HmsSubmissionStatus
  submitted_at?: string | null
  rejection_reason?: string | null
  created_at: string
  updated_at: string
  deleted_at?: string | null
  template_version?: unknown
}

export interface HmsSubmissionAnswer {
  id: string
  submission_id: string
  section_id?: string | null
  item_id?: string | null
  value?: string | null
  attachment_urls: string[]
}

export interface HmsSubmissionParticipant {
  id: string
  submission_id: string
  user_id?: string | null
  signed_at?: string | null
  signature_image?: string | null
}

export type HmsHandbookVersionStatus = 'draft' | 'published'

export interface HmsHandbook {
  id: string
  tenant_id: string
  title: string
  description?: string | null
  kind?: string | null
  current_version_id?: string | null
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export interface HmsHandbookVersion {
  id: string
  handbook_id: string
  version: number
  status: HmsHandbookVersionStatus
  changelog?: string | null
  acknowledgement_required: boolean
  created_at: string
}

export interface HmsHandbookSection {
  id: string
  handbook_id: string
  version_id?: string | null
  heading?: string | null
  body?: string | null
  ordering: number
}

export interface HmsHandbookAcknowledgement {
  id: string
  user_id: string
  handbook_id: string
  version_id?: string | null
  acknowledged_at: string
  user_agent?: string | null
}

export interface HmsAreaCatalogEntry {
  area_key: string
  label: string
  description?: string | null
  category?: string | null
  legal_reference?: string | null
  sort_order?: number | null
  is_active: boolean
}
