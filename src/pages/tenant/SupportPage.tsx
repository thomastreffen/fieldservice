import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, TicketCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface Ticket {
  id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  "Åpen": "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400",
  "Under behandling": "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400",
  "Løst": "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400",
  "Lukket": "bg-muted text-muted-foreground",
};

const PRIORITY_COLORS: Record<string, string> = {
  "Lav": "bg-muted text-muted-foreground",
  "Normal": "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400",
  "Høy": "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400",
  "Kritisk": "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("nb-NO", { day: "2-digit", month: "short", year: "numeric" });
}

export default function SupportPage() {
  const navigate = useNavigate();
  const { tenantId } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("support_tickets")
      .select("id, title, category, priority, status, created_at, updated_at")
      .eq("tenant_id", tenantId)
      .order("updated_at", { ascending: false });
    setTickets(data ?? []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support</h1>
          <p className="text-muted-foreground mt-1">Dine supportsaker</p>
        </div>
        <Button onClick={() => navigate("/tenant/support/new")} className="gap-2">
          <Plus className="h-4 w-4" /> Ny ticket
        </Button>
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <div className="px-5 py-2.5 border-b border-border bg-muted/30">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {tickets.length} {tickets.length === 1 ? "ticket" : "tickets"}
          </span>
        </div>

        {tickets.length === 0 ? (
          <div className="text-center py-16">
            <TicketCheck className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Ingen tickets ennå</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Opprett en ny ticket om du trenger hjelp</p>
          </div>
        ) : (
          tickets.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => navigate(`/tenant/support/${ticket.id}`)}
              className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{ticket.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{ticket.category} · Oppdatert {formatDate(ticket.updated_at)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", PRIORITY_COLORS[ticket.priority] ?? "bg-muted text-muted-foreground")}>
                  {ticket.priority}
                </span>
                <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", STATUS_COLORS[ticket.status] ?? "bg-muted text-muted-foreground")}>
                  {ticket.status}
                </span>
                <p className="text-xs text-muted-foreground hidden sm:block">{formatDate(ticket.created_at)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
