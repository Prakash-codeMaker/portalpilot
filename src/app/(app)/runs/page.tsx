"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/shell";
import { Badge, Button, Card, EmptyState, Skeleton, StatusBadge } from "@/components/primitives";
import { useJson } from "@/components/use-json";
import { formatDisplayDateTime } from "@/lib/format";

export default function RunsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [mode, setMode] = useState("");
  const query = new URLSearchParams({ page: String(page), pageSize: "25" });
  if (status) query.set("status", status);
  if (mode) query.set("mode", mode);
  const { data, loading } = useJson<{ rows: Array<any>; total: number; page: number; pageSize: number }>(`/api/runs?${query.toString()}`);

  return (
    <div>
      <PageHeader title="Runs" description="Every browser, sandbox, verifier and approval workflow becomes a reproducible run." actions={<Link href="/reliability"><Button variant="secondary">Reliability lab</Button></Link>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="h-9 rounded-md border border-line bg-paper px-3 text-[12px]">
          <option value="">All results</option>
          <option value="READY_FOR_APPROVAL">Ready for approval</option>
          <option value="SUBMISSION_VERIFIED">Submission verified</option>
          <option value="SUBMISSION_UNVERIFIED">Submission unverified</option>
          <option value="BLOCKED">Blocked</option>
          <option value="FAILED">Failed</option>
        </select>
        <select value={mode} onChange={(e) => { setMode(e.target.value); setPage(1); }} className="h-9 rounded-md border border-line bg-paper px-3 text-[12px]">
          <option value="">All modes</option>
          <option value="DEMO">Demo</option>
          <option value="LIVE">Live Solari</option>
        </select>
      </div>
      {loading && !data ? <Skeleton className="h-64" /> : null}
      {!loading && (data?.rows.length ?? 0) === 0 ? <EmptyState title="No runs found" body="Runs appear when an application check or submission workflow starts." /> : null}
      {(data?.rows.length ?? 0) > 0 ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Run</th><th>Application</th><th>Result</th><th>Mode</th><th>Resources</th><th>Started</th><th /></tr></thead>
            <tbody>
              {data?.rows.map((run) => (
                <tr key={run.id}>
                  <td><Link className="mono font-medium hover:text-accent" href={`/runs/${run.id}`}>{run.id}</Link></td>
                  <td><Link className="font-medium hover:text-accent" href={`/applications/${run.applicationId}`}>{run.applicationId}</Link></td>
                  <td><StatusBadge status={run.resultStatus ?? run.phase} /></td>
                  <td><Badge tone={run.mode === "LIVE" ? "accent" : "neutral"}>{run.mode === "LIVE" ? "LIVE SOLARI" : "DEMO"}</Badge></td>
                  <td className="text-muted">B {run.browserSessionId ? "✓" : "—"} · S {run.sandboxId ? "✓" : "—"}</td>
                  <td className="text-muted">{formatDisplayDateTime(run.startedAt)}</td>
                  <td><Link href={`/runs/${run.id}`} className="text-accent">Open →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {data && data.total > data.pageSize ? <div className="mt-4 flex items-center justify-between text-[12px] text-muted"><span>{(data.page - 1) * data.pageSize + 1}–{Math.min(data.page * data.pageSize, data.total)} of {data.total}</span><div className="flex gap-2"><Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((v) => v - 1)}>Previous</Button><Button size="sm" variant="secondary" disabled={page * data.pageSize >= data.total} onClick={() => setPage((v) => v + 1)}>Next</Button></div></div> : null}
    </div>
  );
}
