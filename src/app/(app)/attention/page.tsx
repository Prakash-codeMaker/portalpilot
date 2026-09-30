"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shell";
import { Card, EmptyState, StatusBadge } from "@/components/primitives";
import { useJson } from "@/components/use-json";
import { formatDisplayDate } from "@/lib/format";

export default function AttentionPage() {
  const { data } = useJson<{ rows: Array<{ id: string; title: string; entity: string; site: string; status: string; deadline: string | null; lastChangeSummary: string | null }> }>(
    "/api/applications?attention=true&pageSize=50",
  );
  return (
    <div>
      <PageHeader title="Attention" description="Applications that are blocked, stale, conflicting, or waiting on a clarification." />
      {(data?.rows.length ?? 0) === 0 ? (
        <EmptyState title="You're all clear." body="Nothing currently needs attention." />
      ) : (
        <div className="grid gap-3">
          {(data?.rows ?? []).map((row) => (
            <Link key={row.id} href={`/applications/${row.id}`}>
              <Card className="p-4 hover:bg-canvas">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="mono text-muted">{row.id}</div>
                    <div className="font-medium">{row.title}</div>
                    <div className="meta">
                      {row.entity} · {row.site}
                    </div>
                  </div>
                  <StatusBadge status={row.status} />
                </div>
                <div className="mt-2 text-[13px] text-muted">
                  Deadline {formatDisplayDate(row.deadline)} · {row.lastChangeSummary}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
