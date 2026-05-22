import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft, Camera, X, Loader2, CheckCircle2, PenLine, Users, Plus, Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";
import {
  upsertAnswer, signSubmission, submitForReview,
  type SubmissionStatus, STATUS_LABELS,
} from "@/lib/hms/submissions";
import { SignatureCanvas } from "@/components/hms/SignatureCanvas";
import { logHmsAudit } from "@/modules/hms-hr/lib/audit";
import { cn } from "@/lib/utils";

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

interface TemplateItem {
  id: string;
  item_type: string;
  label: string;
  help_text?: string | null;
  is_required: boolean;
  ordering: number;
  options?: any;
}

interface TemplateSection {
  id: string;
  title: string;
  description?: string | null;
  ordering: number;
  items: TemplateItem[];
}

interface TemplateSnapshot {
  name: string;
  kind: string;
  sections: TemplateSection[];
}

interface Participant {
  id: string;
  user_id: string | null;
  display_name: string;
  role: string;
  signed_at: string | null;
}

interface Submission {
  id: string;
  title: string;
  status: SubmissionStatus;
  kind: string;
  template_snapshot: TemplateSnapshot | null;
  template_version: number;
  submitted_by: string | null;
  project_id: string | null;
  event_id: string | null;
}

interface Answer {
  item_id: string;
  value: any;
  photos: string[] | null;
}

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

const YES_NO_NA_OPTIONS = [
  { value: "yes", label: "Ja", cls: "border-emerald-400 bg-emerald-50 text-emerald-800" },
  { value: "no", label: "Nei", cls: "border-rose-400 bg-rose-50 text-rose-800" },
  { value: "na", label: "N/A", cls: "border-border bg-muted/40 text-muted-foreground" },
];

// ────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────

