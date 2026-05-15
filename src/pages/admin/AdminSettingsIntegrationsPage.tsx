import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { sendTeamsMessage, testCard } from "@/lib/teamsWebhook";
import { testDevOpsConnection } from "@/lib/azureDevops";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, BellRing, GitBranch } from "lucide-react";

const PAT_PLACEHOLDER = "••••••••••••••••";

export default function AdminSettingsIntegrationsPage() {
  const qc = useQueryClient();
  const { data: settings, isLoading } = usePlatformSettings();

  const [teamsEnabled, setTeamsEnabled] = useState(false);
  const [teamsUrl, setTeamsUrl] = useState("");
  const [teamsNewTicket, setTeamsNewTicket] = useState(true);
  const [teamsAssignment, setTeamsAssignment] = useState(true);
  const [teamsStatusChange, setTeamsStatusChange] = useState(true);

  const [devopsEnabled, setDevopsEnabled] = useState(false);
  const [devopsOrgUrl, setDevopsOrgUrl] = useState("");
  const [devopsProject, setDevopsProject] = useState("");
  const [devopsPat, setDevopsPat] = useState("");
  const [devopsPatIsSaved, setDevopsPatIsSaved] = useState(false);
  const [devopsWorkItemType, setDevopsWorkItemType] = useState("User Story");

  const [saving, setSaving] = useState(false);
  const [testingTeams, setTestingTeams] = useState(false);
  const [testingDevops, setTestingDevops] = useState(false);
  const [teamsTestResult, setTeamsTestResult] = useState<"ok" | "error" | null>(null);
  const [devopsTestResult, setDevopsTestResult] = useState<"ok" | "error" | null>(null);

  useEffect(() => {
    if (!settings) return;
    setTeamsEnabled(settings.teams_enabled);
    setTeamsUrl(settings.teams_webhook_url);
    setTeamsNewTicket(settings.teams_notify_new_ticket);
    setTeamsAssignment(settings.teams_notify_assignment);
    setTeamsStatusChange(settings.teams_notify_status_change);
    setDevopsEnabled(settings.devops_enabled);
    setDevopsOrgUrl(settings.devops_org_url);
    setDevopsProject(settings.devops_project);
    setDevopsWorkItemType(settings.devops_work_item_type);
    if (settings.devops_pat) {
      setDevopsPat(PAT_PLACEHOLDER);
      setDevopsPatIsSaved(true);
    }
  }, [settings]);

  async function save() {
    setSaving(true);
    const rows: { key: string; value: string }[] = [
      { key: "teams_enabled", value: String(teamsEnabled) },
      { key: "teams_webhook_url", value: teamsUrl },
      { key: "teams_notify_new_ticket", value: String(teamsNewTicket) },
      { key: "teams_notify_assignment", value: String(teamsAssignment) },
      { key: "teams_notify_status_change", value: String(teamsStatusChange) },
      { key: "devops_enabled", value: String(devopsEnabled) },
      { key: "devops_org_url", value: devopsOrgUrl },
      { key: "devops_project", value: devopsProject },
      { key: "devops_work_item_type", value: devopsWorkItemType },
    ];
    if (devopsPat !== PAT_PLACEHOLDER) {
      rows.push({ key: "devops_pat", value: devopsPat });
    }
    const { error } = await (supabase as any)
      .from("platform_settings")
      .upsert(rows, { onConflict: "key" });
    setSaving(false);
    if (error) { toast.error("Kunne ikke lagre innstillinger"); return; }
    toast.success("Innstillinger lagret");
    if (devopsPat && devopsPat !== PAT_PLACEHOLDER) {
      setDevopsPatIsSaved(true);
      setDevopsPat(PAT_PLACEHOLDER);
    }
    qc.invalidateQueries({ queryKey: ["platform-settings"] });
  }

  async function testTeams() {
    if (!teamsUrl) { toast.error("Legg inn webhook URL først"); return; }
    setTestingTeams(true);
    setTeamsTestResult(null);
    try {
      await sendTeamsMessage(teamsUrl, testCard());
      setTeamsTestResult("ok");
      toast.success("Testmelding sendt til Teams");
    } catch {
      setTeamsTestResult("error");
      toast.error("Klarte ikke å sende til Teams. Sjekk URL og CORS-innstillinger.");
    }
    setTestingTeams(false);
  }

  async function testDevops() {
    if (!devopsOrgUrl || !devopsProject) { toast.error("Fyll inn org URL og prosjektnavn"); return; }
    const pat = devopsPat === PAT_PLACEHOLDER ? settings?.devops_pat ?? "" : devopsPat;
    if (!pat) { toast.error("Fyll inn PAT"); return; }
    setTestingDevops(true);
    setDevopsTestResult(null);
    try {
      await testDevOpsConnection({ orgUrl: devopsOrgUrl, project: devopsProject, pat });
      setDevopsTestResult("ok");
      toast.success("Tilkobling til Azure DevOps OK");
    } catch {
      setDevopsTestResult("error");
      toast.error("Klarte ikke å koble til Azure DevOps. Sjekk org URL, prosjekt og PAT.");
    }
    setTestingDevops(false);
  }

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrasjoner</h1>
        <p className="text-muted-foreground mt-1">Konfigurer eksterne integrasjoner for supportsystemet</p>
      </div>

      {/* Teams */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-[#464EB8]/10 flex items-center justify-center">
              <BellRing className="h-4 w-4 text-[#464EB8]" />
            </div>
            <div>
              <p className="font-semibold text-sm">Microsoft Teams</p>
              <p className="text-xs text-muted-foreground">Webhook-varsler til Teams-kanal</p>
            </div>
          </div>
          <Switch checked={teamsEnabled} onCheckedChange={setTeamsEnabled} />
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="teams-url">Webhook URL</Label>
            <Input
              id="teams-url"
              value={teamsUrl}
              onChange={(e) => setTeamsUrl(e.target.value)}
              placeholder="https://prod-xx.westeurope.logic.azure.com/..."
              disabled={!teamsEnabled}
            />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Varsle ved</p>
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Ny ticket opprettet</span>
                <Switch
                  checked={teamsNewTicket}
                  onCheckedChange={setTeamsNewTicket}
                  disabled={!teamsEnabled}
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Ticket tildelt</span>
                <Switch
                  checked={teamsAssignment}
                  onCheckedChange={setTeamsAssignment}
                  disabled={!teamsEnabled}
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Statusendring</span>
                <Switch
                  checked={teamsStatusChange}
                  onCheckedChange={setTeamsStatusChange}
                  disabled={!teamsEnabled}
                />
              </label>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button
              variant="outline"
              size="sm"
              disabled={!teamsEnabled || !teamsUrl || testingTeams}
              onClick={testTeams}
              className="gap-2"
            >
              {testingTeams ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Send testmelding
            </Button>
            {teamsTestResult === "ok" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
            {teamsTestResult === "error" && (
              <span className="flex items-center gap-1.5 text-xs text-destructive">
                <XCircle className="h-4 w-4" /> Feilet — sjekk URL og CORS
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Azure DevOps */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-[#0078D4]/10 flex items-center justify-center">
              <GitBranch className="h-4 w-4 text-[#0078D4]" />
            </div>
            <div>
              <p className="font-semibold text-sm">Azure DevOps</p>
              <p className="text-xs text-muted-foreground">Opprett work items automatisk for Funksjonsønsker</p>
            </div>
          </div>
          <Switch checked={devopsEnabled} onCheckedChange={setDevopsEnabled} />
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="devops-org">Organisasjons URL</Label>
              <Input
                id="devops-org"
                value={devopsOrgUrl}
                onChange={(e) => setDevopsOrgUrl(e.target.value)}
                placeholder="https://dev.azure.com/dinorg"
                disabled={!devopsEnabled}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="devops-project">Prosjektnavn</Label>
              <Input
                id="devops-project"
                value={devopsProject}
                onChange={(e) => setDevopsProject(e.target.value)}
                placeholder="MinProsjekt"
                disabled={!devopsEnabled}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="devops-wit">Work item type</Label>
              <Input
                id="devops-wit"
                value={devopsWorkItemType}
                onChange={(e) => setDevopsWorkItemType(e.target.value)}
                placeholder="User Story"
                disabled={!devopsEnabled}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="devops-pat">
              Personal Access Token (PAT)
              {devopsPatIsSaved && (
                <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                  Lagret — skriv inn ny for å endre
                </span>
              )}
            </Label>
            <Input
              id="devops-pat"
              type="password"
              value={devopsPat}
              onChange={(e) => setDevopsPat(e.target.value)}
              onFocus={() => { if (devopsPat === PAT_PLACEHOLDER) setDevopsPat(""); }}
              onBlur={() => { if (devopsPat === "" && devopsPatIsSaved) setDevopsPat(PAT_PLACEHOLDER); }}
              placeholder={devopsPatIsSaved ? PAT_PLACEHOLDER : "Lim inn PAT..."}
              disabled={!devopsEnabled}
              autoComplete="new-password"
            />
            <p className="text-[11px] text-muted-foreground">
              Krever <code>Work Items (Read &amp; write)</code> scope. PAT vises aldri i klartekst etter lagring.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button
              variant="outline"
              size="sm"
              disabled={!devopsEnabled || !devopsOrgUrl || !devopsProject || testingDevops}
              onClick={testDevops}
              className="gap-2"
            >
              {testingDevops ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Test tilkobling
            </Button>
            {devopsTestResult === "ok" && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600">
                <CheckCircle2 className="h-4 w-4" /> Tilkoblet
              </span>
            )}
            {devopsTestResult === "error" && (
              <span className="flex items-center gap-1.5 text-xs text-destructive">
                <XCircle className="h-4 w-4" /> Feilet — sjekk org URL, prosjekt og PAT
              </span>
            )}
          </div>
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="gap-2">
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        Lagre innstillinger
      </Button>
    </div>
  );
}
