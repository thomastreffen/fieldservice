import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminTrialConvertPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [planId, setPlanId] = useState("");
  const [billingDate, setBillingDate] = useState(new Date().toISOString().slice(0, 10));

  const { data: tenant, isLoading: tenantLoading } = useQuery({
    queryKey: ["trial_tenant", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("tenants")
        .select("id, name, slug, status, trial_ends_at, vertical:verticals(display_name)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as {
        id: string;
        name: string;
        slug: string;
        status: string;
        trial_ends_at: string | null;
        vertical: { display_name: string } | null;
      };
    },
  });

  const { data: plans } = useQuery({
    queryKey: ["saas_plans_active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saas_plans")
        .select("id, name, price_monthly")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const convertMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Mangler tenant-ID");

      // Update tenant status to active
      const { error: tenantError } = await (supabase as any)
        .from("tenants")
        .update({ status: "active", trial_ends_at: null })
        .eq("id", id);
      if (tenantError) throw tenantError;

      // Upsert tenant_subscription
      if (planId) {
        const { error: subError } = await (supabase as any)
          .from("tenant_subscriptions")
          .upsert({
            tenant_id: id,
            plan_id: planId,
            status: "active",
            billing_starts_at: new Date(billingDate).toISOString(),
            converted_at: new Date().toISOString(),
            started_at: new Date().toISOString(),
          }, { onConflict: "tenant_id" });
        if (subError) throw subError;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trial_tenants"] });
      toast.success(`${tenant?.name} er konvertert til betalt abonnement`);
      navigate("/admin/trials");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (tenantLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/admin/trials")} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Tilbake
        </Button>
        <p className="text-muted-foreground">Tenant ikke funnet.</p>
      </div>
    );
  }

  const daysLeft = tenant.trial_ends_at
    ? Math.ceil((new Date(tenant.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/trials")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Konverter til betalt</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{tenant.name}</p>
        </div>
      </div>

      {/* Tenant summary */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Nåværende status</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Selskap</p>
            <p className="font-medium">{tenant.name}</p>
          </div>
          {tenant.vertical && (
            <div>
              <p className="text-muted-foreground text-xs">Bransje</p>
              <p className="font-medium">{tenant.vertical.display_name}</p>
            </div>
          )}
          <div>
            <p className="text-muted-foreground text-xs">Status</p>
            <p className="font-medium capitalize">{tenant.status}</p>
          </div>
          {daysLeft !== null && (
            <div>
              <p className="text-muted-foreground text-xs">Dager igjen</p>
              <p className={daysLeft <= 0 ? "font-medium text-red-600" : "font-medium"}>
                {daysLeft <= 0 ? "Utløpt" : `${daysLeft} dager`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Convert form */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Konverteringsdetaljer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="plan">Abonnementsplan</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger id="plan">
                <SelectValue placeholder="Velg plan..." />
              </SelectTrigger>
              <SelectContent>
                {plans?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — {Number(p.price_monthly).toLocaleString("nb-NO")} kr/mnd
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="billingDate">Faktureringsstart</Label>
            <Input
              id="billingDate"
              type="date"
              value={billingDate}
              onChange={(e) => setBillingDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => navigate("/admin/trials")}>
          Avbryt
        </Button>
        <Button
          onClick={() => convertMutation.mutate()}
          disabled={convertMutation.isPending}
          className="gap-2"
        >
          {convertMutation.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Konverterer...</>
          ) : (
            <><CheckCircle2 className="w-4 h-4" /> Bekreft konvertering</>
          )}
        </Button>
      </div>
    </div>
  );
}
