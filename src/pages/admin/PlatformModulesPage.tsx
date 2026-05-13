import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Loader2, Puzzle } from "lucide-react";

interface PlatformModule {
  id: string; slug: string; name: string; description: string | null;
  icon: string | null; is_core: boolean; compatible_verticals: string[];
  created_at: string;
}

const VERTICAL_COLORS: Record<string, string> = {
  varmepumpe: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400",
  elektro:    "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400",
  vvs:        "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-400",
};

export default function PlatformModulesPage() {
  const [modules, setModules] = useState<PlatformModule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("platform_modules").select("*").order("is_core", { ascending: false });
    setModules(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const coreModules = modules.filter(m => m.is_core);
  const optionalModules = modules.filter(m => !m.is_core);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Plattformmoduler</h1>
        <p className="text-muted-foreground mt-1">Alle tilgjengelige moduler og hvilke vertikaler de støtter</p>
      </div>

      {/* Stat-kort */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-muted/40 rounded-lg px-4 py-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Puzzle className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Totalt</p>
            <p className="font-semibold text-sm">{modules.length}</p>
          </div>
        </div>
        <div className="bg-muted/40 rounded-lg px-4 py-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center">
            <Puzzle className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Kjernemoduler</p>
            <p className="font-semibold text-sm">{coreModules.length}</p>
          </div>
        </div>
      </div>

      {[
        { label: "Kjernemoduler", items: coreModules },
        { label: "Tilleggsmoduler", items: optionalModules },
      ].map(({ label, items }) => items.length > 0 && (
        <div key={label} className="rounded-xl border border-border overflow-hidden bg-card">
          <div className="px-5 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
            <span className="text-xs text-muted-foreground">{items.length} moduler</span>
          </div>
          {items.map(m => (
            <div key={m.id} className="flex items-center gap-4 px-5 py-3.5 border-b border-border last:border-b-0">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Puzzle className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{m.name}</p>
                  <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{m.slug}</span>
                  {m.is_core && <Badge variant="outline" className="text-[10px]">Kjerne</Badge>}
                </div>
                {m.description && <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>}
              </div>
              <div className="flex flex-wrap gap-1.5 shrink-0">
                {m.compatible_verticals.map(v => (
                  <span
                    key={v}
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${VERTICAL_COLORS[v] ?? "bg-muted text-muted-foreground"}`}
                  >
                    {v}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
