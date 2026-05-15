import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Send, Paperclip, X, FileText, Download } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = "image/jpeg,image/png,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function isImage(mime: string | null | undefined) {
  return mime?.startsWith("image/") ?? false;
}

function AttachmentDisplay({ path, name, mime }: { path: string; name: string | null; mime: string | null }) {
  const [url, setUrl] = useState<string | null>(null);

  useState(() => {
    supabase.storage.from("ticket-attachments").createSignedUrl(path, 3600).then(({ data }) => {
      if (data?.signedUrl) setUrl(data.signedUrl);
    });
  });

  if (!url) return null;

  if (isImage(mime)) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="mt-3 block">
        <img src={url} alt={name ?? "vedlegg"} className="max-h-64 rounded-lg border border-border object-contain" />
      </a>
    );
  }

  return (
    <a href={url} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-2 text-xs text-primary hover:underline">
      <Download className="h-3.5 w-3.5 shrink-0" />
      {name ?? "Last ned vedlegg"}
    </a>
  );
}

interface Ticket {
  id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  sender_id: string;
  message: string;
  is_internal: boolean;
  created_at: string;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_mime: string | null;
  attachment_size: number | null;
}

const STATUS_COLORS: Record<string, string> = {
  "Åpen": "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400",
  "Under behandling": "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400",
  "Løst": "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400",
  "Lukket": "bg-muted text-muted-foreground",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("nb-NO", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function SupportTicketPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tenantId, user } = useAuth();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    if (!tenantId || !id) return;
    setLoading(true);
    const [{ data: t }, { data: m }] = await Promise.all([
      (supabase as any)
        .from("support_tickets")
        .select("*")
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .single(),
      (supabase as any)
        .from("support_messages")
        .select("id, sender_id, message, is_internal, created_at, attachment_path, attachment_name, attachment_mime, attachment_size")
        .eq("ticket_id", id)
        .order("created_at", { ascending: true }),
    ]);
    setTicket(t ?? null);
    setMessages(m ?? []);
    setLoading(false);
  }, [tenantId, id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendReply() {
    if (!reply.trim() && !attachment || !user || !id) return;
    setSending(true);
    let attachmentPath: string | null = null;
    let attachmentName: string | null = null;
    let attachmentMime: string | null = null;
    let attachmentSize: number | null = null;
    if (attachment) {
      const ext = attachment.name.split(".").pop();
      const path = `${tenantId}/${id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("ticket-attachments")
        .upload(path, attachment);
      if (uploadError) { setSending(false); toast.error("Kunne ikke laste opp vedlegg"); return; }
      attachmentPath = path;
      attachmentName = attachment.name;
      attachmentMime = attachment.type;
      attachmentSize = attachment.size;
    }
    const { error } = await (supabase as any)
      .from("support_messages")
      .insert({
        ticket_id: id,
        sender_id: user.id,
        message: reply.trim(),
        is_internal: false,
        attachment_path: attachmentPath,
        attachment_name: attachmentName,
        attachment_mime: attachmentMime,
        attachment_size: attachmentSize,
      });
    setSending(false);
    if (error) { toast.error("Kunne ikke sende melding"); return; }
    setReply("");
    setAttachment(null);
    fetchData();
  }

  async function closeTicket() {
    if (!id) return;
    setClosing(true);
    const { error } = await (supabase as any)
      .from("support_tickets")
      .update({ status: "Lukket" })
      .eq("id", id);
    setClosing(false);
    if (error) { toast.error("Kunne ikke lukke ticket"); return; }
    toast.success("Ticket lukket");
    fetchData();
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!ticket) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Ticket ikke funnet</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate("/tenant/support")}>Tilbake</Button>
      </div>
    );
  }

  const isClosed = ticket.status === "Lukket" || ticket.status === "Løst";

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="mt-1 shrink-0" onClick={() => navigate("/tenant/support")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{ticket.title}</h1>
            <span className={cn("text-[11px] font-medium px-2.5 py-0.5 rounded-full shrink-0", STATUS_COLORS[ticket.status] ?? "bg-muted text-muted-foreground")}>
              {ticket.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{ticket.category} · Opprettet {formatTime(ticket.created_at)}</p>
        </div>
        {!isClosed && (
          <Button variant="outline" size="sm" disabled={closing} onClick={closeTicket} className="shrink-0">
            {closing && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            Lukk ticket
          </Button>
        )}
      </div>

      {/* Original description */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xs font-semibold text-primary">{user?.email?.[0]?.toUpperCase() ?? "U"}</span>
          </div>
          <div>
            <p className="text-xs font-medium">Du</p>
            <p className="text-[11px] text-muted-foreground">{formatTime(ticket.created_at)}</p>
          </div>
        </div>
        <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
      </div>

      {/* Thread */}
      {messages.length > 0 && (
        <div className="space-y-3">
          {messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={cn("bg-card rounded-xl border border-border p-5", isMe ? "border-border" : "border-primary/20 bg-primary/5")}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={cn("h-7 w-7 rounded-full flex items-center justify-center", isMe ? "bg-primary/10" : "bg-primary")}>
                    <span className={cn("text-xs font-semibold", isMe ? "text-primary" : "text-primary-foreground")}>
                      {isMe ? (user?.email?.[0]?.toUpperCase() ?? "U") : "S"}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-medium">{isMe ? "Du" : "Support"}</p>
                    <p className="text-[11px] text-muted-foreground">{formatTime(msg.created_at)}</p>
                  </div>
                </div>
                {msg.message && <p className="text-sm whitespace-pre-wrap">{msg.message}</p>}
                {msg.attachment_path && (
                  <AttachmentDisplay path={msg.attachment_path} name={msg.attachment_name} mime={msg.attachment_mime} />
                )}
              </div>
            );
          })}
        </div>
      )}

      <div ref={bottomRef} />

      {/* Reply */}
      {!isClosed ? (
        <div className="bg-card rounded-xl border border-border p-5 space-y-3">
          <p className="text-sm font-medium">Svar</p>
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Skriv din melding her..."
            rows={4}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendReply();
            }}
          />
          {attachment && (
            <div className="flex items-center gap-2 text-xs bg-muted/50 px-3 py-2 rounded-lg">
              <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate flex-1">{attachment.name}</span>
              <button onClick={() => setAttachment(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <p className="text-[11px] text-muted-foreground">Ctrl+Enter for å sende</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <Paperclip className="h-3.5 w-3.5" />
                Vedlegg
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (f.size > MAX_FILE_SIZE) { toast.error("Maks filstørrelse er 10MB"); return; }
                  setAttachment(f);
                  e.target.value = "";
                }}
              />
            </div>
            <Button onClick={sendReply} disabled={sending || (!reply.trim() && !attachment)} className="gap-2">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-muted/30 px-5 py-4 text-sm text-muted-foreground text-center">
          Denne ticketen er {ticket.status.toLowerCase()} og kan ikke besvares
        </div>
      )}
    </div>
  );
}
