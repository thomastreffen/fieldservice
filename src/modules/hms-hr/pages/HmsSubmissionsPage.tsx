import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ClipboardCheck, Search, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useHmsContextReady } from "@/modules/hms-hr/context/HmsContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { STATUS_LABELS, type SubmissionStatus } from "@/lib/hms/submissions";
import { formatDistanceToNow } from "date-fns";
import { nb } from "date-fns/locale";

interface Submission {
  id: string;
  kind: string;
  title: string;
  status: SubmissionStatus;
  created_at: string;
  submitted_at: string | null;
  submitted_by: string | null;
  template_snapshot: { name?: string } | null;
}

const STATUS_VARIANTS: Record<SubmissionStatus, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  submitted: "secondary",
  approved: "default",
  rejected: "destructive",
  archived: "outline",
};

const STATUS_COLORS: Record<SubmissionStatus, string> = {
  draft: "text-muted-foreground",
  submitted: "bg-blue-100 text-blue-800 border-blue-200",
  approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-rose-100 text-rose-800 border-rose-200",
  archived: "bg-muted text-muted-foreground",
};

const ALL_STATUSES: SubmissionStatus[] = ["draft", "submitted", "approved", "rejected", "archived"];

export default function HmsSubmissionsPage() {
  const { tenantId } = useHmsContextReady();
  const [status, setStatus] = useState<"all" | SubmissionStatus>("all");
  const [kind, setKind] = useState<"all" | "sja" | "checklist">("all");
  const [search, setSearch] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["hms-submissions", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const sb = supabase as any;
      const { data, error } = await sb
        .from("hms_submissions")
        .select("id, kind, title, status, created_at, submitted_at, submitted_by, template_snapshot")
        .eq("tenant_id", tenantId!)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Submission[];
    },
  });

  const filtered = useMemo(() => {
    return data.filter((s) => {
      if (status !== "all" && s.status !== status) return false;
      if (kind !== "all" && s.kind !== kind) return false;
      if (search && !s.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [data, status, kind, search]);

  const countByStatus = useMemo(() => {
    const counts: Record<string, number> = { all: data.length };
    for (const s of ALL_STATUSES) {
      counts[s] = data.filter((d) => d.status === s).length;
    }
    return counts;
  }, [data]);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
          <ClipboardCheck className="h-3.5 w-3.5" /> HMS &amp; HR
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Innleveringer</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          SJA-er og sjekklister sendt inn av montører i feltet.
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Tabs value={status} onValueChange={(v) => setStatus(v as any)}>
          <TabsList>
            <TabsTrigger value="all">Alle ({countByStatus.all})</TabsTrigger>
            <TabsTrigger value="submitted">Til gjennomgang ({countByStatus.submitted ?? 0})</TabsTrigger>
            <TabsTrigger value="draft">Utkast ({countByStatus.draft ?? 0})</TabsTrigger>
            <TabsTrigger value="approved">Godkjent ({countByStatus.approved ?? 0})</TabsTrigger>
            <TabsTrigger value="rejected">Avvist ({countByStatus.rejected ?? 0})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Tabs value={kind} onValueChange={(v) => setKind(v as any)}>
          <TabsList>
            <TabsTrigger value="all">Alle typer</TabsTrigger>
            <TabsTrigger value="sja">SJA</TabsTrigger>
            <TabsTrigger value="checklist">Sjekklister</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Søk tittel..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground space-y-3">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground/40" />
            <div className="font-medium text-foreground">Ingen innleveringer</div>
            <p className="max-w-sm mx-auto">
              Ingen SJA-er eller sjekklister matcher filteret.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((sub) => (
            <Link key={sub.id} to={`/hms/submissions/${sub.id}`}>
              <Card className="border-border/60 hover:border-primary/40 transition-colors">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{sub.title}</span>
                      <Badge variant={sub.kind === "sja" ? "default" : "secondary"} className="text-[10px] uppercase shrink-0">
                        {sub.kind}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {sub.submitted_at
                        ? `Sendt inn ${formatDistanceToNow(new Date(sub.submitted_at), { addSuffix: true, locale: nb })}`
                        : `Opprettet ${formatDistanceToNow(new Date(sub.created_at), { addSuffix: true, locale: nb })}`}
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[sub.status] ?? ""}`}
                  >
                    {STATUS_LABELS[sub.status] ?? sub.status}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
