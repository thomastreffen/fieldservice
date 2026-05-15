const PRIORITY_MAP: Record<string, number> = { Kritisk: 1, Høy: 2, Normal: 3, Lav: 4 };

export interface DevOpsConfig {
  orgUrl: string;
  project: string;
  pat: string;
  workItemType: string;
}

function authHeader(pat: string) {
  return `Basic ${btoa(`:${pat}`)}`;
}

function apiUrl(orgUrl: string, project: string, path: string) {
  return `${orgUrl.replace(/\/$/, "")}/${encodeURIComponent(project)}/_apis/${path}`;
}

export async function createWorkItem(
  config: DevOpsConfig,
  ticket: { id: string; title: string; description: string; priority: string },
  tenantName: string,
  verticalName: string | null,
): Promise<void> {
  const ticketUrl = `${window.location.origin}/admin/support/${ticket.id}`;
  const htmlDesc = [
    `<p>${ticket.description.replace(/\n/g, "<br>")}</p>`,
    `<hr>`,
    `<p><strong>Tenant:</strong> ${tenantName}</p>`,
    verticalName ? `<p><strong>Vertikal:</strong> ${verticalName}</p>` : "",
    `<p><a href="${ticketUrl}">Åpne i VPKontroll</a></p>`,
  ].filter(Boolean).join("");

  const body = [
    { op: "add", path: "/fields/System.Title", value: ticket.title },
    { op: "add", path: "/fields/System.Description", value: htmlDesc },
    { op: "add", path: "/fields/Microsoft.VSTS.Common.Priority", value: PRIORITY_MAP[ticket.priority] ?? 3 },
  ];

  const url = apiUrl(config.orgUrl, config.project, `wit/workitems/$${encodeURIComponent(config.workItemType)}?api-version=7.0`);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json-patch+json",
      Authorization: authHeader(config.pat),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Azure DevOps returned ${res.status}`);
}

export async function testDevOpsConnection(config: Pick<DevOpsConfig, "orgUrl" | "project" | "pat">): Promise<void> {
  const url = apiUrl(config.orgUrl, config.project, "wit/workitemtypes?api-version=7.0");
  const res = await fetch(url, { headers: { Authorization: authHeader(config.pat) } });
  if (!res.ok) throw new Error(`Azure DevOps returned ${res.status}`);
}
