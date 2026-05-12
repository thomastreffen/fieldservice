import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { DocumentUploadSection } from "@/components/crud/DocumentUploadSection";
import {
  Loader2, ArrowLeft, MapPin, Phone, CheckCircle2, Camera,
  Cpu, CalendarCheck, ChevronDown, ChevronUp,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { nb } from "date-fns/locale";
import { toast } from "sonner";
import { JOB_TYPE_LABELS, JOB_STATUS_LABELS, JOB_STATUS_COLORS, formatDate } from "@/lib/domain-labels";
import { cn } from "@/lib/utils";

function mapsUrl(address: string | null, city: string | null) {
  const q = encodeURIComponent([address, city].filter(Boolean).join(", "));
  return `https://maps.google.com/?q=${q}`;
}

export default function TechJobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [job, setJob] = useState<any>(null);
  const [checklists, setChecklists] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState("");
  const [notesDirty, setNotesDirty] = useState(false);
  const [showDocs, setShowDocs] = useState(false);

  const fetchJob = useCallback(async () => {
    if (!id) return;
    const [{ data: jobData }, { data: cls }, { data: docs }] = await Promise.all([
      supabase.from("jobs").select(
        "*, company:crm_companies(name, phone, email), site:customer_sites(name, address, city, postal_code), asset:hvac_assets(manufacturer, model, serial_number, installed_at, warranty_expires_at)"
      ).eq("id", id).single(),
      supabase.from("installation_checklists").select("*").eq("job_id", id).order("created_at"),
      supabase.from("documents").select("*").eq("job_id", id).is("deleted_at", null),
    ]);
    if (jobData) {
      setJob(jobData);
      setNotes((jobData as any).notes || "");
    }
    if (cls && cls.length > 0) {
      const clIds = cls.map((c: any) => c.id);
      const { data: items } = await supabase
        .from("checklist_items").select("*").in("checklist_id", clIds).order("sort_order");
      setChecklists(cls.map((cl: any) => ({
        ...cl,
        items: (items || []).filter((i: any) => i.checklist_id === cl.id),
      })));
    } else {
      setChecklists([]);
    }
    setDocuments(docs || []);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchJob(); }, [fetchJob]);

  const toggleCheckItem = async (itemId: string, checked: boolean, checklistCompleted: boolean) => {
    if (checklistCompleted) return;
    const { error } = await supabase.from("checklist_items").update({
      is_checked: checked,
      checked_at: checked ? new Date().toISOString() : null,
      checked_by: checked ? user?.id || null : null,
    }).eq("id", itemId);
    if (error) { toast.error("Kunne ikke oppdatere"); return; }
    fetchJob();
  };

  const saveNotes = async () => {
    if (!job) return;
    setSaving(true);
    const { error } = await supabase.from("jobs").update({ notes } as any).eq("id", job.id);
    if (error) { toast.error("Kunne ikke lagre notater"); } else { toast.success("Notat lagret"); setNotesDirty(false); }
    setSaving(false);
  };

  const changeStatus = async (newStatus: string) => {
    if (!job) return;
    setSaving(true);
    const payload: any = { status: newStatus };
    if (newStatus === "in_progress") payload.actual_start = new Date().toISOString();
    if (newStatus === "completed") payload.actual_end = new Date().toISOString();
    const { error } = await supabase.from("jobs").update(payload).eq("id", job.id);
    if (error) {
      toast.error("Kunne ikke oppdatere status");
    } else {
      toast.success(JOB_STATUS_LABELS[newStatus] || newStatus);
      fetchJob();
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <p className="text-muted-foreground">Jobb ikke funnet</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-primary text-sm font-medium">Gå tilbake</button>
      </div>
    );
  }

  const canStart = ["planned", "scheduled"].includes(job.status);
  const isInProgress = job.status === "in_progress";
  const isCompleted = job.status === "completed";
  const asset = job.asset;
  const totalItems = checklists.reduce((n: number, cl: any) => n + (cl.items?.length || 0), 0);
  const checkedItems = checklists.reduce((n: number, cl: any) => n + (cl.items?.filter((i: any) => i.is_checked).length || 0), 0);

  return (
    <div className="min-h-full bg-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-10 h-10 rounded-full active:bg-muted/50 transition-colors shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate text-base">{job.company?.name || "Jobb"}</p>
          <p className="text-xs text-muted-foreground">{job.job_number} · {JOB_TYPE_LABELS[job.job_type] || job.job_type}</p>
        </div>
        <Badge className={cn("shrink-0 text-[11px]", JOB_STATUS_COLORS[job.status])}>
          {JOB_STATUS_LABELS[job.status] || job.status}
        </Badge>
      </div>

      <div className="px-4 space-y-5 py-4 pb-8">

        {/* Customer contact block */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="font-bold text-lg">{job.company?.name || "–"}</p>
            {job.site && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {[job.site.name, job.site.address, job.site.city].filter(Boolean).join(", ")}
              </p>
            )}
          </div>

          {/* Tap-to-maps */}
          {(job.site?.address || job.site?.city) && (
            <a
              href={mapsUrl(job.site?.address, job.site?.city)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 border-b border-border active:bg-muted/40 transition-colors"
              style={{ minHeight: 56 }}
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary">Åpne i kart</p>
                <p className="text-xs text-muted-foreground">{[job.site?.address, job.site?.city].filter(Boolean).join(", ")}</p>
              </div>
            </a>
          )}

          {/* Tap-to-call */}
          {job.company?.phone && (
            <a
              href={`tel:${job.company.phone}`}
              className="flex items-center gap-3 px-4 active:bg-muted/40 transition-colors"
              style={{ minHeight: 56 }}
            >
              <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Phone className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Ring kunde</p>
                <p className="text-xs text-muted-foreground">{job.company.phone}</p>
              </div>
            </a>
          )}
        </div>

        {/* Scheduled time */}
        {job.scheduled_start && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-border bg-card">
            <CalendarCheck className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-semibold">
                {format(parseISO(job.scheduled_start), "EEEE d. MMMM – HH:mm", { locale: nb })}
                {job.scheduled_end ? ` – ${format(parseISO(job.scheduled_end), "HH:mm")}` : ""}
              </p>
              {job.estimated_hours && (
                <p className="text-xs text-muted-foreground">{job.estimated_hours} timer estimert</p>
              )}
            </div>
          </div>
        )}

        {/* Description */}
        {job.description && (
          <div className="rounded-2xl border border-border bg-card px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Beskrivelse</p>
            <p className="text-sm leading-relaxed">{job.description}</p>
          </div>
        )}

        {/* Checklist */}
        {checklists.length > 0 && (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <p className="font-semibold text-sm">Sjekkliste</p>
              <span className="text-xs text-muted-foreground">{checkedItems}/{totalItems}</span>
            </div>
            <div className="divide-y divide-border">
              {checklists.map((cl: any) => (
                <div key={cl.id} className="px-4 py-2">
                  {cl.template_name && (
                    <p className="text-xs font-medium text-muted-foreground py-2">{cl.template_name}</p>
                  )}
                  {cl.items?.map((item: any) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-4 active:bg-muted/30 -mx-4 px-4 rounded-lg transition-colors cursor-pointer"
                      style={{ minHeight: 52 }}
                    >
                      <Checkbox
                        className="h-6 w-6 rounded-md shrink-0"
                        checked={item.is_checked}
                        disabled={!!cl.completed_at}
                        onCheckedChange={(v) => toggleCheckItem(item.id, !!v, !!cl.completed_at)}
                      />
                      <span className={cn(
                        "text-base flex-1",
                        item.is_checked ? "line-through text-muted-foreground" : ""
                      )}>
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Asset info */}
        {asset && (
          <div className="rounded-2xl border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Anlegg</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Produsent / Modell</p>
                <p className="font-medium">{[asset.manufacturer, asset.model].filter(Boolean).join(" ") || "–"}</p>
              </div>
              {asset.serial_number && (
                <div>
                  <p className="text-xs text-muted-foreground">Serienummer</p>
                  <p className="font-medium font-mono text-xs">{asset.serial_number}</p>
                </div>
              )}
              {asset.installed_at && (
                <div>
                  <p className="text-xs text-muted-foreground">Installert</p>
                  <p className="font-medium">{formatDate(asset.installed_at)}</p>
                </div>
              )}
              {asset.warranty_expires_at && (
                <div>
                  <p className="text-xs text-muted-foreground">Garanti utløper</p>
                  <p className="font-medium">{formatDate(asset.warranty_expires_at)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-4 pt-3 pb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notater</p>
            <Textarea
              value={notes}
              onChange={e => { setNotes(e.target.value); setNotesDirty(true); }}
              placeholder="Legg til notat om jobben..."
              rows={3}
              className="text-base border-0 focus-visible:ring-0 resize-none bg-transparent p-0"
            />
          </div>
          {notesDirty && (
            <div className="px-4 pb-3">
              <button
                onClick={saveNotes}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm active:opacity-90 transition-opacity"
                style={{ minHeight: 48 }}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Lagre notat
              </button>
            </div>
          )}
        </div>

        {/* Documents / Camera */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <button
            onClick={() => setShowDocs(v => !v)}
            className="w-full flex items-center justify-between px-4 active:bg-muted/40 transition-colors"
            style={{ minHeight: 56 }}
          >
            <div className="flex items-center gap-3">
              <Camera className="h-5 w-5 text-muted-foreground" />
              <div className="text-left">
                <p className="text-sm font-semibold">Bilder og dokumenter</p>
                <p className="text-xs text-muted-foreground">{documents.length} fil{documents.length !== 1 ? "er" : ""} lastet opp</p>
              </div>
            </div>
            {showDocs ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
          </button>
          {showDocs && (
            <div className="border-t border-border p-4">
              <DocumentUploadSection
                documents={documents}
                entityType="job"
                entityId={job.id}
                queryKey={["tech-job-docs", job.id]}
              />
            </div>
          )}
        </div>

        {/* Primary action button */}
        {!isCompleted && (
          <button
            onClick={() => changeStatus(isInProgress ? "completed" : "in_progress")}
            disabled={saving}
            className={cn(
              "w-full flex items-center justify-center gap-3 rounded-2xl font-bold text-base transition-all active:scale-[0.98]",
              isInProgress
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-primary hover:bg-primary/90 text-primary-foreground"
            )}
            style={{ minHeight: 64 }}
          >
            {saving ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <CheckCircle2 className="h-6 w-6" />
            )}
            {isInProgress ? "Merk som fullført" : "Start oppdrag"}
          </button>
        )}

        {isCompleted && (
          <div className="flex items-center justify-center gap-2 py-4 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
            <span className="font-semibold">Jobb fullført</span>
          </div>
        )}
      </div>
    </div>
  );
}
