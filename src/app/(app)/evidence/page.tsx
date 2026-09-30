"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shell";
import { Badge, Card, EmptyState, StatusBadge } from "@/components/primitives";
import { useJson } from "@/components/use-json";
import { formatDisplayDateTime, shortHash } from "@/lib/format";

type Row = {
  id: string;
  applicationId: string;
  requirementId: string;
  documentId: string | null;
  documentName: string | null;
  documentType: string | null;
  documentVersion: number | null;
  field: string | null;
  extractedValue: string | null;
  status: string;
  quote: string | null;
  page: number | null;
  hash: string | null;
  observedAt: string;
};

export default function EvidencePage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    params.set("pageSize", "50");
    return `/api/evidence?${params.toString()}`;
  }, [search, status]);
  const { data } = useJson<{ rows: Row[]; total: number }>(query);

  return (
    <div>
      <PageHeader title="Evidence" description="Every important claim is traceable to a document, page, and hash." />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search certificate, Apex, MH-23881…"
          className="h-9 w-full rounded-md border border-line bg-paper px-3 text-[13px] sm:max-w-sm"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-md border border-line bg-paper px-3 text-[13px]">
          <option value="">Validity</option>
          {["VERIFIED", "FAILED", "CONFLICT", "STALE", "MISSING", "UNKNOWN"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      {(data?.rows.length ?? 0) === 0 ? (
        <EmptyState title="No evidence collected yet." body="Run a check against an application to index and verify documents." />
      ) : (
        <div className="grid gap-3">
          {(data?.rows ?? []).map((row) => (
            <Card key={row.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="mono text-muted">{row.applicationId}</div>
                  <div className="font-medium">
                    {row.field ?? "Evidence claim"}: {row.extractedValue ?? "—"}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                    <span className="font-medium text-ink-soft">{row.documentName ?? "Source unavailable"}</span>
                    {row.documentVersion ? <Badge>v{row.documentVersion}</Badge> : null}
                    {row.documentType ? <Badge>{row.documentType.replaceAll("_", " ")}</Badge> : null}
                  </div>
                  {row.quote ? <p className="mt-2 text-[13px] text-ink-soft">“{row.quote}”</p> : null}
                  <div className="meta mt-1">
                    Page {row.page ?? 1} · {formatDisplayDateTime(row.observedAt)} · {shortHash(row.hash)}
                  </div>
                </div>
                <StatusBadge status={row.status} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
