"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/shell";
import { Badge, Button, Card } from "@/components/primitives";
import { postJson, useJson } from "@/components/use-json";

type Env = {
  mode: "DEMO" | "LIVE";
  demoDate: string;
  operatorName: string;
  workspaceName: string;
  liveConfigured: boolean;
  liveBlockedReason: string | null;
  solariBaseUrl: string;
};

const sections = [
  ["workspace", "Workspace", "Identity and operating context"],
  ["team", "Team", "Members and roles"],
  ["security", "Security", "Runtime and control posture"],
  ["notifications", "Notifications", "In-product alert preferences"],
  ["portals", "Portals", "Connector endpoints and capability registry"],
  ["usage", "Usage", "Environment and execution visibility"],
] as const;

export default function SettingsPage() {
  const { data, reload } = useJson<Env>("/api/environment");
  const [message, setMessage] = useState<string | null>(null);
  async function setMode(mode: "DEMO" | "LIVE") {
    setMessage(null);
    try {
      const result = await postJson<Env>("/api/environment", { mode });
      if (result.liveBlockedReason) setMessage(result.liveBlockedReason);
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update execution mode.");
    }
  }

  return (
    <div>
      <PageHeader title="Settings" description="Workspace configuration, execution controls, security posture and integration boundaries." />
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div><p className="meta">Execution environment</p><h2 className="section-title mt-1">{data?.mode === "LIVE" ? "LIVE SOLARI" : "DEMO"}</h2><p className="mt-1 text-[13px] text-muted">Mode is explicit. Live never silently falls back to demo.</p></div>
            <Badge tone={data?.mode === "LIVE" ? "accent" : "neutral"}>{data?.mode === "LIVE" ? "LIVE SOLARI" : "DEMO"}</Badge>
          </div>
          <div className="mt-5 flex gap-2"><Button variant={data?.mode === "DEMO" ? "primary" : "secondary"} onClick={() => void setMode("DEMO")}>DEMO</Button><Button variant={data?.mode === "LIVE" ? "primary" : "secondary"} onClick={() => void setMode("LIVE")}>LIVE SOLARI</Button></div>
          {data?.mode === "LIVE" && !data.liveConfigured ? <div className="mt-4 rounded-md border border-warning/30 bg-warning-soft p-3 text-[13px] text-warning">LIVE SOLARI MODE REQUIRES SOLARI_API_KEY</div> : null}
          {message ? <p className="mt-3 text-[13px] text-danger">{message}</p> : null}
          <dl className="mt-5 grid gap-4 border-t border-line pt-4 sm:grid-cols-2"><div><dt className="meta">Workspace</dt><dd className="mt-1">{data?.workspaceName}</dd></div><div><dt className="meta">Operator</dt><dd className="mt-1">{data?.operatorName}</dd></div><div><dt className="meta">Demo clock</dt><dd className="mt-1 mono">{data?.demoDate}</dd></div><div><dt className="meta">Solari gateway</dt><dd className="mt-1 mono">{data?.solariBaseUrl}</dd></div></dl>
        </Card>
        <Card className="p-5"><p className="meta">Control posture</p><h2 className="section-title mt-1">Trust boundaries</h2><div className="mt-4 space-y-3 text-[13px]"><Control label="LLM authority" value="Interpret / draft only" /><Control label="Submission" value="Human approval required" /><Control label="Outcome" value="Re-observe and verify" /><Control label="Evidence" value="Source + hash + timestamp" /><Control label="Credentials" value="Never sent to model" /></div></Card>
      </div>
      <div className="mt-6"><div className="mb-3 flex items-center justify-between"><div><h2 className="section-title">Configuration</h2><p className="meta mt-1">Product areas are isolated so the workflow engine stays stable as the platform grows.</p></div></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{sections.map(([key, title, desc]) => <Link key={key} href={`/settings/${key}`} className="surface surface-hover rounded-lg p-4"><div className="text-[14px] font-medium">{title}</div><div className="mt-1 text-[12px] leading-5 text-muted">{desc}</div><div className="mt-3 text-[12px] text-accent">Configure →</div></Link>)}</div></div>
    </div>
  );
}

function Control({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between border-b border-line pb-2 last:border-0 last:pb-0"><span className="text-muted">{label}</span><span className="font-medium">{value}</span></div>; }
