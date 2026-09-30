"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shell";
import { Badge, Card, EmptyState } from "@/components/primitives";
import { useJson } from "@/components/use-json";
import { formatDisplayDateTime } from "@/lib/format";

type AuditRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  runId: string | null;
  actorUserId: string | null;
  createdAt: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
};

export default function AuditPage() {
  const [search, setSearch] = useState("");
  const { data } = useJson<{ logs: AuditRow[] }>("/api/audit?limit=120");
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data?.logs ?? [];
    return (data?.logs ?? []).filter((row) =>
      [row.action, row.entityType, row.entityId, row.runId, row.actorUserId]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [data, search]);

  return (
    <div>
      <PageHeader title="Audit log" description="Immutable operational history for state changes, approvals, evidence decisions and submission outcomes." />
      <div className="mb-4">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Filter action, application, run or actor…"
          className="h-9 w-full rounded-md border border-line bg-paper px-3 text-[13px] sm:max-w-md"
        />
      </div>
      {rows.length === 0 ? <EmptyState title="No audit events" body="Operational events will appear here as PortalPilot changes state." /> : null}
      {rows.length > 0 ? (
        <Card className="overflow-hidden p-0">
          <div className="table-wrap rounded-none border-0">
            <table>
              <thead>
                <tr><th>Time</th><th>Action</th><th>Entity</th><th>Actor</th><th>Run</th><th>State</th></tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap text-muted">{formatDisplayDateTime(row.createdAt)}</td>
                    <td><Badge>{row.action.replaceAll("_", " ")}</Badge></td>
                    <td><span className="mono">{row.entityId ?? "—"}</span><div className="meta">{row.entityType}</div></td>
                    <td className="text-muted">{row.actorUserId ?? "system"}</td>
                    <td className="mono text-muted">{row.runId ?? "—"}</td>
                    <td className="max-w-sm text-[11px] text-muted">{formatState(row.afterState ?? row.beforeState)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function formatState(value?: Record<string, unknown> | null) {
  if (!value) return "—";
  return Object.entries(value).slice(0, 3).map(([key, item]) => `${key}: ${String(item)}`).join(" · ");
}
