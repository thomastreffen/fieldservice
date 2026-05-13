import { formatDistanceToNow } from "date-fns";
import { nb } from "date-fns/locale";
import { MessageSquare, Phone, CalendarDays, Mail, StickyNote, Activity, ArrowRightLeft, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityEntry } from "@/hooks/useActivityLog";

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; accent: string }> = {
  note:          { label: "Notat",    icon: <StickyNote className="h-4 w-4" />,     accent: "bg-muted text-muted-foreground" },
  call:          { label: "Samtale",  icon: <Phone className="h-4 w-4" />,           accent: "bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400" },
  meeting:       { label: "Møte",     icon: <CalendarDays className="h-4 w-4" />,    accent: "bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400" },
  email:         { label: "E-post",   icon: <Mail className="h-4 w-4" />,            accent: "bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400" },
  task:          { label: "Oppgave",  icon: <CheckCircle2 className="h-4 w-4" />,    accent: "bg-green-100 text-green-600 dark:bg-green-950/60 dark:text-green-400" },
  status_change: { label: "Status",   icon: <ArrowRightLeft className="h-4 w-4" />,  accent: "bg-primary/10 text-primary" },
  message:       { label: "Melding",  icon: <MessageSquare className="h-4 w-4" />,   accent: "bg-primary/10 text-primary" },
};

function getMeta(type: string) {
  return TYPE_META[type] ?? {
    label: type,
    icon: <Activity className="h-4 w-4" />,
    accent: "bg-muted text-muted-foreground",
  };
}

interface ActivityFeedListProps {
  activities: ActivityEntry[];
  emptyMessage?: string;
}

export function ActivityFeedList({ activities, emptyMessage = "Ingen aktivitet ennå" }: ActivityFeedListProps) {
  if (activities.length === 0) {
    return (
      <div className="py-8 text-center">
        <Activity className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {activities.map((item) => {
        const meta = getMeta(item.type);
        return (
          <div key={item.id} className="flex gap-3 px-4 py-3">
            <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5", meta.accent)}>
              {meta.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/60">
                  {meta.label}
                </span>
                <span className="text-[10px] text-muted-foreground/40 ml-auto shrink-0">
                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: nb })}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-foreground">
                {item.description ?? item.title}
              </p>
              {item.performer_name && (
                <p className="text-[10px] text-muted-foreground/50 mt-1">{item.performer_name}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
