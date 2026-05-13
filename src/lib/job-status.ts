/**
 * Structured job status definitions with labels, colors, dot/border classes,
 * and role-based transition rules.
 *
 * Drop-in replacement for JOB_STATUS_LABELS / JOB_STATUS_COLORS in domain-labels.ts.
 * Existing code can keep using those; new code can use JOB_STATUS_CONFIG directly.
 */

export type JobStatus =
  | "planned"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "on_hold";

export interface StatusConfig {
  label: string;
  /** Full badge class (bg + text) */
  className: string;
  /** Left-border accent class for calendar blocks / list rows */
  borderClass: string;
  /** Small dot class */
  dotClass: string;
  /** Icon hint for compact display */
  iconHint: "calendar" | "clock" | "play" | "check-circle" | "x" | "pause";
}

export const JOB_STATUS_CONFIG: Record<JobStatus, StatusConfig> = {
  planned: {
    label: "Planlagt",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    borderClass: "border-l-blue-500",
    dotClass: "bg-blue-500",
    iconHint: "calendar",
  },
  scheduled: {
    label: "Planlagt tid",
    className: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    borderClass: "border-l-indigo-500",
    dotClass: "bg-indigo-500",
    iconHint: "clock",
  },
  in_progress: {
    label: "Under arbeid",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    borderClass: "border-l-amber-500",
    dotClass: "bg-amber-500",
    iconHint: "play",
  },
  completed: {
    label: "Fullført",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    borderClass: "border-l-emerald-500",
    dotClass: "bg-emerald-500",
    iconHint: "check-circle",
  },
  cancelled: {
    label: "Kansellert",
    className: "bg-muted text-muted-foreground",
    borderClass: "border-l-muted-foreground/30",
    dotClass: "bg-muted-foreground/40",
    iconHint: "x",
  },
  on_hold: {
    label: "På vent",
    className: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    borderClass: "border-l-orange-500",
    dotClass: "bg-orange-500",
    iconHint: "pause",
  },
};

export const ALL_JOB_STATUSES: JobStatus[] = [
  "planned",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
  "on_hold",
];

/** Statuses a technician (montør) can set themselves */
const TECHNICIAN_ALLOWED: JobStatus[] = ["in_progress", "completed"];

/** Check if a role can transition a job to the given status */
export function canSetJobStatus(
  role: "master_admin" | "tenant_admin" | "user" | "technician" | string,
  targetStatus: JobStatus
): boolean {
  if (role === "master_admin" || role === "tenant_admin") return true;
  if (role === "technician") return TECHNICIAN_ALLOWED.includes(targetStatus);
  return false;
}

/** Convenience: get label for a status string (falls back gracefully) */
export function getJobStatusLabel(status: string): string {
  return JOB_STATUS_CONFIG[status as JobStatus]?.label ?? status;
}

/** Convenience: get badge className for a status string */
export function getJobStatusClass(status: string): string {
  return JOB_STATUS_CONFIG[status as JobStatus]?.className ?? "bg-muted text-muted-foreground";
}
