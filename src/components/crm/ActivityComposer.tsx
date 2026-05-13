import { useState } from "react";
import { Phone, CalendarDays, Mail, StickyNote, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useActivityLog } from "@/hooks/useActivityLog";

type ActivityMode = "note" | "call" | "meeting" | "email";

const MODES: { value: ActivityMode; label: string; icon: React.ElementType; accent: string }[] = [
  { value: "note",    label: "Notat",   icon: StickyNote,   accent: "bg-muted text-muted-foreground" },
  { value: "call",    label: "Samtale", icon: Phone,        accent: "bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400" },
  { value: "meeting", label: "Møte",    icon: CalendarDays, accent: "bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400" },
  { value: "email",   label: "E-post",  icon: Mail,         accent: "bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400" },
];

interface ActivityComposerProps {
  entityType: string;
  entityId: string;
  onSubmitted?: () => void;
}

export function ActivityComposer({ entityType, entityId, onSubmitted }: ActivityComposerProps) {
  const [mode, setMode] = useState<ActivityMode>("note");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const { logActivity } = useActivityLog(entityType, entityId);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await logActivity({
        type: mode,
        action: `${mode}_logged`,
        title: MODES.find((m) => m.value === mode)?.label,
        description: text.trim(),
      });
      setText("");
      onSubmitted?.();
    } catch {
      toast.error("Kunne ikke lagre aktivitet");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-3 border-b border-border space-y-2">
      <div className="flex gap-1">
        {MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => setMode(m.value)}
            className={cn(
              "flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[10px] font-medium transition-all",
              mode === m.value ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
            )}
          >
            <m.icon className="h-3.5 w-3.5" />
            {m.label}
          </button>
        ))}
      </div>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`Logg ${MODES.find((m) => m.value === mode)?.label.toLowerCase()}…`}
        rows={2}
        className="text-xs resize-none"
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit(); }}
      />

      <Button
        size="sm"
        className="w-full h-7 text-xs gap-1.5"
        onClick={handleSubmit}
        disabled={sending || !text.trim()}
      >
        {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
        Logg
      </Button>
    </div>
  );
}
