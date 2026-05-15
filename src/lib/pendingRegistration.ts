import { supabase } from "@/integrations/supabase/client";
import { createInternalLead } from "@/lib/internalLeads";

const KEY = "pending_trial_registration";

export interface PendingRegistration {
  companyName: string;
  slug: string;
  verticalId: string;
  contactName: string;
  email: string;
  defaultModules: string[];
  verticalSlug: string;
}

export function savePendingRegistration(data: PendingRegistration) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

/**
 * Called once the user has a session (after email confirmation or immediate sign-in).
 * Reads stored registration data, calls register_trial_tenant, and clears the entry.
 * Returns true if registration was completed so the caller can redirect.
 */
export async function completePendingRegistration(): Promise<boolean> {
  const raw = localStorage.getItem(KEY);
  if (!raw) return false;

  localStorage.removeItem(KEY);

  let pending: PendingRegistration;
  try {
    pending = JSON.parse(raw);
  } catch {
    return false;
  }

  const { data: tenantId, error } = await (supabase as any).rpc("register_trial_tenant", {
    p_company_name: pending.companyName,
    p_slug: pending.slug,
    p_vertical_id: pending.verticalId,
    p_contact_name: pending.contactName,
    p_email: pending.email,
    p_default_modules: pending.defaultModules,
  });

  if (error) {
    console.error("Failed to complete pending registration:", error);
    return false;
  }

  createInternalLead({
    name: pending.contactName,
    email: pending.email,
    company: pending.companyName,
    source: "trial",
    verticalSlug: pending.verticalSlug,
    tenantId: tenantId as string,
  });

  sessionStorage.setItem("trial_welcome", "1");
  return true;
}
