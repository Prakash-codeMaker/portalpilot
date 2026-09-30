"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/shell";
import { Badge, Button, Card, EmptyState, StatusBadge } from "@/components/primitives";
import { postJson, useJson } from "@/components/use-json";
import { formatDisplayDateTime } from "@/lib/format";

type Rule = {
  id: string;
  applicationId: string;
  enabled: boolean;
  intervalMinutes: number;
  changeTypes: string[];
  lastRunAt: string | null;
  nextRunAt: string | null;
};

export default function MonitoringPage() {
  const { data, reload } = useJson<{ rules: Rule[] }>("/api/monitoring");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function toggle(rule: Rule) {
    setBusy(rule.id);
    setMessage(null);
    try {
      await postJson("/api/monitoring", { id: rule.id, enabled: !rule.enabled });
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update monitoring.");
    } finally {
      setBusy(null);
    }
  }

  async function runNow(applicationId: string) {
    setBusy(`run:${applicationId}`);
    setMessage(null);
    try {
      await postJson(`/api/applications/${applicationId}/check`);
      setMessage(`Check queued for ${applicationId}.`);
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to queue check.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <PageHeader title="Monitoring" description="Persisted watch rules decide what PortalPilot observes, how often it checks, and which changes require attention." />
      {message ? <div className="mb-4 rounded-md border border-line bg-paper px-4 py-3 text-[13px]">{message}</div> : null}
      {(data?.rules.length ?? 0) === 0 ? <EmptyState title="No monitoring rules" body="Add a monitored application to create a schedule." /> : null}
      <div className="space-y-3">
        {(data?.rules ?? []).map((rule) => (
          <Card key={rule.id} className="p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><span className="mono">{rule.id}</span><StatusBadge status={rule.enabled ? "VERIFIED" : "UNKNOWN"} /><Badge>{rule.intervalMinutes >= 60 ? `Every ${rule.intervalMinutes / 60}h` : `Every ${rule.intervalMinutes}m`}</Badge></div>
                <h2 className="mt-2 text-[15px] font-medium"><Link className="hover:text-accent" href={`/applications/${rule.applicationId}`}>{rule.applicationId}</Link></h2>
                <p className="mt-1 text-[12px] text-muted">{rule.changeTypes.map((type) => type.replaceAll("_", " ")).join(" · ")}</p>
              </div>
              <div className="grid gap-2 text-[11px] text-muted sm:grid-cols-2 lg:min-w-[360px]">
                <div><div className="meta">Last run</div><div className="mt-1">{rule.lastRunAt ? formatDisplayDateTime(rule.lastRunAt) : "Never"}</div></div>
                <div><div className="meta">Next run</div><div className="mt-1">{rule.enabled && rule.nextRunAt ? formatDisplayDateTime(rule.nextRunAt) : "Paused"}</div></div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button size="sm" variant="secondary" disabled={busy === rule.id} onClick={() => void toggle(rule)}>{busy === rule.id ? "Saving…" : rule.enabled ? "Pause" : "Resume"}</Button>
                <Button size="sm" disabled={busy === `run:${rule.applicationId}`} onClick={() => void runNow(rule.applicationId)}>{busy === `run:${rule.applicationId}` ? "Queueing…" : "Run now"}</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Card className="mt-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="section-title">Worker model</h2>
            <p className="mt-2 max-w-3xl text-[13px] leading-6 text-muted">Monitoring rules are persisted in PostgreSQL. A worker enqueues due checks, claims jobs atomically, runs the workflow and advances the next check time. That keeps scheduling independent from a single browser tab or process.</p>
          </div>
          <Link href="/runs" className="text-[12px] text-accent">View runs →</Link>
        </div>
      </Card>
    </div>
  );
}
