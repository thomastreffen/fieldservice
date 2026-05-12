import { useDashboardData } from "@/hooks/useDashboardData";
import { useAuth } from "@/hooks/useAuth";
import DashActionItems from "@/components/dashboard/DashActionItems";
import DashDriftSection from "@/components/dashboard/DashDriftSection";
import DashMiniKanban from "@/components/dashboard/DashMiniKanban";
import DashTechnicianOverview from "@/components/dashboard/DashTechnicianOverview";
import TrialBanner from "@/components/dashboard/TrialBanner";
import OnboardingChecklist from "@/components/dashboard/OnboardingChecklist";
import { formatCurrency } from "@/lib/crm-labels";
import { AlertCircle, CalendarDays, TrendingUp, CheckCircle2, CalendarX, ArrowUpRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { startOfMonth } from "date-fns";

export default function TenantDashboardPage() {
  const d = useDashboardData();
  const { isTenantAdmin, isMasterAdmin } = useAuth();
  const navigate = useNavigate();
  const isAdmin = isTenantAdmin || isMasterAdmin;

  if (d.loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const cardBase = "text-left rounded-xl border bg-card p-5 transition-all [box-shadow:0_1px_3px_rgba(0,0,0,0.06)] hover:[box-shadow:0_4px_12px_rgba(0,0,0,0.09)] hover:-translate-y-px group";

  if (!isAdmin) {
    return <SelgerDashboard d={d} navigate={navigate} cardBase={cardBase} />;
  }

  const urgentCount = d.overdueAgreements.length + d.casesWithoutOwner.length;
  const isUrgent = urgentCount > 0;
  const pipelineValue = d.allDeals.reduce((s, deal) => s + ((deal as any).value ?? 0), 0);
  const hasDeals = d.allDeals.length > 0 || d.wonDeals.length > 0;
  const hasDrift = d.jobsThisWeek.length > 0 || d.visitsNext14.length > 0;

  return (
    <div className="space-y-8">
      <OnboardingChecklist />
      <TrialBanner />

      {/* 3 KPI-kort */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* 1: Haster */}
        <button
          className={cn(
            cardBase,
            isUrgent
              ? "border-red-200 dark:border-red-900/40 hover:border-red-300 dark:hover:border-red-800"
              : "border-border hover:border-border"
          )}
          onClick={() => navigate("/tenant/crm/agreements")}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Haster</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/25 group-hover:text-muted-foreground/60 transition-colors" />
          </div>
          <p className={cn(
            "text-[48px] font-bold font-[Lexend] leading-none tabular-nums",
            isUrgent ? "text-red-600 dark:text-red-400" : "text-foreground"
          )}>
            {urgentCount}
          </p>
          <p className="text-sm text-muted-foreground mt-2.5 leading-snug">
            {isUrgent
              ? [
                  d.overdueAgreements.length > 0 && `${d.overdueAgreements.length} forfalt`,
                  d.casesWithoutOwner.length > 0 && `${d.casesWithoutOwner.length} sak uten eier`,
                ].filter(Boolean).join(" · ")
              : "Ingenting haster nå"
            }
          </p>
        </button>

        {/* 2: Denne uken */}
        <button
          className={cn(cardBase, "border-border hover:border-border")}
          onClick={() => navigate("/tenant/ressursplanlegger")}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Denne uken</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/25 group-hover:text-muted-foreground/60 transition-colors" />
          </div>
          <p className="text-[48px] font-bold font-[Lexend] leading-none tabular-nums text-foreground">
            {d.jobsThisWeek.length}
          </p>
          <p className="text-sm text-muted-foreground mt-2.5 leading-snug">
            {d.jobsThisWeek.length === 1 ? "jobb planlagt" : "jobber planlagt"}
            {d.visitsNext14.length > 0 && (
              <span className="text-muted-foreground/60"> · {d.visitsNext14.length} besøk (14d)</span>
            )}
          </p>
        </button>

        {/* 3: Serviceavtaler */}
        <button
          className={cn(cardBase, "border-border hover:border-border")}
          onClick={() => navigate("/tenant/crm/agreements")}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Serviceavtaler</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/25 group-hover:text-muted-foreground/60 transition-colors" />
          </div>
          <p className="text-[48px] font-bold font-[Lexend] leading-none tabular-nums text-foreground">
            {d.allAgreements.length}
          </p>
          <p className="text-sm text-muted-foreground mt-2.5 leading-snug">
            aktive avtaler
            {pipelineValue > 0 && (
              <span className="text-muted-foreground/60"> · {formatCurrency(pipelineValue)} pipeline</span>
            )}
          </p>
        </button>
      </div>

      {/* Teknikeroversikt */}
      <DashTechnicianOverview />

      {/* To-kolonne midtseksjon */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* Venstre: Hva haster? */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-1.5 px-0.5">
            <AlertCircle className="h-3.5 w-3.5 text-muted-foreground/60" />
            <p className="text-sm font-medium text-muted-foreground">Hva haster?</p>
          </div>
          {d.actionItems.length > 0 ? (
            <DashActionItems items={d.actionItems} />
          ) : (
            <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-12 gap-2">
              <div className="h-9 w-9 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <p className="text-sm font-medium">Alt er under kontroll</p>
              <p className="text-xs text-muted-foreground">Ingen forfalt, ingen saker uten eier</p>
            </div>
          )}
        </div>

        {/* Høyre: Hva skjer denne uken? */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-1.5 px-0.5">
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground/60" />
            <p className="text-sm font-medium text-muted-foreground">Hva skjer denne uken?</p>
          </div>
          {hasDrift ? (
            <DashDriftSection
              jobsThisWeek={d.jobsThisWeek}
              visitsNext14={d.visitsNext14}
              companyMap={d.companyMap}
            />
          ) : (
            <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-12 gap-2">
              <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                <CalendarX className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Ingen planlagte jobber</p>
              <button
                className="text-xs text-primary hover:underline"
                onClick={() => navigate("/tenant/ressursplanlegger")}
              >
                Åpne planlegger →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Salgspipeline */}
      {hasDeals && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-1.5 px-0.5">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground/60" />
            <p className="text-sm font-medium text-muted-foreground">Hvordan går salget?</p>
          </div>
          <DashMiniKanban
            dealsByStage={d.dealsByStage}
            wonDeals={d.wonDeals}
            companyMap={d.companyMap}
          />
        </div>
      )}
    </div>
  );
}

function SelgerDashboard({
  d,
  navigate,
  cardBase,
}: {
  d: ReturnType<typeof useDashboardData>;
  navigate: ReturnType<typeof useNavigate>;
  cardBase: string;
}) {
  const now = new Date();
  const monthStart = startOfMonth(now);

  const allDeals = d.allDeals;
  const wonDeals = d.wonDeals;
  const pipelineValue = allDeals.reduce((s, deal) => s + ((deal as any).value ?? 0), 0);
  const wonThisMonth = wonDeals.filter(deal => {
    const created = (deal as any).created_at;
    return created && new Date(created) >= monthStart;
  });
  const wonThisMonthValue = wonThisMonth.reduce((s, deal) => s + ((deal as any).value ?? 0), 0);
  const leadsThisWeek = allDeals.filter(deal => deal.stage === "lead");
  const totalDeals = allDeals.length + wonDeals.length;
  const conversionRate = totalDeals > 0 ? Math.round((wonDeals.length / totalDeals) * 100) : 0;

  const hasDeals = allDeals.length > 0 || wonDeals.length > 0;

  return (
    <div className="space-y-8">
      <TrialBanner />

      {/* 4 KPI-kort for selger */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          className={cn(cardBase, "border-border hover:border-border")}
          onClick={() => navigate("/tenant/crm/deals")}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Aktive salg</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/25 group-hover:text-muted-foreground/60 transition-colors" />
          </div>
          <p className="text-[40px] font-bold font-[Lexend] leading-none tabular-nums text-foreground">
            {allDeals.length}
          </p>
          <p className="text-xs text-muted-foreground mt-2">{leadsThisWeek.length} leads</p>
        </button>

        <button
          className={cn(cardBase, "border-border hover:border-border")}
          onClick={() => navigate("/tenant/crm/deals")}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Pipeline</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/25 group-hover:text-muted-foreground/60 transition-colors" />
          </div>
          <p className="text-[28px] font-bold font-[Lexend] leading-none tabular-nums text-foreground">
            {formatCurrency(pipelineValue)}
          </p>
          <p className="text-xs text-muted-foreground mt-2">total verdi</p>
        </button>

        <button
          className={cn(cardBase, "border-border hover:border-border")}
          onClick={() => navigate("/tenant/crm/deals")}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Vunnet (mnd)</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/25 group-hover:text-muted-foreground/60 transition-colors" />
          </div>
          <p className="text-[28px] font-bold font-[Lexend] leading-none tabular-nums text-emerald-600 dark:text-emerald-400">
            {wonThisMonth.length > 0 ? formatCurrency(wonThisMonthValue) : wonDeals.length}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {wonThisMonth.length > 0 ? `${wonThisMonth.length} avtaler` : "ingen denne måneden"}
          </p>
        </button>

        <button
          className={cn(cardBase, "border-border hover:border-border")}
          onClick={() => navigate("/tenant/crm/deals")}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Konvertering</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/25 group-hover:text-muted-foreground/60 transition-colors" />
          </div>
          <p className="text-[40px] font-bold font-[Lexend] leading-none tabular-nums text-foreground">
            {conversionRate}%
          </p>
          <p className="text-xs text-muted-foreground mt-2">{wonDeals.length} av {totalDeals} salg</p>
        </button>
      </div>

      {/* Pipeline */}
      {hasDeals && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-1.5 px-0.5">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground/60" />
            <p className="text-sm font-medium text-muted-foreground">Salgspipeline</p>
          </div>
          <DashMiniKanban
            dealsByStage={d.dealsByStage}
            wonDeals={d.wonDeals}
            companyMap={d.companyMap}
          />
        </div>
      )}
    </div>
  );
}
