import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, CheckCircle2, XCircle, Loader2, Users, PenLine, FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useHmsContextReady } from "@/modules/hms-hr/context/HmsContext";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { nb } from "date-fns/locale";
import { STATUS_LABELS, reviewSubmission, type SubmissionStatus } from "@/lib/hms/submissions";
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

interface Submission {
  id: string;
  title: string;
  status: SubmissionStatus;
  kind: string;
  template_snapshot: TemplateSnapshot | null;
  template_version: number;
  submitted_by: string | null;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  project_id: string | null;
}

interface Answer {
  item_id: string;
  value: any;
  photos: string[] | null;
}

interface Participant {
  id: string;
  display_name: string;
  role: string;
  signed_at: string | null;
}

interface Signature {
  id: string;
  signer_name: string;
  signature_type: string;
  signature_data: string | null;
  role_label: string | null;
  created_at: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Status badge helper
// ────────────────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<SubmissionStatus, string> = {
  draft: "bg-muted text-muted-foreground border-muted",
  submitted: "bg-blue-100 text-blue-800 border-blue-200",
  approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-rose-100 text-rose-800 border-rose-200",
  archived: "bg-muted text-muted-foreground border-muted",
};

function StatusBadge({ status }: { status: SubmissionStatus }) {
  return (
    <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full border", STATUS_COLORS[status])}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────

export default function HmsSubmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, tenantId } = useAuth();
  const { canManageHms } = useHmsContextReady();
  const qc = useQueryClient();

  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: submission, isLoading } = useQuery<Submission>({
    queryKey: ["hms-submission", id],
    enabled: !!id,
    queryFn: async () => {
      const sb = supabase as any;
      const { data, error } = await sb
        .from("hms_submissions")
        .select("id, title, status, kind, template_snapshot, template_version, submitted_by, submitted_at, reviewed_by, reviewed_at, rejection_reason, created_at, project_id")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: answers = [] } = useQuery<Answer[]>({
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
        .select("id, display_name, role, signed_at")
        .eq("submission_id", id!)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as Participant[];
    },
  });

  const { data: signatures = [] } = useQuery<Signature[]>({
    queryKey: ["hms-submission-signatures", id],
    enabled: !!id,
    queryFn: async () => {
      const sb = supabase as any;
      const { data, error } = await sb
        .from("hms_submission_signatures")
        .select("id, signer_name, signature_type, signature_data, role_label, created_at")
        .eq("submission_id", id!)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as Signature[];
    },
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const reviewMut = useMutation({
    mutationFn: async ({ approve, reason }: { approve: boolean; reason?: string }) => {
      if (!id || !user || !tenantId) throw new Error("Mangler kontekst");
      await reviewSubmission({
        submissionId: id,
        approve,
        reviewerUserId: user.id,
        reason: reason ?? null,
      });
      await logHmsAudit({
        tenant_id: tenantId,
        action: approve ? "submission.approved" : "submission.rejected",
        entity_type: "hms_submission",
        entity_id: id,
        payload: { reason },
      }).catch(() => {});
    },
    onSuccess: (_, vars) => {
      toast.success(vars.approve ? "Godkjent" : "Avvist");
      setShowRejectDialog(false);
      qc.invalidateQueries({ queryKey: ["hms-submission", id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Answer lookup ─────────────────────────────────────────────────────────
  const answerMap = Object.fromEntries(answers.map((a) => [a.item_id, a]));

  // ── Value display ─────────────────────────────────────────────────────────
  const renderValue = (item: TemplateItem) => {
    const ans = answerMap[item.id];
    if (!ans) return <span className="text-muted-foreground text-sm italic">Ikke besvart</span>;

    if (item.item_type === "yes_no_na") {
      const labels: Record<string, string> = { yes: "Ja", no: "Nei", na: "Ikke aktuelt" };
      const colors: Record<string, string> = {
        yes: "text-emerald-700 font-semibold",
        no: "text-rose-700 font-semibold",
        na: "text-muted-foreground",
      };
      return (
        <span className={cn("text-sm", colors[ans.value] ?? "text-foreground")}>
          {labels[ans.value] ?? ans.value}
        </span>
      );
    }

    if (item.item_type === "signature" && ans.value) {
      return (
        <img
          src={ans.value}
          alt="Signatur"
          className="max-h-[60px] rounded border border-border/40 bg-white"
        />
      );
    }

    if (item.item_type === "attachment") {
      const photoList = ans.photos ?? [];
      if (photoList.length === 0) return <span className="text-muted-foreground text-sm italic">Ingen vedlegg</span>;
      return (
        <div className="flex flex-wrap gap-1.5">
          {photoList.map((p, i) => (
            <span key={i} className="text-[10px] bg-muted px-2 py-1 rounded border">{p.split("/").pop()}</span>
          ))}
        </div>
      );
    }

    return <p className="text-sm whitespace-pre-wrap">{String(ans.value)}</p>;
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading || !submission) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const snapshot = submission.template_snapshot;
  const canReview = canManageHms && submission.status === "submitted";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link to="/hms/submissions"><ArrowLeft className="h-4 w-4 mr-1" /> Alle innleveringer</Link>
        </Button>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <Badge variant={submission.kind === "sja" ? "default" : "secondary"} className="text-[10px] uppercase mb-1">
              {submission.kind}
            </Badge>
            <h1 className="text-xl font-semibold">{submission.title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Opprettet {formatDistanceToNow(new Date(submission.created_at), { addSuffix: true, locale: nb })}
              {submission.submitted_at && (
                <> · Sendt inn {format(new Date(submission.submitted_at), "d. MMM yyyy HH:mm", { locale: nb })}</>
              )}
            </p>
          </div>
          <StatusBadge status={submission.status} />
        </div>
      </div>

      {/* Rejection reason */}
      {submission.status === "rejected" && submission.rejection_reason && (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-2 text-rose-800">
              <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold mb-0.5">Avvist</div>
                <p className="text-sm">{submission.rejection_reason}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review actions */}
      {canReview && (
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => reviewMut.mutate({ approve: true })}
            disabled={reviewMut.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" /> Godkjenn
          </Button>
          <Button
            variant="destructive"
            onClick={() => setShowRejectDialog(true)}
            disabled={reviewMut.isPending}
          >
            <XCircle className="h-4 w-4 mr-1.5" /> Avvis
          </Button>
          {submission.status === "draft" && (
            <Button variant="outline" asChild>
              <Link to={`/hms/submissions/${id}/fill`}>
                <FileText className="h-4 w-4 mr-1.5" /> Åpne skjema
              </Link>
            </Button>
          )}
        </div>
      )}

      {/* Sections & answers */}
      {(snapshot?.sections ?? []).map((section) => (
        <Card key={section.id} className="border-border/60">
          <CardContent className="p-4 space-y-4">
            <h2 className="font-semibold text-sm">{section.title}</h2>
            {section.description && (
              <p className="text-xs text-muted-foreground">{section.description}</p>
            )}
            <div className="space-y-4 divide-y divide-border/40">
              {section.items.map((item) => (
                <div key={item.id} className="pt-4 first:pt-0 space-y-1">
                  <div className="flex items-start gap-1">
                    <Label className="text-xs text-muted-foreground leading-snug">{item.label}</Label>
                    {item.is_required && <span className="text-rose-500 text-xs">*</span>}
                  </div>
                  {item.help_text && (
                    <p className="text-[11px] text-muted-foreground">{item.help_text}</p>
                  )}
                  <div className="mt-1">{renderValue(item)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Participants */}
      {participants.length > 0 && (
        <Card className="border-border/60">
          <CardContent className="p-4 space-y-3">
            <h2 className="font-semibold text-sm flex items-center gap-1.5">
              <Users className="h-4 w-4" /> Deltakere
            </h2>
            <div className="space-y-2">
              {participants.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <div>
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
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Signatures */}
      {signatures.length > 0 && (
        <Card className="border-border/60">
          <CardContent className="p-4 space-y-3">
            <h2 className="font-semibold text-sm flex items-center gap-1.5">
              <PenLine className="h-4 w-4" /> Signaturer
            </h2>
            <div className="space-y-3">
              {signatures.map((sig) => (
                <div key={sig.id} className="space-y-1 pb-3 border-b border-border/40 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{sig.signer_name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(sig.created_at), "d. MMM yyyy HH:mm", { locale: nb })}
                    </span>
                  </div>
                  {sig.role_label && (
                    <p className="text-xs text-muted-foreground">{sig.role_label}</p>
                  )}
                  {sig.signature_data && (
                    <img
                      src={sig.signature_data}
                      alt="Signatur"
                      className="max-h-[60px] rounded border border-border/40 bg-white mt-1"
                    />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reject dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Avvis innlevering</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-sm">Begrunnelse (valgfritt)</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Hvorfor avvises dette?"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Avbryt</Button>
            <Button
              variant="destructive"
              disabled={reviewMut.isPending}
              onClick={() => reviewMut.mutate({ approve: false, reason: rejectReason })}
            >
              {reviewMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Avvis"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
