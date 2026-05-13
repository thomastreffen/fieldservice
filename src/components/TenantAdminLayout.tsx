import { ReactNode, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTenantModules } from "@/hooks/useTenantModules";
import { usePermissions } from "@/hooks/usePermissions";
import { useVertical } from "@/hooks/useVertical";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Plug, LogOut, Flame, Puzzle, Users, Mail,
  CalendarDays, Contact, X, MoreHorizontal,
  Building2, TrendingUp, Shield, Briefcase, Cpu, FileText, ShieldAlert, ClipboardList, Inbox,
  ArrowRightLeft, Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import GlobalSearch from "@/components/search/GlobalSearch";

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
    label: "Innstillinger",
    items: [
      { label: "Moduler", href: "/tenant/modules", icon: Puzzle, adminOnly: true },
      { label: "Integrasjoner", href: "/tenant/integrations", icon: Plug, adminOnly: true },
      { label: "Brukere", href: "/tenant/users", icon: Users, adminOnly: true },
      { label: "Tilgangsstyring", href: "/tenant/access-control", icon: Shield, adminOnly: true },
    ],
  },
];

// Items shown directly in the mobile bottom nav — excluded from the "Mer" sheet
const BOTTOM_NAV_HREFS = new Set(["/tenant", "/tenant/crm/companies", "/tenant/crm/jobs", "/tenant/ressursplanlegger"]);

function SidebarNav({
  location,
  onNavigate,
  collapsed,
  hasModule,
  hasPermission,
  hasVerticalModule,
  isAdmin,
  excludeHrefs,
}: {
  location: ReturnType<typeof useLocation>;
  onNavigate?: () => void;
  collapsed?: boolean;
  hasModule: (m: string) => boolean;
  hasPermission: (k: string) => boolean;
  hasVerticalModule: (m: string) => boolean;
  isAdmin: boolean;
  excludeHrefs?: Set<string>;
}) {
  const visibleSections = useMemo(
    () =>
      navSections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => {
            if (excludeHrefs?.has(item.href)) return false;
            if (item.adminOnly && !isAdmin) return false;
            if (item.module && !hasModule(item.module)) return false;
            if (item.module && !hasVerticalModule(item.module)) return false;
            if (item.permission && !hasPermission(item.permission)) return false;
            return true;
          }),
        }))
        .filter((section) => section.items.length > 0),
    [hasModule, hasPermission, hasVerticalModule, isAdmin, excludeHrefs]
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

function TopBar({ user, signOut, isMobile }: { user: any; signOut: () => void; isMobile: boolean }) {
  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 gap-4 shrink-0">
      <div className="flex items-center gap-3">
        {isMobile ? (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Flame className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold">VPKontroll</span>
          </div>
        ) : (
          <GlobalSearch />
        )}
      </div>
      <div className="flex items-center gap-2">
        {isMobile && <GlobalSearch />}
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
  const { signOut, user, isMasterAdmin, isTenantAdmin } = useAuth();
  const { hasModule } = useTenantModules();
  const { hasPermission } = usePermissions();
  const { hasVerticalModule, vertical } = useVertical();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [moreOpen, setMoreOpen] = useState(false);

  const isAdmin = isMasterAdmin || isTenantAdmin;

  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <TopBar user={user} signOut={signOut} isMobile />

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
              />
              <RoleSwitchLink />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-60 bg-card border-r border-border flex flex-col shrink-0">
        <div className="p-4 flex items-center gap-3 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Flame className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold">VPKontroll</span>
            {vertical && (
              <span className="text-[10px] text-muted-foreground truncate">{vertical.display_name}</span>
            )}
          </div>
        </div>
        <SidebarNav location={location} hasModule={hasModule} hasPermission={hasPermission} hasVerticalModule={hasVerticalModule} isAdmin={isAdmin} />
        <RoleSwitchLink />
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar user={user} signOut={signOut} isMobile={false} />
        <main className="flex-1 overflow-auto">
          <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
