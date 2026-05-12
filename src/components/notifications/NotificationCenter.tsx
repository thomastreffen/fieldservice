import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, AlertCircle, AlertTriangle, Info, CheckCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useNotifications, type AppNotification, type NotificationCategory } from "@/hooks/useNotifications";

const CATEGORY_CONFIG: Record<NotificationCategory, { icon: typeof AlertCircle; color: string; bg: string }> = {
  critical: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/30" },
  warning:  { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30" },
  info:     { icon: Info, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" },
};

function NotifItem({ notif, onRead }: { notif: AppNotification; onRead: (id: string) => void }) {
  const navigate = useNavigate();
  const cfg = CATEGORY_CONFIG[notif.category];
  const Icon = cfg.icon;

  return (
    <button
      className={cn(
        "w-full text-left flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50",
        !notif.isRead && cfg.bg
      )}
      onClick={() => {
        onRead(notif.id);
        navigate(notif.link);
      }}
    >
      <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", cfg.color)} />
      <div className="min-w-0 flex-1">
        <p className={cn("text-xs font-semibold leading-tight", notif.isRead ? "text-muted-foreground" : "text-foreground")}>
          {notif.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{notif.message}</p>
      </div>
      {!notif.isRead && <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
    </button>
  );
}

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const handleRead = (id: string) => {
    markAsRead(id);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 p-0 shadow-xl"
        sideOffset={8}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold">Varsler</span>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={markAllAsRead}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Merk alle lest
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="max-h-[420px] overflow-y-auto divide-y divide-border/50">
          {notifications.length === 0 ? (
            <div className="px-4 py-10 flex flex-col items-center gap-2 text-center">
              <Bell className="h-7 w-7 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Ingen varsler</p>
            </div>
          ) : (
            notifications.map((n) => (
              <NotifItem key={n.id} notif={n} onRead={handleRead} />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
