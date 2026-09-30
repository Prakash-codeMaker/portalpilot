"use client";

import { PageHeader } from "@/components/shell";
import { Badge, Card } from "@/components/primitives";

const rows = [
  ["Solari Browser", "Portal interaction", "LIVE / configured"],
  ["Solari Sandbox", "Isolated evidence processing", "LIVE / configured"],
  ["Solari Desktop", "Legacy GUI fallback", "Adapter-ready"],
  ["In-app notifications", "Operational alerts", "Available"],
  ["Webhooks", "Outbound events", "Architecture ready"],
  ["Email / Slack", "External notifications", "Provider abstraction"],
];

export default function IntegrationsPage() {
  return (
    <div>
      <PageHeader title="Integrations" description="Execution and notification providers are kept behind explicit boundaries so the product can add connectors without rewriting the workflow engine." />
      <div className="grid gap-4 md:grid-cols-2">{rows.map(([name, purpose, state]) => <Card key={name} className="surface-hover p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="text-[15px] font-medium">{name}</h2><p className="mt-1 text-[12px] text-muted">{purpose}</p></div><Badge tone={state.includes("Available") || state.includes("configured") ? "success" : "neutral"}>{state}</Badge></div></Card>)}</div>
      <Card className="mt-5 p-5"><h2 className="section-title">Integration principle</h2><p className="mt-2 max-w-3xl text-[13px] leading-6 text-muted">External systems should never leak into the core domain model. Connectors observe and act; the application verifier decides whether evidence is sufficient; policies decide whether a human must approve the next step.</p></Card>
    </div>
  );
}
