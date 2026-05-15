import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string;

export async function createInternalLead(opts: {
  name: string;
  email: string;
  company?: string;
  source: "kontaktskjema" | "trial";
  verticalSlug?: string;
  notes?: string;
  tenantId?: string;
}) {
  try {
    const svc = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let verticalId: string | null = null;
    if (opts.verticalSlug) {
      const { data: v } = await svc
        .from("verticals")
        .select("id")
        .eq("slug", opts.verticalSlug)
        .single();
      verticalId = v?.id ?? null;
    }

    await svc.from("platform_contacts").insert({
      name: opts.name,
      email: opts.email,
      company: opts.company ?? null,
      source: opts.source,
      vertical_id: verticalId,
      notes: opts.notes ?? null,
      tenant_id: opts.tenantId ?? null,
      deal_stage: "Ny lead",
    });
  } catch {
    // Silent — never block the main user flow
  }
}
