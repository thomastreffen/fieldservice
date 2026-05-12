import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Map, ClipboardList, User } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Oppdrag", href: "/technician/today", icon: Home },
  { label: "Kart", href: "/technician/map", icon: Map },
  { label: "Historikk", href: "/technician/history", icon: ClipboardList },
  { label: "Profil", href: "/technician/profile", icon: User },
];

export default function TechnicianMobileLayout({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 overflow-auto" style={{ paddingBottom: "calc(72px + env(safe-area-inset-bottom, 0px))" }}>
        {children}
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="grid grid-cols-4 h-[72px]">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/technician/today"
                ? location.pathname === "/technician/today" || location.pathname.startsWith("/technician/jobs/")
                : location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 transition-colors active:opacity-70",
                  active ? "text-primary" : "text-muted-foreground"
                )}
                style={{ minHeight: 48 }}
              >
                <item.icon className={cn("h-[22px] w-[22px]", active && "stroke-[2.5]")} />
                <span className="text-[11px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
