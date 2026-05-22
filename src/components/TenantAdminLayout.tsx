import { ReactNode, useMemo, useState, CSSProperties } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTenantModules } from "@/hooks/useTenantModules";
import { usePermissions } from "@/hooks/usePermissions";
import { useVertical } from "@/hooks/useVertical";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Plug, LogOut, Flame, Puzzle, Users, Mail,
  CalendarDays, Contact, X, MoreHorizontal,
  Building2, TrendingUp, Shield, Briefcase, Cpu, FileText, ShieldAlert, ClipboardList, Inbox,
  ArrowRightLeft, Wrench, Thermometer, Zap, Droplets, Layers, TicketCheck, Clock,
  AlertTriangle, BookOpen, Upload, FileBarChart2, Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import GlobalSearch from "@/components/search/GlobalSearch";

const VERTICAL_ICONS: Record<string, typeof Flame> = {
  thermometer: Thermometer,
  zap: Zap,
  droplets: Droplets,
};

function verticalCssVars(hex: string | null | undefined): CSSProperties {
  if (!hex || !hex.startsWith("#")) return {};
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  const hd = Math.round(h * 360);
  const sp = Math.round(s * 100);
  const lp = Math.round(l * 100);
  return {
    ["--primary" as string]: `${hd} ${sp}% ${lp}%`,
    ["--primary-foreground" as string]: "0 0% 100%",
    ["--sidebar-accent" as string]: `${hd} ${sp}% 95%`,
    ["--sidebar-accent-foreground" as string]: `${hd} ${sp}% 35%`,
    ["--ring" as string]: `${hd} ${sp}% ${lp}%`,
  };
}

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  module?: string;
  /** Permission key required to see this nav item */
  permission?: string;
  /** If true, only tenant_admin (or master_admin) can see this item */
  adminOnly?: boolean;
}

const navSections: { label: string; items: NavItem[] }[] = [
  {
    label: "Oversikt",
    items: [{ label: "Dashboard", href: "/tenant", icon: LayoutDashboard }],
  },
  {
    label: "CRM",
    items: [
      { label: "Pipeline", href: "/tenant/crm/pipeline", icon: TrendingUp, module: "crm", permission: "module.crm" },
      { label: "Kontaktpersoner", href: "/tenant/crm/contacts", icon: Contact, module: "crm", permission: "module.crm" },
      { label: "Kunder", href: "/tenant/crm/companies", icon: Building2, module: "crm", permission: "module.crm" },
      { label: "Salg", href: "/tenant/crm/deals", icon: TrendingUp, module: "crm", permission: "module.crm" },
      { label: "Jobber", href: "/tenant/crm/jobs", icon: Briefcase, module: "crm", permission: "module.crm" },
      { label: "Anlegg", href: "/tenant/crm/assets", icon: Cpu, module: "crm", permission: "module.crm" },
      { label: "Serviceavtaler", href: "/tenant/crm/agreements", icon: FileText, module: "crm", permission: "module.crm" },
      { label: "Skjemaer og maler", href: "/tenant/templates", icon: ClipboardList, module: "crm", permission: "module.crm" },
      { label: "Nettskjema-innsendt", href: "/tenant/templates/submissions", icon: Inbox, module: "crm", permission: "module.crm" },
      { label: "Garantisaker", href: "/tenant/crm/warranties", icon: ShieldAlert, module: "crm", permission: "module.crm" },
    ],
  },
  {
    label: "Operasjon",
    items: [
      { label: "Mine oppdrag", href: "/tenant/mine-oppdrag", icon: Wrench },
      { label: "Postkontoret", href: "/tenant/postkontoret", icon: Mail, module: "postkontoret", permission: "module.postkontoret" },
      { label: "Ressursplanlegger", href: "/tenant/ressursplanlegger", icon: CalendarDays, module: "ressursplanlegger", permission: "module.ressursplanlegger" },
    ],
  },
  {
    label: "HMS & HR",
    items: [
      { label: "Oversikt", href: "/hms", icon: Shield, module: "hms_hr", permission: "hms.view" },
      { label: "Avvik", href: "/hms/incidents", icon: AlertTriangle, module: "hms_hr", permission: "hms.view" },
      { label: "SJA / Sjekklister", href: "/hms/submissions", icon: ClipboardList, module: "hms_hr", permission: "hms.view" },
      { label: "Håndbøker", href: "/hms/handbooks", icon: BookOpen, module: "hms_hr", permission: "hms.view" },
      { label: "Arbeidstidsvarsler", href: "/hms/aml", icon: Clock, module: "hms_hr", permission: "hms.manage" },
      { label: "Overtid", href: "/hms/overtime", icon: FileText, module: "hms_hr", permission: "hms.manage" },
      { label: "Import", href: "/hms/import", icon: Upload, module: "hms_hr", permission: "hms.manage" },
      { label: "Rapporter", href: "/hms/reports", icon: FileBarChart2, module: "hms_hr", permission: "hms.manage" },
      { label: "Bransjeområder", href: "/hms/areas", icon: Tag, module: "hms_hr", permission: "hms.view" },
    ],
  },
  {
    label: "Innstillinger",
    items: [
      { label: "Moduler", href: "/tenant/modules", icon: Puzzle, adminOnly: true },
      { label: "Integrasjoner", href: "/tenant/integrations", icon: Plug, adminOnly: true },
      { label: "Brukere", href: "/tenant/users", icon: Users, adminOnly: true },
      { label: "Tilgangsstyring", href: "/tenant/access-control", icon: Shield, adminOnly: true },
    ],
  },
  {
    label: "Support",
    items: [
      { label: "Mine saker", href: "/tenant/support", icon: TicketCheck },
    ],
  },
];

