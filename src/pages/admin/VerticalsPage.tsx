import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Thermometer, Zap, Droplets, Plus, Pencil, Loader2,
  ToggleRight, ChevronRight, Layers,
} from "lucide-react";

const VERTICAL_ICONS: Record<string, React.ReactNode> = {
  thermometer: <Thermometer className="h-5 w-5" />,
  zap: <Zap className="h-5 w-5" />,
  droplets: <Droplets className="h-5 w-5" />,
};

interface Vertical {
  id: string; slug: string; display_name: string; description: string | null;
  icon: string | null; color: string; is_active: boolean;
  default_modules: string[]; config: Record<string, unknown>;
}

export default function VerticalsPage() {
  const navigate = useNavigate();
  const [verticals, setVerticals] = useState<Vertical[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("verticals").select("*").order("created_at");
    setVerticals(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vertikaler</h1>
          <p className="text-muted-foreground mt-1">Bransjevertikaler og modulkonfigurasjon</p>
        </div>
        <Button onClick={() => navigate("/admin/verticals/new")} className="gap-2">
          <Plus className="h-4 w-4" /> Ny vertikal
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-muted/40 rounded-lg px-4 py-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Layers className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Vertikaler</p>
            <p className="font-semibold text-sm">{verticals.length}</p>
          </div>
        </div>
        <div className="bg-muted/40 rounded-lg px-4 py-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center">
            <ToggleRight className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Aktive</p>
            <p className="font-semibold text-sm">{verticals.filter(v => v.is_active).length}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <div className="px-5 py-2.5 border-b border-border bg-muted/30">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {verticals.length} {verticals.length === 1 ? "vertikal" : "vertikaler"}
          </span>
        </div>
        {verticals.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">Ingen vertikaler</div>
        ) : (
          verticals.map(v => (
            <div
              key={v.id}
              className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer group"
              onClick={() => navigate(`/admin/verticals/${v.id}/edit`)}
            >
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center text-white shrink-0"
                style={{ backgroundColor: v.color || "#6366f1" }}
              >
                {VERTICAL_ICONS[v.icon ?? ""] ?? <Layers className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">{v.display_name}</p>
                  <span className="text-xs text-muted-foreground font-mono">{v.slug}</span>
                </div>
                {v.description && <p className="text-xs text-muted-foreground mt-0.5">{v.description}</p>}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {v.default_modules.slice(0, 5).map(m => (
                    <span key={m} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-mono">{m}</span>
                  ))}
                  {v.default_modules.length > 5 && (
                    <span className="text-[10px] text-muted-foreground">+{v.default_modules.length - 5}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Badge variant={v.is_active ? "default" : "secondary"} className="text-[10px]">
                  {v.is_active ? "Aktiv" : "Inaktiv"}
                </Badge>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
