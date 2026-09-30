"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { Card, StatusBadge } from "@/components/primitives";
import { useJson } from "@/components/use-json";
import { formatClock } from "@/lib/format";

type Bundle = {
  run: {
    id: string;
    applicationId: string;
    phase: string;
    resultStatus: string | null;
    currentStep: string | null;
    browserSessionId: string | null;
    sandboxId: string | null;
    mode: string;
    durationMs: number | null;
    startedAt: string;
    endedAt: string | null;
    cleanupStatus: string;
    browserCleanup: string | null;
    sandboxCleanup: string | null;
    errorMessage: string | null;
    replayUrl: string | null;
    preparedResponse: string | null;
    snapshotId: string | null;
    profileId: string | null;
    metrics: { cpuPct?: number; memBytes?: number; memTotalBytes?: number; diskBytes?: number } | null;
  };
  events: Array<{ id: string; at: string; type: string; message: string; phase: string | null }>;
};

const PHASES = [
  "CREATED",
  "BROWSER",
  "OBSERVING",
  "EXTRACTING",
  "SANDBOX",
  "VERIFYING",
  "PREPARING",
  "WAITING_APPROVAL",
  "SUBMITTING",
  "POST_VERIFY",
  "COMPLETE",
  "FAILED",
];

export default function RunPage() {
  const { id } = useParams<{ id: string }>();
  const { data, reload } = useJson<Bundle>(`/api/runs/${id}`);

  useEffect(() => {
    if (!data?.run) return;
    if (["COMPLETE", "FAILED", "WAITING_APPROVAL"].includes(data.run.phase)) return;
    const timer = setInterval(() => {
      void reload();
    }, 800);
    return () => clearInterval(timer);
  }, [data?.run, reload]);

  const run = data?.run;
  if (!run) return <p className="text-[13px] text-muted">Loading run…</p>;

  return (
    <div>
      <Link href={`/applications/${run.applicationId}`} className="text-[13px] text-muted">
        ← {run.applicationId}
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="page-title">Run {run.id}</h1>
        <StatusBadge status={run.resultStatus ?? run.phase} />
        <span className="rounded border border-line px-2 py-0.5 text-[11px] tracking-[0.08em]">{run.mode === "LIVE" ? "LIVE SOLARI" : "DEMO"}</span>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5">
          <h2 className="text-[13px] uppercase tracking-[0.08em] text-muted">Timeline</h2>
          <ol className="mt-4 space-y-3">
            {(data?.events ?? []).map((event) => (
              <li key={event.id} className="flex gap-3 text-[13px]">
                <span className="mono w-20 text-muted">{formatClock(event.at)}</span>
                <span>{event.message}</span>
              </li>
            ))}
          </ol>
        </Card>
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-[13px] uppercase tracking-[0.08em] text-muted">Current step</h2>
            <p className="mt-2 text-[16px] font-medium">{run.currentStep ?? run.phase}</p>
            <div className="mt-4 space-y-2 text-[12px]">
              {PHASES.map((phase) => {
                const idx = PHASES.indexOf(phase);
                const current = PHASES.indexOf(run.phase);
                const done = run.phase === "FAILED" ? false : idx < current || run.phase === "COMPLETE";
                const active = phase === run.phase;
                return (
                  <div key={phase} className="flex items-center gap-2">
                    <span>{done ? "✓" : active ? "●" : run.phase === "FAILED" && active ? "×" : "○"}</span>
                    <span className={active ? "font-medium" : "text-muted"}>{phase.replaceAll("_", " ")}</span>
                  </div>
                );
              })}
            </div>
          </Card>
          <details className="surface rounded-lg p-5">
            <summary className="cursor-pointer text-[13px] uppercase tracking-[0.08em] text-muted">Technical details</summary>
            <dl className="mt-3 space-y-1 text-[13px]">
              <div>
                Run <span className="mono">{run.id}</span>
              </div>
              <div>
                Browser <span className="mono">{run.browserSessionId ?? "—"}</span>
              </div>
              <div>
                Sandbox <span className="mono">{run.sandboxId ?? "—"}</span>
              </div>
              <div>Duration {run.durationMs ? `${Math.round(run.durationMs / 1000)}s` : "in progress"}</div>
              <div>Profile <span className="mono">{run.profileId ?? "—"}</span></div>
              <div>Snapshot <span className="mono">{run.snapshotId ?? "—"}</span></div>
              <div>Recording {run.replayUrl ? <a href={run.replayUrl} target="_blank" rel="noreferrer" className="text-accent">Replay available ↗</a> : "unavailable"}</div>
              <div>Cleanup {run.cleanupStatus}</div>
              <div>Browser cleanup: {run.browserCleanup ?? "pending"}</div>
              <div>Sandbox cleanup: {run.sandboxCleanup ?? "pending"}</div>
              {run.metrics ? <div className="mt-2 border-t border-line pt-2">
                <div>CPU {typeof run.metrics.cpuPct === "number" ? `${run.metrics.cpuPct.toFixed(0)}%` : "—"}</div>
                <div>Memory {typeof run.metrics.memBytes === "number" ? `${Math.round(run.metrics.memBytes / 1024 / 1024)} MB` : "—"}</div>
                <div>Disk {typeof run.metrics.diskBytes === "number" ? `${Math.round(run.metrics.diskBytes / 1024 / 1024)} MB` : "—"}</div>
              </div> : null}
              {run.errorMessage ? <div className="text-danger">{run.errorMessage}</div> : null}
            </dl>
          </details>
        </div>
      </div>
    </div>
  );
}