// Items shown directly in the mobile bottom nav — excluded from the "Mer" sheet
const BOTTOM_NAV_HREFS = new Set(["/tenant", "/tenant/crm/companies", "/tenant/crm/jobs", "/tenant/ressursplanlegger"]);

// Whitelist for internal (platform-owned) tenants — only CRM nav items
const INTERNAL_ONLY_HREFS = new Set([
  "/tenant",
  "/tenant/crm/pipeline",
  "/tenant/crm/contacts",
  "/tenant/crm/companies",
  "/tenant/crm/deals",
]);

function TrialBanner({ tenantId }: { tenantId: string }) {
  const SESSION_KEY = "trial_banner_dismissed";
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(SESSION_KEY) === "1");

  const { data } = useQuery({
    queryKey: ["tenant_trial_status", tenantId],
    enabled: !dismissed,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("tenants")
        .select("status, trial_ends_at")
        .eq("id", tenantId)
        .single();
      return data as { status: string; trial_ends_at: string | null } | null;
    },
  });

  const isWelcome = sessionStorage.getItem("trial_welcome") === "1";

  if (dismissed) return null;
  if (!data || data.status !== "trial" || !data.trial_ends_at) return null;

  const days = Math.ceil((new Date(data.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const colors =
    days <= 3
      ? "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300"
      : days <= 7
      ? "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-950/30 dark:border-yellow-800 dark:text-yellow-300"
      : "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300";

  function dismiss() {
    sessionStorage.setItem(SESSION_KEY, "1");
    if (isWelcome) sessionStorage.removeItem("trial_welcome");
    setDismissed(true);
  }

  return (
    <div className={`border-b px-4 py-2 flex items-center gap-3 text-sm ${colors}`}>
      <Clock className="w-4 h-4 shrink-0" />
      {isWelcome ? (
        <span className="flex-1">
          Velkommen! Du har <strong>{days} dager</strong> igjen av din gratis prøveperiode.
        </span>
      ) : (
        <span className="flex-1">
          Prøveperiode: <strong>{days <= 0 ? "Utløpt" : `${days} dager igjen`}</strong>
          {days > 0 &&
            ` — utløper ${new Date(data.trial_ends_at).toLocaleDateString("nb-NO", { day: "numeric", month: "long" })}`}
        </span>
      )}
      <Link
        to="/upgrade"
        className="font-semibold underline underline-offset-2 hover:opacity-80 whitespace-nowrap"
      >
        Oppgrader nå
      </Link>
      <button onClick={dismiss} className="hover:opacity-70 transition-opacity ml-1">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function SidebarNav({
  location,
  onNavigate,
  collapsed,
  hasModule,
  hasPermission,
  hasVerticalModule,
  isAdmin,
  excludeHrefs,
  onlyHrefs,
}: {
  location: ReturnType<typeof useLocation>;
  onNavigate?: () => void;
  collapsed?: boolean;
  hasModule: (m: string) => boolean;
  hasPermission: (k: string) => boolean;
  hasVerticalModule: (m: string) => boolean;
  isAdmin: boolean;
  excludeHrefs?: Set<string>;
  onlyHrefs?: Set<string>;
}) {
  const visibleSections = useMemo(
    () =>
      navSections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => {
            if (onlyHrefs && !onlyHrefs.has(item.href)) return false;
            if (excludeHrefs?.has(item.href)) return false;
            if (item.adminOnly && !isAdmin) return false;
            if (item.module && !hasModule(item.module)) return false;
            if (item.module && !hasVerticalModule(item.module)) return false;
            if (item.permission && !hasPermission(item.permission)) return false;
            return true;
          }),
        }))
        .filter((section) => section.items.length > 0),
    [hasModule, hasPermission, hasVerticalModule, isAdmin, excludeHrefs, onlyHrefs]
  );

  return (
    <nav className="flex-1 overflow-y-auto py-2">
      {visibleSections.length === 0 && !collapsed && (
        <div className="px-4 py-6 text-center">
          <p className="text-xs text-sidebar-foreground/50 leading-relaxed">
            Du har ikke fått tildelt tilganger ennå. Kontakt din administrator.
          </p>
        </div>
      )}
      {visibleSections.map((section) => (
        <div key={section.label} className="mb-1">
          {!collapsed && (
            <p className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
              {section.label}
            </p>
          )}
          {section.items.map((item) => {
            const active = location.pathname === item.href || location.pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 mx-2 px-3 py-2 rounded-md text-[13px] font-medium transition-all",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/65 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function TopBar({ user, signOut, isMobile, isMasterAdmin, vertical }: { user: any; signOut: () => void; isMobile: boolean; isMasterAdmin: boolean; vertical: { display_name: string; icon: string | null; color: string | null } | null }) {
  const VerticalIcon = (vertical?.icon && VERTICAL_ICONS[vertical.icon]) || Layers;
  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 gap-4 shrink-0">
      <div className="flex items-center gap-3">
        {isMobile ? (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <VerticalIcon className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold">VPKontroll</span>
          </div>
        ) : (
          <GlobalSearch />
        )}
      </div>
      <div className="flex items-center gap-2">
        {isMobile && <GlobalSearch />}
        {isMasterAdmin && (
          <Link
            to="/admin"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors shrink-0"
          >
            <ArrowRightLeft className="w-3 h-3" />
            Master Admin
          </Link>
        )}
        <NotificationCenter />
        <div className="flex items-center gap-2 pl-2 border-l border-border">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {(user?.email?.[0] || "U").toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {!isMobile && (
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={signOut}>
              <LogOut className="w-3.5 h-3.5" />
              Logg ut
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

function BottomNav({
  location,
  onMoreClick,
}: {
  location: ReturnType<typeof useLocation>;
  onMoreClick: () => void;
}) {
  const items = [
    { label: "Hjem", href: "/tenant", exact: true, icon: LayoutDashboard },
    { label: "Kunder", href: "/tenant/crm/companies", exact: false, icon: Building2 },
    { label: "Jobber", href: "/tenant/crm/jobs", exact: false, icon: Briefcase },
    { label: "Kalender", href: "/tenant/ressursplanlegger", exact: false, icon: CalendarDays },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="grid grid-cols-5 h-16">
        {items.map((item) => {
          const active = item.exact
            ? location.pathname === item.href
            : location.pathname === item.href || location.pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors active:opacity-70",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("h-[22px] w-[22px]", active && "stroke-[2.5]")} />
              <span className="text-[11px] font-medium">{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={onMoreClick}
          className="flex flex-col items-center justify-center gap-1 text-muted-foreground active:opacity-70 transition-colors"
          style={{ minHeight: 48 }}
        >
          <MoreHorizontal className="h-[22px] w-[22px]" />
          <span className="text-[11px] font-medium">Mer</span>
        </button>
      </div>
    </nav>
  );
}

function RoleSwitchLink() {
  const { isMasterAdmin } = useAuth();
  if (!isMasterAdmin) return null;
  return (
    <div className="border-t border-border p-2">
      <Link
        to="/admin"
        className="flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium text-sidebar-foreground/65 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all"
      >
        <ArrowRightLeft className="w-4 h-4 shrink-0" />
        <span>Master Admin</span>
      </Link>
    </div>
  );
}

export default function TenantAdminLayout({ children }: { children: ReactNode }) {
  const { signOut, user, isMasterAdmin, isTenantAdmin, tenantId } = useAuth();
  const { hasModule } = useTenantModules();
  const { hasPermission } = usePermissions();
  const { hasVerticalModule, vertical } = useVertical();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [moreOpen, setMoreOpen] = useState(false);

  const isAdmin = isMasterAdmin || isTenantAdmin;
  const cssVars = useMemo(() => verticalCssVars(vertical?.color), [vertical?.color]);
  const VerticalIcon = (vertical?.icon && VERTICAL_ICONS[vertical.icon]) || Layers;

  // Reuses the same query key as TrialBanner so the fetch is shared/cached
  const { data: tenantMeta } = useQuery({
    queryKey: ["tenant_trial_status", tenantId],
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("tenants")
        .select("status, trial_ends_at")
        .eq("id", tenantId)
        .single();
      return data as { status: string; trial_ends_at: string | null } | null;
    },
  });

  const onlyHrefs = tenantMeta?.status === "internal" ? INTERNAL_ONLY_HREFS : undefined;

  if (isMobile) {
    return (
      <div style={cssVars} className="min-h-screen flex flex-col bg-background">
        <TopBar user={user} signOut={signOut} isMobile isMasterAdmin={isMasterAdmin} vertical={vertical} />
        {tenantId && <TrialBanner tenantId={tenantId} />}

        <main
          className="flex-1 overflow-auto"
          style={{ paddingBottom: "calc(64px + env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="p-4 max-w-[1400px] mx-auto">{children}</div>
        </main>

        <BottomNav location={location} onMoreClick={() => setMoreOpen(true)} />

        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetContent
            side="bottom"
            className="h-auto max-h-[85vh] p-0 rounded-t-2xl overflow-hidden flex flex-col"
          >
            <SheetTitle className="sr-only">Mer navigasjon</SheetTitle>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <span className="font-semibold text-sm">Meny</span>
              <Button variant="ghost" size="icon" onClick={() => setMoreOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="overflow-y-auto flex-1">
              <SidebarNav
                location={location}
                onNavigate={() => setMoreOpen(false)}
                hasModule={hasModule}
                hasPermission={hasPermission}
                hasVerticalModule={hasVerticalModule}
                isAdmin={isAdmin}
                excludeHrefs={BOTTOM_NAV_HREFS}
                onlyHrefs={onlyHrefs}
              />
              <RoleSwitchLink />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  return (
    <div style={cssVars} className="min-h-screen flex bg-background">
      <aside className="w-60 bg-card border-r border-border flex flex-col shrink-0">
        <div className="p-4 flex items-center gap-3 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <VerticalIcon className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold">VPKontroll</span>
            {vertical && (
              <span className="text-[10px] text-muted-foreground truncate">{vertical.display_name}</span>
            )}
          </div>
        </div>
        <SidebarNav location={location} hasModule={hasModule} hasPermission={hasPermission} hasVerticalModule={hasVerticalModule} isAdmin={isAdmin} onlyHrefs={onlyHrefs} />
        <RoleSwitchLink />
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar user={user} signOut={signOut} isMobile={false} isMasterAdmin={isMasterAdmin} vertical={vertical} />
        {tenantId && <TrialBanner tenantId={tenantId} />}
        <main className="flex-1 overflow-auto">
          <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
