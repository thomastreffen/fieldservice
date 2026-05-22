import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { User, Loader2, Search, Check } from "lucide-react";

interface DBTech {
  id: string;
  name: string;
}

interface TechnicianMultiSelectProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

export function TechnicianMultiSelect({ selectedIds, onChange, disabled }: TechnicianMultiSelectProps) {
  const { tenantId } = useAuth();
  const [technicians, setTechnicians] = useState<DBTech[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    supabase
      .from("technicians")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => {
        setTechnicians((data || []) as DBTech[]);
        setLoading(false);
      });
  }, [tenantId]);

  const safeSelectedIds = Array.isArray(selectedIds) ? selectedIds : [];

  const toggle = (id: string) => {
    const next = safeSelectedIds.includes(id)
      ? safeSelectedIds.filter(x => x !== id)
      : [...safeSelectedIds, id];
    onChange(next);
  };

  const filtered = search
    ? technicians.filter((t) => t.name?.toLowerCase().includes(search.toLowerCase()))
    : technicians;

  if (disabled) {
    const selectedTechs = technicians.filter(t => safeSelectedIds.includes(t.id));
    return (
      <div className="space-y-1.5">
        <Label>Montører</Label>
        <div className="rounded-md border bg-muted/30 p-2 space-y-1">
          {selectedTechs.length === 0 ? (
            <p className="text-xs text-muted-foreground py-1">Ingen montører tildelt</p>
          ) : (
            selectedTechs.map((tech) => (
              <div key={tech.id} className="flex items-center gap-2 px-2 py-1.5 text-sm">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="h-3 w-3" />
                </div>
                <span>{tech.name}</span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label>Montører</Label>
      <div className="rounded-md border bg-background">
        <div className="flex items-center gap-2 px-2 py-1.5 border-b">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Søk montør..."
            className="h-7 border-0 p-0 text-sm shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="h-40 overflow-y-auto">
          <div className="p-1 space-y-0.5">
            {loading ? (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">Ingen treff</p>
            ) : (
              filtered.map((tech) => {
                const checked = safeSelectedIds.includes(tech.id);
                return (
                  <button
                    type="button"
                    key={tech.id}
                    onClick={() => toggle(tech.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors",
                      checked ? "bg-accent" : "hover:bg-secondary"
                    )}
                  >
                    <div className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
                      checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"
                    )}>
                      {checked && <Check className="h-3 w-3" />}
                    </div>
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <User className="h-3 w-3" />
                    </div>
                    <span className="text-sm">{tech.name}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
      {safeSelectedIds.length === 0 && (
        <p className="text-xs text-destructive">Velg minst én montør</p>
      )}
    </div>
  );
}
