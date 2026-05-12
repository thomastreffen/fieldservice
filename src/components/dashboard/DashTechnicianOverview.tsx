import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isToday } from "date-fns";
import { cn } from "@/lib/utils";

interface TechStatus {
  id: string;
  name: string;
  color: string | null;
  hasJobToday: boolean;
}

export default function DashTechnicianOverview() {
  const { tenantId } = useAuth();
  const [techs, setTechs] = useState<TechStatus[]>([]);

  useEffect(() => {
    if (!tenantId) return;
    const load = async () => {
      const { data: allTechs } = await supabase
        .from("technicians")
        .select("id, name, color")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("name");

      if (!allTechs?.length) return;

      const todayStr = new Date().toISOString().slice(0, 10);
      const { data: todayJobs } = await supabase
        .from("jobs")
        .select("id, job_technicians(technician_id)")
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .gte("scheduled_start", todayStr + "T00:00:00")
        .lte("scheduled_start", todayStr + "T23:59:59");

      const busyIds = new Set<string>();
      todayJobs?.forEach((j: any) => {
        j.job_technicians?.forEach((jt: any) => busyIds.add(jt.technician_id));
      });

      setTechs(allTechs.map(t => ({ ...t, hasJobToday: busyIds.has(t.id) })));
    };
    load();
  }, [tenantId]);

  if (!techs.length) return null;

  const working = techs.filter(t => t.hasJobToday);
  const free = techs.filter(t => !t.hasJobToday);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
        Teknikere i dag
      </p>
      <div className="flex flex-wrap gap-2">
        {working.map(t => (
          <TechChip key={t.id} tech={t} active />
        ))}
        {free.map(t => (
          <TechChip key={t.id} tech={t} active={false} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        {working.length} på jobb · {free.length} ledig
      </p>
    </div>
  );
}

function TechChip({ tech, active }: { tech: TechStatus; active: boolean }) {
  const initials = tech.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-opacity", active ? "opacity-100" : "opacity-40")}>
      <span
        className="h-2 w-2 rounded-full shrink-0"
        style={{ backgroundColor: tech.color ?? "#6b7280" }}
      />
      <span className={active ? "text-foreground" : "text-muted-foreground"}>{tech.name}</span>
    </div>
  );
}
