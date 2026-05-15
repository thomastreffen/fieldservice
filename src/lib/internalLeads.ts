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
}) {
  try {
    const svc = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: tenant } = await svc
      .from("tenants")
      .select("id")
      .eq("slug", "fieldservice-internt")
      .single();

    if (!tenant) return;

    const parts = opts.name.trim().split(" ");
    const firstName = parts[0] ?? "";
    const lastName = parts.slice(1).join(" ");

    await svc.from("crm_contacts").insert({
      tenant_id: tenant.id,
      first_name: firstName,
      last_name: lastName,
      email: opts.email,
      title: opts.company ?? null,
      notes: opts.notes ?? null,
      deal_stage: "Ny lead",
      source: opts.source,
      vertical_slug: opts.verticalSlug ?? null,
    });
  } catch {
    // Silent — never block the main user flow
  }
}
