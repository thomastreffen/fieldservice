interface Fact { name: string; value: string }

function messageCard(summary: string, title: string, facts: Fact[], ticketId: string) {
  return {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    themeColor: "0078D4",
    summary,
    sections: [{ activityTitle: title, facts }],
    potentialAction: [{
      "@type": "OpenUri",
      name: "Åpne ticket",
      targets: [{ os: "default", uri: `${window.location.origin}/admin/support/${ticketId}` }],
    }],
  };
}

export async function sendTeamsMessage(webhookUrl: string, payload: object): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Teams webhook returned ${res.status}`);
}

export function newTicketCard(
  ticket: { id: string; title: string; category: string; priority: string },
  tenantName: string,
  verticalName: string | null,
) {
  const facts: Fact[] = [
    { name: "Tittel", value: ticket.title },
    { name: "Kategori", value: ticket.category },
    { name: "Prioritet", value: ticket.priority },
    { name: "Tenant", value: tenantName },
  ];
  if (verticalName) facts.push({ name: "Vertikal", value: verticalName });
  return messageCard(`Ny ticket: ${ticket.title}`, `Ny supportticket fra ${tenantName}`, facts, ticket.id);
}

export function statusChangeCard(
  ticket: { id: string; title: string },
  newStatus: string,
  tenantName: string,
) {
  return messageCard(
    `Statusendring: ${ticket.title}`,
    `Ticket status endret til «${newStatus}»`,
    [
      { name: "Tittel", value: ticket.title },
      { name: "Ny status", value: newStatus },
      { name: "Tenant", value: tenantName },
    ],
    ticket.id,
  );
}

export function assignmentCard(
  ticket: { id: string; title: string },
  assigneeEmail: string,
  tenantName: string,
) {
  return messageCard(
    `Ticket tildelt: ${ticket.title}`,
    `Ticket tildelt til ${assigneeEmail}`,
    [
      { name: "Tittel", value: ticket.title },
      { name: "Tildelt til", value: assigneeEmail },
      { name: "Tenant", value: tenantName },
    ],
    ticket.id,
  );
}

export function testCard() {
  return {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    themeColor: "00B36B",
    summary: "VPKontroll Teams-integrasjon fungerer",
    sections: [{ activityTitle: "Testmelding fra VPKontroll", text: "Teams-varsling er konfigurert og fungerer korrekt." }],
  };
}
