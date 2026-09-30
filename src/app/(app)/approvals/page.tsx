"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/shell";
import { Badge, Button, Card, EmptyState, Modal, StatusBadge } from "@/components/primitives";
import { postJson, useJson } from "@/components/use-json";

 type Item = {
  approval: { id: string; runId: string; status: string; applicationId: string; expiresAt?: string | null };
  run: { id: string; preparedResponse: string | null; resultStatus: string | null; phase: string } | null;
  application: { id: string; title: string; queryId: string | null; verifiedRequirementCount: number; totalRequirementCount: number } | null;
};

export default function ApprovalsPage() {
  const { data, reload } = useJson<{ items: Item[] }>("/api/approvals");
  const [selected, setSelected] = useState<Item | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = selected ?? data?.items[0] ?? null;

  async function approveAndSubmit() {
    if (!current) return;
    setBusy(true);
    setError(null);
    try {
      await postJson(`/api/runs/${current.approval.runId}/approve`);
      await postJson(`/api/runs/${current.approval.runId}/submit`);
      setConfirm(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to complete approval.");
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    if (!current) return;
    setBusy(true);
    setError(null);
    try { await postJson(`/api/runs/${current.approval.runId}/reject`); await reload(); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to reject approval."); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <PageHeader title="Approvals" description="Consequential actions remain here until an authorized human approves the exact prepared state." />
      {(data?.items.length ?? 0) === 0 ? (
        <EmptyState title="No pending approvals" body="Verified runs that are ready for a consequential action appear here." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-2">
            {(data?.items ?? []).map((item) => {
              const active = current?.approval.id === item.approval.id;
              return <button key={item.approval.id} onClick={() => setSelected(item)} className="block w-full text-left">
                <Card className={active ? "border-accent/40 bg-accent-soft/20 p-4" : "surface-hover p-4"}>
                  <div className="flex items-center justify-between gap-3"><span className="mono">{item.application?.id}</span><StatusBadge status="WAITING_APPROVAL" /></div>
                  <div className="mt-1 text-[14px] font-medium">{item.application?.title}</div>
                  <div className="mt-1 text-[12px] text-muted">Query {item.application?.queryId ?? "—"} · {item.application?.verifiedRequirementCount}/{item.application?.totalRequirementCount} requirements verified</div>
                </Card>
              </button>;
            })}
          </div>
          {current?.application ? (
            <Card className="p-5 lg:sticky lg:top-20 lg:self-start">
              <div className="flex items-start justify-between gap-3"><div><p className="meta">Human approval</p><h2 className="section-title mt-1">{current.application.title}</h2></div><Badge tone="info">{current.run?.phase ?? "WAITING"}</Badge></div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-[12px]"><div className="rounded bg-canvas p-3"><div className="meta">Application</div><div className="mono mt-1">{current.application.id}</div></div><div className="rounded bg-canvas p-3"><div className="meta">Query</div><div className="mono mt-1">{current.application.queryId ?? "—"}</div></div><div className="rounded bg-canvas p-3"><div className="meta">Verification</div><div className="mt-1 font-medium">{current.application.verifiedRequirementCount}/{current.application.totalRequirementCount}</div></div><div className="rounded bg-canvas p-3"><div className="meta">Action</div><div className="mt-1 font-medium">Submit clarification</div></div></div>
              <div className="mt-5"><div className="meta">Prepared response</div><p className="mt-2 rounded-md bg-canvas p-3 text-[13px] leading-6 text-ink-soft">{current.run?.preparedResponse ?? "No prepared response."}</p></div>
              {error ? <div className="mt-4 rounded-md border border-danger/30 bg-danger-soft p-3 text-[13px] text-danger">{error}</div> : null}
              <div className="mt-5 hidden gap-2 lg:flex"><Button variant="secondary" disabled={busy} onClick={() => void reject()}>Reject</Button><Button disabled={busy} onClick={() => setConfirm(true)}>{busy ? "Working…" : "Review & Submit"}</Button></div>
              <Link href={`/applications/${current.application.id}`} className="mt-4 inline-block text-[12px] text-accent">Open full application →</Link>
              <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper p-3 lg:hidden"><div className="flex gap-2"><Button className="flex-1" variant="secondary" disabled={busy} onClick={() => void reject()}>Reject</Button><Button className="flex-1" disabled={busy} onClick={() => setConfirm(true)}>Review & Submit</Button></div></div>
            </Card>
          ) : null}
        </div>
      )}
      <Modal open={confirm} title="Approve & submit?" onClose={() => { if (!busy) setConfirm(false); }}>
        <p className="text-[14px] leading-6 text-ink-soft">This approves the exact verified run and sends the prepared clarification and current supporting documents to the configured portal.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-[12px]"><div><div className="meta">Application</div><div className="mono mt-1">{current?.application?.id}</div></div><div><div className="meta">Documents</div><div className="mt-1">Current active set</div></div></div>
        <div className="mt-5 flex justify-end gap-2"><Button variant="secondary" disabled={busy} onClick={() => setConfirm(false)}>Cancel</Button><Button disabled={busy} onClick={() => void approveAndSubmit()}>{busy ? "Submitting…" : "Approve & Submit"}</Button></div>
      </Modal>
    </div>
  );
}
