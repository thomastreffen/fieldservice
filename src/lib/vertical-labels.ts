/**
 * Default Norwegian labels for domain entities.
 * Used as the baseline; vertical-specific overrides are merged on top.
 *
 * These gradually replace hardcoded strings in domain-labels.ts as pages
 * are updated to use getLabel() from useVertical().
 */
export const DEFAULT_LABELS: Record<string, string> = {
  // Asset / equipment
  asset:              "Varmepumpe",
  assets:             "Varmepumper",
  asset_type:         "Anleggstype",
  manufacturer:       "Produsent",
  new_asset:          "Ny varmepumpe",

  // Service agreements
  service_agreement:  "Serviceavtale",
  service_agreements: "Serviceavtaler",
  new_agreement:      "Ny serviceavtale",

  // Jobs
  job_install:        "Installasjon",
  job_service:        "Service",
  job_repair:         "Reparasjon",
  job_warranty:       "Garanti",
  job_inspection:     "Inspeksjon",

  // CRM
  company:            "Kunde",
  companies:          "Kunder",
  contact:            "Kontakt",
  contacts:           "Kontakter",
  site:               "Anleggssted",
  sites:              "Anleggssteder",
  deal:               "Salgsmulighet",
  deals:              "Salg",
  job:                "Jobb",
  jobs:               "Jobber",

  // Warranty
  warranty:           "Garantisak",
  warranties:         "Garantisaker",
};

/** Merge default labels with vertical-specific overrides. */
export function mergeWithOverrides(
  defaults: Record<string, string>,
  overrides: Record<string, string>
): Record<string, string> {
  return { ...defaults, ...overrides };
}
