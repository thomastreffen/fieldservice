import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Phone, ChevronRight, Briefcase, Clock, CheckCircle2, PlayCircle, Circle } from "lucide-react";
import { format, isToday, isTomorrow, isThisWeek, parseISO, startOfDay, endOfDay, addDays } from "date-fns";
import { nb } from "date-fns/locale";
import { toast } from "sonner";
import { JOB_TYPE_LABELS, JOB_STATUS_LABELS, JOB_STATUS_COLORS } from "@/lib/domain-labels";
import { cn } from "@/lib/utils";

type Job = {
  id: string;
  job_number: string;
  title: string;
  status: string;
  job_type: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  estimated_hours: number | null;
  description: string | null;
  company: { name: string; phone: string | null } | null;
  site: { name: string | null; address: string | null; city: string | null } | null;
};

const STATUS_ACTIONS: { from: string[]; to: string; label: string; icon: typeof Circle; color: string }[] = [
  {
    from: ["planned", "scheduled"],
    to: "in_progress",
    label: "Start oppdrag",
    icon: PlayCircle,
    color: "bg-amber-500 hover:bg-amber-600 text-white",
  },
  {
    from: ["in_progress"],
    to: "completed",
    label: "Merk som fullført",
    icon: CheckCircle2,
    color: "bg-emerald-600 hover:bg-emerald-700 text-white",
  },
];

function mapsUrl(address: string | null, city: string | null) {
  const q = encodeURIComponent([address, city].filter(Boolean).join(", "));
  return `https://maps.google.com/?q=${q}`;
}

function dayLabel(dateStr: string | null): string {
  if (!dateStr) return "Udatert";
  const d = parseISO(dateStr);
  if (isToday(d)) return "I dag";
  if (isTomorrow(d)) return "I morgen";
  return format(d, "EEEE d. MMM", { locale: nb });
}

function groupByDay(jobs: Job[]): { label: string; date: string; jobs: Job[] }[] {
  const map = new Map<string, Job[]>();
  for (const j of jobs) {
    const key = j.scheduled_start ? j.scheduled_start.slice(0, 10) : "9999-12-31";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(j);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, jobs]) => ({
      date,
      label: dayLabel(date === "9999-12-31" ? null : date + "T12:00:00"),
      jobs,
    }));
}

