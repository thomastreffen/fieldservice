// Quality score engine for order form submissions
// Uses dynamic field analysis instead of hardcoded field keys

export type QualityLevel = "green" | "yellow" | "red";

export interface QualityIssue {
  severity: "warning" | "error";
  message: string;
  field_key?: string;
}

export interface QualityResult {
  score: QualityLevel;
  issues: QualityIssue[];
}

const QUALITY_LABELS: Record<QualityLevel, { label: string; color: string; dotClass: string }> = {
  green: { label: "Komplett", color: "bg-green-100 text-green-800", dotClass: "bg-green-500" },
  yellow: { label: "Trenger oppfølging", color: "bg-amber-100 text-amber-800", dotClass: "bg-amber-500" },
  red: { label: "Mangler å avklare", color: "bg-orange-100 text-orange-800", dotClass: "bg-orange-500" },
};

export { QUALITY_LABELS };

interface FieldDescriptor {
  field_key: string;
  label: string;
  field_type: string;
  is_required: boolean;
}

export function computeQualityScore(
  values: Record<string, any>,
  attachments: { category?: string; file_name?: string }[] = [],
  templateFields?: FieldDescriptor[]
): QualityResult {
  const issues: QualityIssue[] = [];

  if (templateFields && templateFields.length > 0) {
    for (const field of templateFields) {
      if (!field.is_required) continue;
      const val = values[field.field_key];
      if (val == null || val === "" || (Array.isArray(val) && val.length === 0)) {
        issues.push({
          severity: "error",
          message: `${field.label} mangler`,
          field_key: field.field_key,
        });
      }
    }
  } else {
    const fieldKeys = Object.keys(values);
    const hasCustomerInfo = fieldKeys.some(k =>
      k.startsWith("firmanavn") || k.startsWith("kundenavn") || k.startsWith("kunde_")
    );
    if (!hasCustomerInfo && fieldKeys.length > 0) {
      const hasAnyFilledField = fieldKeys.some(k => {
        const v = values[k];
        return v != null && v !== "";
      });
      if (!hasAnyFilledField) {
        issues.push({ severity: "warning", message: "Ingen felt er utfylt" });
      }
    }
  }

  if (templateFields) {
    const fileFields = templateFields.filter(f =>
      f.field_type === "file_upload" || f.field_type === "image_upload"
    );
    for (const ff of fileFields) {
      if (!ff.is_required) continue;
      const hasAttachment = attachments.some(a => a.file_name || a.category);
      if (!hasAttachment) {
        issues.push({
          severity: "warning",
          message: `${ff.label} mangler`,
          field_key: ff.field_key,
        });
      }
    }
  }

  const errorCount = issues.filter(i => i.severity === "error").length;
  const warningCount = issues.filter(i => i.severity === "warning").length;

  let score: QualityLevel = "green";
  if (errorCount >= 2) score = "red";
  else if (errorCount >= 1) score = "yellow";
  else if (warningCount >= 3) score = "yellow";

  return { score, issues };
}

export const MISSING_INFO_OPTIONS = [
  "Mangler tegninger",
  "Mangler bilder",
  "Mangler materialliste",
  "Mangler PO/referanse",
  "Mangler kundeinformasjon",
  "Mangler fakturainformasjon",
  "Mangler beskrivelse av materialansvar",
  "Mangler informasjon om adgang / utkobling / HMS",
] as const;