export default function HmsSubmissionFillPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, tenantId } = useAuth();
  const qc = useQueryClient();

  // ── Local state ───────────────────────────────────────────────────────────
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [photos, setPhotos] = useState<Record<string, string[]>>({});
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [sigData, setSigData] = useState("");
  const [showParticipants, setShowParticipants] = useState(false);
  const [newParticipantName, setNewParticipantName] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const activeItemRef = useRef<string | null>(null);

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: submission, isLoading } = useQuery<Submission>({
    queryKey: ["hms-submission", id],
    enabled: !!id,
    queryFn: async () => {
      const sb = supabase as any;
      const { data, error } = await sb
        .from("hms_submissions")
        .select("id, title, status, kind, template_snapshot, template_version, submitted_by, project_id, event_id")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: existingAnswers = [] } = useQuery<Answer[]>({
    queryKey: ["hms-submission-answers", id],
    enabled: !!id,
    queryFn: async () => {
      const sb = supabase as any;
      const { data, error } = await sb
        .from("hms_submission_answers")
        .select("item_id, value, photos")
        .eq("submission_id", id!);
      if (error) throw error;
      return (data ?? []) as Answer[];
    },
  });

  const { data: participants = [] } = useQuery<Participant[]>({
    queryKey: ["hms-submission-participants", id],
    enabled: !!id,
    queryFn: async () => {
      const sb = supabase as any;
      const { data, error } = await sb
        .from("hms_submission_participants")
        .select("id, user_id, display_name, role, signed_at")
        .eq("submission_id", id!)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as Participant[];
    },
  });

  // ── Seed answers from existing data ───────────────────────────────────────
  useEffect(() => {
    if (existingAnswers.length > 0) {
      const a: Record<string, any> = {};
      const p: Record<string, string[]> = {};
      for (const ans of existingAnswers) {
        a[ans.item_id] = ans.value;
        if (ans.photos?.length) p[ans.item_id] = ans.photos;
      }
      setAnswers(a);
      setPhotos(p);
    }
  }, [existingAnswers]);

  // ── Autosave with 800ms debounce ──────────────────────────────────────────
  const debouncedAnswers = useDebounce(answers, 800);
  const debouncedPhotos = useDebounce(photos, 800);
  const lastSavedRef = useRef<string>("");

  const saveAnswers = useCallback(
    async (ans: Record<string, any>, phot: Record<string, string[]>) => {
      if (!id) return;
      const snap = JSON.stringify({ ans, phot });
      if (snap === lastSavedRef.current) return;
      lastSavedRef.current = snap;
      const snapshot = submission?.template_snapshot;
      if (!snapshot) return;
      for (const sec of snapshot.sections ?? []) {
        for (const item of sec.items ?? []) {
          const val = ans[item.id];
          if (val !== undefined && val !== null && val !== "") {
            await upsertAnswer({
              submissionId: id,
              itemId: item.id,
              itemKey: item.id,
              value: val,
              photos: phot[item.id] ?? null,
            }).catch(() => {});
          }
        }
      }
    },
    [id, submission]
  );

  useEffect(() => {
    if (submission?.status === "draft") {
      saveAnswers(debouncedAnswers, debouncedPhotos);
    }
  }, [debouncedAnswers, debouncedPhotos, saveAnswers, submission?.status]);

  // ── Photo upload ──────────────────────────────────────────────────────────
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const itemId = activeItemRef.current;
    if (!itemId || !id || !tenantId) return;
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    const sb = supabase as any;
    const uploaded: string[] = [];
    for (const f of files.slice(0, 5)) {
      const safeName = f.name.replace(/[^\w.\-]/g, "_");
      const path = `submissions/${id}/${itemId}/${Date.now()}-${safeName}`;
      const { error } = await sb.storage
        .from("hms-attachments")
        .upload(path, f, { upsert: false, contentType: f.type });
      if (!error) uploaded.push(path);
    }
    if (uploaded.length > 0) {
      setPhotos((prev) => ({
        ...prev,
        [itemId]: [...(prev[itemId] ?? []), ...uploaded],
      }));
    }
  };

  // ── Participants ──────────────────────────────────────────────────────────
  const addParticipantMut = useMutation({
    mutationFn: async (name: string) => {
      const sb = supabase as any;
      const { error } = await sb.from("hms_submission_participants").insert({
        submission_id: id,
        display_name: name,
        role: "Deltaker",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewParticipantName("");
      qc.invalidateQueries({ queryKey: ["hms-submission-participants", id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeParticipantMut = useMutation({
    mutationFn: async (participantId: string) => {
      const sb = supabase as any;
      const { error } = await sb
        .from("hms_submission_participants")
        .delete()
        .eq("id", participantId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hms-submission-participants", id] }),
    onError: (e: any) => toast.error(e.message),
  });

  // ── Sign ──────────────────────────────────────────────────────────────────
  const signMut = useMutation({
    mutationFn: async () => {
      if (!id || !user) throw new Error("Mangler kontekst");
      await signSubmission({
        submissionId: id,
        userId: user.id,
        userName: (user as any).name || user.email || "Ukjent",
        templateVersion: submission?.template_version ?? 1,
        signatureType: sigData ? "drawn_signature" : "internal_confirm",
        signatureData: sigData || null,
      });
    },
    onSuccess: () => {
      toast.success("Signert");
      setShowSignDialog(false);
      setSigData("");
      qc.invalidateQueries({ queryKey: ["hms-submission-participants", id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Submit for review ─────────────────────────────────────────────────────
  const submitMut = useMutation({
    mutationFn: async () => {
      if (!id || !tenantId) throw new Error("Mangler kontekst");
      // Flush pending autosave first
      await saveAnswers(answers, photos);
      await submitForReview(id);
      await logHmsAudit({
        tenant_id: tenantId,
        action: "submission.submitted",
        entity_type: "hms_submission",
        entity_id: id,
        payload: { kind: submission?.kind },
      }).catch(() => {});
    },
    onSuccess: () => {
      toast.success("Sendt inn til gjennomgang");
      qc.invalidateQueries({ queryKey: ["hms-submission", id] });
      navigate("/hms/submissions");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const isDraft = submission?.status === "draft";
  const snapshot = submission?.template_snapshot;

  const requiredItems = (snapshot?.sections ?? []).flatMap((s) =>
    s.items.filter((i) => i.is_required)
  );
  const answeredRequired = requiredItems.filter(
    (i) => answers[i.id] !== undefined && answers[i.id] !== null && answers[i.id] !== ""
  );
  const progress = requiredItems.length > 0
    ? Math.round((answeredRequired.length / requiredItems.length) * 100)
    : 100;

  // ── Render item ───────────────────────────────────────────────────────────
  const renderItem = (item: TemplateItem) => {
    const val = answers[item.id];
    const itemPhotos = photos[item.id] ?? [];

    return (
      <div key={item.id} className="space-y-2">
        <div className="flex items-start gap-1">
          <Label className="text-sm leading-snug">{item.label}</Label>
          {item.is_required && <span className="text-rose-500 text-xs mt-0.5">*</span>}
        </div>
        {item.help_text && (
          <p className="text-xs text-muted-foreground">{item.help_text}</p>
        )}

        {item.item_type === "yes_no_na" && (
          <div className="flex gap-2">
            {YES_NO_NA_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                disabled={!isDraft}
                onClick={() => setAnswers((p) => ({ ...p, [item.id]: opt.value }))}
                className={cn(
                  "flex-1 rounded-lg border-2 py-2.5 text-sm font-semibold transition",
                  val === opt.value ? opt.cls : "border-border bg-card text-foreground",
                  !isDraft && "opacity-60 cursor-not-allowed"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {item.item_type === "text" && (
          <Input
            value={val ?? ""}
            disabled={!isDraft}
            onChange={(e) => setAnswers((p) => ({ ...p, [item.id]: e.target.value }))}
            placeholder="Svar..."
            className="h-10"
          />
        )}

        {item.item_type === "long_text" && (
          <Textarea
            value={val ?? ""}
            disabled={!isDraft}
            onChange={(e) => setAnswers((p) => ({ ...p, [item.id]: e.target.value }))}
            placeholder="Beskriv..."
            rows={3}
          />
        )}

        {item.item_type === "risk" && (
          <Textarea
            value={val ?? ""}
            disabled={!isDraft}
            onChange={(e) => setAnswers((p) => ({ ...p, [item.id]: e.target.value }))}
            placeholder="Beskriv risiko..."
            rows={3}
          />
        )}

        {item.item_type === "mitigation" && (
          <Textarea
            value={val ?? ""}
            disabled={!isDraft}
            onChange={(e) => setAnswers((p) => ({ ...p, [item.id]: e.target.value }))}
            placeholder="Beskriv tiltak..."
            rows={3}
          />
        )}

        {item.item_type === "due_date" && (
          <Input
            type="date"
            value={val ?? ""}
            disabled={!isDraft}
            onChange={(e) => setAnswers((p) => ({ ...p, [item.id]: e.target.value }))}
          />
        )}

        {item.item_type === "responsible" && (
          <Input
            value={val ?? ""}
            disabled={!isDraft}
            onChange={(e) => setAnswers((p) => ({ ...p, [item.id]: e.target.value }))}
            placeholder="Navn på ansvarlig..."
            className="h-10"
          />
        )}

        {item.item_type === "signature" && (
          <SignatureCanvas
            label="Signatur"
            value={val ?? ""}
            disabled={!isDraft}
            onChange={(dataUrl) => setAnswers((p) => ({ ...p, [item.id]: dataUrl }))}
          />
        )}

        {item.item_type === "attachment" && (
          <div className="space-y-1">
            {isDraft && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  activeItemRef.current = item.id;
                  fileRef.current?.click();
                }}
              >
                <Camera className="h-3.5 w-3.5 mr-1.5" /> Legg til bilde/vedlegg
              </Button>
            )}
            {itemPhotos.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {itemPhotos.map((p, idx) => (
                  <div key={idx} className="relative">
                    <div className="text-[10px] bg-muted px-2 py-1 rounded border max-w-[140px] truncate">{p.split("/").pop()}</div>
                    {isDraft && (
                      <button
                        className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-white flex items-center justify-center"
                        onClick={() => setPhotos((prev) => ({
                          ...prev,
                          [item.id]: prev[item.id].filter((_, i) => i !== idx),
                        }))}
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ── Loading / not found ───────────────────────────────────────────────────
  if (isLoading || !submission) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen bg-background"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 120px)" }}
    >
      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        capture="environment"
        onChange={handlePhotoChange}
        className="hidden"
      />

      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/60">
        <div className="px-4 py-3 max-w-2xl mx-auto flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Tilbake">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {submission.kind === "sja" ? "SJA" : "Sjekkliste"}
            </div>
            <div className="text-base font-semibold truncate">{submission.title}</div>
          </div>
          <Badge variant={submission.status === "approved" ? "default" : "secondary"} className="text-[10px] uppercase">
            {STATUS_LABELS[submission.status] ?? submission.status}
          </Badge>
        </div>
        {isDraft && requiredItems.length > 0 && (
          <div className="px-4 pb-2 max-w-2xl mx-auto">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{progress}%</span>
            </div>
          </div>
        )}
      </header>

      {/* Body */}
      <div className="px-4 py-4 max-w-2xl mx-auto space-y-6">
        {/* Sections */}
        {(snapshot?.sections ?? []).map((section) => (
          <Card key={section.id} className="border-border/60">
            <CardContent className="p-4 space-y-4">
              <div>
                <h2 className="font-semibold text-sm">{section.title}</h2>
                {section.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
                )}
              </div>
              <div className="space-y-4 divide-y divide-border/40">
                {section.items.map((item) => (
                  <div key={item.id} className="pt-4 first:pt-0">
                    {renderItem(item)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Participants */}
        <Card className="border-border/60">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm flex items-center gap-1.5">
                <Users className="h-4 w-4" /> Deltakere ({participants.length})
              </h2>
              {isDraft && (
                <Button variant="ghost" size="sm" onClick={() => setShowParticipants(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Legg til
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {participants.map((p) => (
                <div key={p.id} className="flex items-center gap-2 text-sm">
                  <div className="flex-1">
                    <span className="font-medium">{p.display_name}</span>
                    <span className="text-muted-foreground text-xs ml-1.5">({p.role})</span>
                  </div>
                  {p.signed_at ? (
                    <span className="text-emerald-600 text-xs flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Signert
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">Ikke signert</span>
                  )}
                  {isDraft && !p.signed_at && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => removeParticipantMut.mutate(p.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sign button */}
        {isDraft && (
          <Button
            variant="outline"
            className="w-full h-12"
            onClick={() => setShowSignDialog(true)}
          >
            <PenLine className="h-4 w-4 mr-2" /> Signer
          </Button>
        )}
      </div>

      {/* Sticky submit bar */}
      {isDraft && (
        <div
          className="fixed left-0 right-0 bg-background/95 backdrop-blur border-t border-border/60 px-4 pt-3 z-[60] bottom-[64px] lg:bottom-0"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
        >
          <div className="max-w-2xl mx-auto">
            <Button
              onClick={() => submitMut.mutate()}
              disabled={submitMut.isPending}
              className="w-full h-12 text-base font-semibold shadow-lg"
              size="lg"
            >
              {submitMut.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sender inn...</>
              ) : (
                <>Send inn til gjennomgang</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Sign dialog */}
      <Dialog open={showSignDialog} onOpenChange={setShowSignDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Signer skjema</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Ved å signere bekrefter du at du har lest og forstått innholdet.
            </p>
            <SignatureCanvas
              label="Tegn signatur (valgfritt)"
              value={sigData}
              onChange={setSigData}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSignDialog(false)}>Avbryt</Button>
            <Button onClick={() => signMut.mutate()} disabled={signMut.isPending}>
              {signMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Bekreft signatur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add participant dialog */}
      <Dialog open={showParticipants} onOpenChange={setShowParticipants}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Legg til deltaker</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder="Navn på deltaker"
              value={newParticipantName}
              onChange={(e) => setNewParticipantName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newParticipantName.trim()) {
                  addParticipantMut.mutate(newParticipantName.trim());
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowParticipants(false)}>Avbryt</Button>
            <Button
              onClick={() => addParticipantMut.mutate(newParticipantName.trim())}
              disabled={!newParticipantName.trim() || addParticipantMut.isPending}
            >
              Legg til
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