export default function TodayPage() {
  const { tenantId, user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [technicianId, setTechnicianId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Find technician record
  useEffect(() => {
    if (!tenantId || !user) return;
    const find = async () => {
      const { data: byUser } = await supabase
        .from("technicians").select("id").eq("tenant_id", tenantId).eq("user_id", user.id).eq("is_active", true).limit(1);
      if (byUser?.[0]) { setTechnicianId(byUser[0].id); return; }
      if (user.email) {
        const { data: byEmail } = await supabase
          .from("technicians").select("id").eq("tenant_id", tenantId).eq("email", user.email).eq("is_active", true).limit(1);
        if (byEmail?.[0]) setTechnicianId(byEmail[0].id);
      }
    };
    find();
  }, [tenantId, user]);

  const fetchJobs = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);

    const weekStart = startOfDay(new Date());
    const weekEnd = endOfDay(addDays(new Date(), 7));

    let jobIds: string[] = [];

    if (technicianId) {
      const { data: assignments } = await supabase
        .from("job_technicians").select("job_id").eq("technician_id", technicianId);
      jobIds = (assignments || []).map((a: any) => a.job_id);
    }

    if (technicianId && jobIds.length === 0) {
      setJobs([]);
      setLoading(false);
      return;
    }

    let q = supabase
      .from("jobs")
      .select("id, job_number, title, status, job_type, scheduled_start, scheduled_end, estimated_hours, description, company:crm_companies(name, phone), site:customer_sites(name, address, city)")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .not("status", "in", '("completed","cancelled")')
      .gte("scheduled_start", weekStart.toISOString())
      .lte("scheduled_start", weekEnd.toISOString())
      .order("scheduled_start");

    if (technicianId && jobIds.length > 0) {
      q = q.in("id", jobIds);
    }

    const { data } = await q;
    setJobs((data || []) as unknown as Job[]);
    setLoading(false);
  }, [tenantId, technicianId]);

  useEffect(() => { if (technicianId !== undefined) fetchJobs(); }, [fetchJobs, technicianId]);

  const changeStatus = async (job: Job, newStatus: string) => {
    setUpdatingId(job.id);
    const payload: any = { status: newStatus };
    if (newStatus === "in_progress") payload.actual_start = new Date().toISOString();
    if (newStatus === "completed") payload.actual_end = new Date().toISOString();
    const { error } = await supabase.from("jobs").update(payload).eq("id", job.id);
    if (error) {
      toast.error("Kunne ikke oppdatere status");
    } else {
      toast.success(JOB_STATUS_LABELS[newStatus] || newStatus);
      fetchJobs();
    }
    setUpdatingId(null);
  };

  const groups = groupByDay(jobs);
  const todayJobs = jobs.filter(j => j.scheduled_start && isToday(parseISO(j.scheduled_start)));

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 pt-4 pb-3 sticky top-0 z-10">
        <h1 className="text-xl font-bold tracking-tight">Mine oppdrag</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {loading ? "Laster..." : `${todayJobs.length} i dag · ${jobs.length} totalt denne uken`}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-3" />
          <p className="text-lg font-semibold">Ingen oppdrag i dag 🎉</p>
          <p className="text-sm text-muted-foreground mt-1">Du har ingen planlagte jobber denne uken.</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {groups.map((group) => (
            <div key={group.date}>
              {/* Day header */}
              <div className="px-4 py-2 bg-muted/40 sticky top-[69px] z-10">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</span>
              </div>

              {/* Job cards */}
              {group.jobs.map((job) => {
                const action = STATUS_ACTIONS.find(a => a.from.includes(job.status));
                const address = job.site?.address;
                const city = job.site?.city;
                const phone = job.company?.phone;
                const isUpdating = updatingId === job.id;

                return (
                  <div key={job.id} className="bg-card px-4 py-4 space-y-3">
                    {/* Time + type */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 shrink-0" />
                        <span>
                          {job.scheduled_start ? format(parseISO(job.scheduled_start), "HH:mm") : "–"}
                          {job.scheduled_end ? ` – ${format(parseISO(job.scheduled_end), "HH:mm")}` : ""}
                        </span>
                        {job.estimated_hours && (
                          <span className="text-muted-foreground/60">· {job.estimated_hours}t est.</span>
                        )}
                      </div>
                      <Badge className={cn("text-[11px] shrink-0", JOB_STATUS_COLORS[job.status])}>
                        {JOB_STATUS_LABELS[job.status] || job.status}
                      </Badge>
                    </div>

                    {/* Customer + job title */}
                    <div>
                      <p className="text-base font-bold leading-tight">
                        {job.company?.name || "Ukjent kunde"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {JOB_TYPE_LABELS[job.job_type] || job.job_type} · {job.job_number}
                      </p>
                    </div>

                    {/* Address tap-to-maps */}
                    {(address || city) && (
                      <a
                        href={mapsUrl(address, city)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 py-2 -mx-1 px-1 rounded-lg active:bg-muted/50 transition-colors"
                        style={{ minHeight: 44 }}
                      >
                        <MapPin className="h-5 w-5 text-primary shrink-0" />
                        <span className="text-sm font-medium text-primary">
                          {[address, city].filter(Boolean).join(", ")}
                        </span>
                      </a>
                    )}

                    {/* Phone tap-to-call */}
                    {phone && (
                      <a
                        href={`tel:${phone}`}
                        className="flex items-center gap-2 py-2 -mx-1 px-1 rounded-lg active:bg-muted/50 transition-colors"
                        style={{ minHeight: 44 }}
                      >
                        <Phone className="h-5 w-5 text-emerald-600 shrink-0" />
                        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{phone}</span>
                      </a>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      {/* Status action button */}
                      {action && (
                        <button
                          onClick={() => changeStatus(job, action.to)}
                          disabled={isUpdating}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 rounded-xl font-semibold text-sm transition-all active:scale-[0.98]",
                            action.color
                          )}
                          style={{ minHeight: 52 }}
                        >
                          {isUpdating ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <action.icon className="h-5 w-5" />
                          )}
                          {action.label}
                        </button>
                      )}

                      {/* Details button */}
                      <button
                        onClick={() => navigate(`/technician/jobs/${job.id}`)}
                        className="flex items-center justify-center gap-1.5 px-4 rounded-xl border border-border bg-card text-sm font-medium text-muted-foreground active:bg-muted/50 transition-all active:scale-[0.98]"
                        style={{ minHeight: 52 }}
                      >
                        <Briefcase className="h-4 w-4" />
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
