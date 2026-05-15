import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, TicketCheck, Search, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Ticket {
  id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  tenant_id: string;
  tenants: { name: string; vertical_id: string | null; verticals: { display_name: string } | null } | null;
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

const PRIORITY_ORDER: Record<string, number> = { Kritisk: 0, Høy: 1, Normal: 2, Lav: 3 };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("nb-NO", { day: "2-digit", month: "short", year: "numeric" });
}

type SortKey = "updated_at" | "created_at" | "priority" | "status";
type SortDir = "asc" | "desc";

export default function AdminSupportPage() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("alle");
  const [filterPriority, setFilterPriority] = useState("alle");
  const [filterCategory, setFilterCategory] = useState("alle");
  const [filterTenant, setFilterTenant] = useState("alle");
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const { data: tickets = [], isLoading } = useQuery<Ticket[]>({
    queryKey: ["admin-support-tickets"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("support_tickets")
        .select(`
          id, title, category, priority, status, created_at, updated_at, tenant_id,
          tenants(name, vertical_id, verticals(display_name))
        `)
        .order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return null;
    return sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  }

  const tenantOptions = Array.from(new Map(tickets.map((t) => [t.tenant_id, t.tenants?.name ?? t.tenant_id])).entries());

  const filtered = tickets
    .filter((t) => {
      if (filterStatus !== "alle" && t.status !== filterStatus) return false;
      if (filterPriority !== "alle" && t.priority !== filterPriority) return false;
      if (filterCategory !== "alle" && t.category !== filterCategory) return false;
      if (filterTenant !== "alle" && t.tenant_id !== filterTenant) return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortKey === "updated_at") cmp = a.updated_at.localeCompare(b.updated_at);
      else if (sortKey === "created_at") cmp = a.created_at.localeCompare(b.created_at);
      else if (sortKey === "priority") cmp = (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99);
      else if (sortKey === "status") cmp = a.status.localeCompare(b.status);
      return sortDir === "asc" ? cmp : -cmp;
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Support</h1>
        <p className="text-muted-foreground mt-1">Alle supportsaker på tvers av tenants</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Søk i tittel..."
            className="pl-9 h-9 w-56"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle statuser</SelectItem>
            {["Åpen", "Under behandling", "Løst", "Lukket"].map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="Prioritet" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle prioriteter</SelectItem>
            {["Kritisk", "Høy", "Normal", "Lav"].map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle kategorier</SelectItem>
            {["Bug", "Spørsmål", "Funksjonsønske", "Annet"].map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterTenant} onValueChange={setFilterTenant}>
          <SelectTrigger className="h-9 w-48">
            <SelectValue placeholder="Tenant" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle tenants</SelectItem>
            {tenantOptions.map(([id, name]) => (
              <SelectItem key={id} value={id}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-card">
        {/* Table head */}
        <div className="grid grid-cols-[1fr_120px_100px_100px_130px_120px] px-5 py-2.5 border-b border-border bg-muted/30 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider gap-3">
          <button className="text-left flex items-center gap-1" onClick={() => toggleSort("updated_at")}>
            Tittel
          </button>
          <button className="text-left flex items-center gap-1" onClick={() => toggleSort("status")}>
            Status <SortIcon k="status" />
          </button>
          <button className="text-left flex items-center gap-1" onClick={() => toggleSort("priority")}>
            Prioritet <SortIcon k="priority" />
          </button>
          <span>Kategori</span>
          <span>Tenant</span>
          <button className="text-left flex items-center gap-1" onClick={() => toggleSort("updated_at")}>
            Oppdatert <SortIcon k="updated_at" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <TicketCheck className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Ingen tickets matcher filteret</p>
          </div>
        ) : (
          filtered.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => navigate(`/admin/support/${ticket.id}`)}
              className="grid grid-cols-[1fr_120px_100px_100px_130px_120px] px-5 py-3.5 border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer gap-3 items-center"
            >
              <p className="font-medium text-sm truncate">{ticket.title}</p>
              <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full w-fit", STATUS_COLORS[ticket.status] ?? "bg-muted text-muted-foreground")}>
                {ticket.status}
              </span>
              <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full w-fit", PRIORITY_COLORS[ticket.priority] ?? "bg-muted text-muted-foreground")}>
                {ticket.priority}
              </span>
              <span className="text-xs text-muted-foreground">{ticket.category}</span>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{ticket.tenants?.name ?? "—"}</p>
                {ticket.tenants?.verticals?.display_name && (
                  <p className="text-[11px] text-muted-foreground truncate">{ticket.tenants.verticals.display_name}</p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{formatDate(ticket.updated_at)}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
