import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Link2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Link } from "react-router-dom";

interface Props {
  submissionId: string;
  convertedToId?: string | null;
  convertedToType?: string | null;
  linkedEventId?: string | null;
  onManageLink: () => void;
}

export function LinkedTaskSection({ submissionId, convertedToId, convertedToType, linkedEventId, onManageLink }: Props) {
  const { data: linkedEvent } = useQuery({
    queryKey: ["linked-event", linkedEventId],
    enabled: !!linkedEventId,
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("id, title, start_time, end_time, status")
        .eq("id", linkedEventId!)
        .maybeSingle();
      return data;
    },
  });

  const hasAnyLink = !!convertedToId || !!linkedEventId;

  if (!hasAnyLink) {
    return (
      <div className="flex items-center justify-between py-2">
        <span className="text-sm text-muted-foreground">Ingen koblet oppgave</span>
        <Button variant="outline" size="sm" onClick={onManageLink} className="gap-1.5">
          <Link2 className="w-3.5 h-3.5" />
          Koble til oppgave
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {linkedEvent && (
        <Card className="border border-border bg-muted/30">
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 min-w-0">
                <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{linkedEvent.title || "Oppgave"}</p>
                  {linkedEvent.start_time && (
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(linkedEvent.start_time), "d. MMM yyyy HH:mm", { locale: nb })}
                      {linkedEvent.end_time && ` – ${format(new Date(linkedEvent.end_time), "HH:mm", { locale: nb })}`}
                    </p>
                  )}
                  {linkedEvent.status && (
                    <Badge variant="secondary" className="mt-1 text-[10px] h-4">
                      {linkedEvent.status}
                    </Badge>
                  )}
                </div>
              </div>
              <Link to={`/events/${linkedEvent.id}`} target="_blank">
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
      {convertedToId && convertedToType === "case" && (
        <Card className="border border-border bg-muted/30">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
                <p className="text-sm font-medium">Konvertert til sak</p>
              </div>
              <Link to={`/cases/${convertedToId}`}>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={onManageLink} className="gap-1.5 text-xs text-muted-foreground">
          <Link2 className="w-3 h-3" />
          Endre kobling
        </Button>
      </div>
    </div>
  );
}
