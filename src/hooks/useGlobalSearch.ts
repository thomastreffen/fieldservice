import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type SearchCategory = "companies" | "contacts" | "jobs" | "agreements" | "deals" | "assets";

export interface SearchResult {
  id: string;
  category: SearchCategory;
  primary: string;
  secondary?: string;
  link: string;
}

export interface SearchResults {
  companies: SearchResult[];
  contacts: SearchResult[];
  jobs: SearchResult[];
  agreements: SearchResult[];
  deals: SearchResult[];
  assets: SearchResult[];
}

const EMPTY: SearchResults = {
  companies: [], contacts: [], jobs: [], agreements: [], deals: [], assets: [],
};

export function useGlobalSearch(query: string) {
  const { tenantId } = useAuth();
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || !tenantId) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }

    setLoading(true);
    let cancelled = false;
    const pattern = `%${q}%`;

    const timer = setTimeout(async () => {
      const [
        { data: companies },
        { data: contacts },
        { data: jobs },
        { data: agreements },
        { data: deals },
        { data: assets },
      ] = await Promise.all([
        supabase.from("crm_companies")
          .select("id, name, city, org_number")
          .eq("tenant_id", tenantId)
          .is("deleted_at", null)
          .or(`name.ilike.${pattern},org_number.ilike.${pattern},city.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`)
          .limit(5),
        supabase.from("crm_contacts")
          .select("id, first_name, last_name, email, title")
          .eq("tenant_id", tenantId)
          .is("deleted_at", null)
          .or(`first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern},mobile.ilike.${pattern}`)
          .limit(5),
        supabase.from("jobs")
          .select("id, job_number, title, job_type")
          .eq("tenant_id", tenantId)
          .is("deleted_at", null)
          .or(`job_number.ilike.${pattern},title.ilike.${pattern}`)
          .limit(5),
        supabase.from("service_agreements")
          .select("id, agreement_number, status")
          .eq("tenant_id", tenantId)
          .is("deleted_at", null)
          .ilike("agreement_number", pattern)
          .limit(5),
        supabase.from("crm_deals")
          .select("id, title, stage")
          .eq("tenant_id", tenantId)
          .ilike("title", pattern)
          .limit(5),
        supabase.from("hvac_assets")
          .select("id, manufacturer, model, serial_number")
          .eq("tenant_id", tenantId)
          .is("deleted_at", null)
          .or(`manufacturer.ilike.${pattern},model.ilike.${pattern},serial_number.ilike.${pattern}`)
          .limit(5),
      ]);

      if (cancelled) return;

      const JOB_TYPE: Record<string, string> = {
        installation: "Installasjon", service: "Service", repair: "Reparasjon",
        warranty: "Garanti", inspection: "Inspeksjon", decommission: "Demontering",
      };
      const DEAL_STAGE: Record<string, string> = {
        lead: "Ny lead", qualified: "Kvalifisert", quote_sent: "Tilbud sendt",
        site_visit: "Befaring", negotiation: "Forhandling", won: "Vunnet", lost: "Tapt",
      };
      const AGREE_STATUS: Record<string, string> = {
        active: "Aktiv", paused: "Pauset", expired: "Utløpt", cancelled: "Kansellert",
      };

      setResults({
        companies: (companies ?? []).map(c => ({
          id: c.id,
          category: "companies",
          primary: c.name,
          secondary: c.city ?? c.org_number ?? undefined,
          link: `/tenant/crm/companies/${c.id}`,
        })),
        contacts: (contacts ?? []).map(c => ({
          id: c.id,
          category: "contacts",
          primary: [c.first_name, c.last_name].filter(Boolean).join(" "),
          secondary: c.title ?? c.email ?? undefined,
          link: `/tenant/crm/contacts/${c.id}`,
        })),
        jobs: (jobs ?? []).map(j => ({
          id: j.id,
          category: "jobs",
          primary: `${j.job_number} ${j.title}`,
          secondary: j.job_type ? JOB_TYPE[j.job_type] ?? j.job_type : undefined,
          link: `/tenant/crm/jobs/${j.id}`,
        })),
        agreements: (agreements ?? []).map(a => ({
          id: a.id,
          category: "agreements",
          primary: a.agreement_number,
          secondary: a.status ? AGREE_STATUS[a.status] ?? a.status : undefined,
          link: `/tenant/crm/agreements/${a.id}`,
        })),
        deals: (deals ?? []).map(d => ({
          id: d.id,
          category: "deals",
          primary: d.title,
          secondary: d.stage ? DEAL_STAGE[d.stage] ?? d.stage : undefined,
          link: `/tenant/crm/deals/${d.id}`,
        })),
        assets: (assets ?? []).map(a => ({
          id: a.id,
          category: "assets",
          primary: [a.manufacturer, a.model].filter(Boolean).join(" ") || "Anlegg",
          secondary: a.serial_number ?? undefined,
          link: `/tenant/crm/assets/${a.id}`,
        })),
      });
      setLoading(false);
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, tenantId]);

  return { results, loading };
}
