"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Button, Card, ErrorState, Modal, Skeleton, StatusBadge, cx } from "@/components/primitives";
import { postJson, useJson } from "@/components/use-json";
import { formatClock, formatDisplayDate, formatDisplayDateTime, shortHash } from "@/lib/format";

type Bundle = {
  application: {
    id: string;
    title: string;
    entity: string;
    site: string;
    status: string;
    deadline: string | null;
    queryId: string | null;
    queryText: string | null;
    acknowledgement: string | null;
    evidenceState: string;
    verifiedRequirementCount: number;
    totalRequirementCount: number;
    lastCheckedAt: string | null;
  };
  documents: Array<{
    id: string;
    name: string;
    type: string;
    entity: string | null;
    site: string | null;
    issuedAt: string | null;
    expiresAt: string | null;
    certificateId: string | null;
    version: number;
    sha256: string;
    active: boolean;
    content: string;
  }>;
  requirements: Array<{ id: string; name: string; type: string; description: string; status: string; reason: string | null }>;
  evidence: Array<{
    id: string;
    requirementId: string;
    documentId: string | null;
    field: string | null;
    extractedValue: string | null;
    quote: string | null;
    page: number | null;
    status: string;
    hash: string | null;
  }>;
  events: Array<{ id: string; type: string; beforeValue: string | null; afterValue: string | null; observedAt: string }>;
  runs: Array<{
    id: string;
    phase: string;
    resultStatus: string | null;
    preparedResponse: string | null;
    browserSessionId: string | null;
    sandboxId: string | null;
    errorMessage: string | null;
    currentStep: string | null;
    startedAt: string;
    cleanupStatus: string;
    browserCleanup: string | null;
    sandboxCleanup: string | null;
    mode: string;
    durationMs: number | null;
  }>;
  approvals: Array<{ id: string; runId: string; status: string }>;
  portal: { lastMessage: string | null; successMessage: boolean; status: string } | null;
};

const TABS = ["Overview", "Changes", "Requirements", "Evidence", "Runs"] as const;

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data, loading, error, reload } = useJson<Bundle>(`/api/applications/${id}`);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [busy, setBusy] = useState<string | null>(null);
  const [inspector, setInspector] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const latestRun = data?.runs[0];
  const approval = data?.approvals.find((a) => a.runId === latestRun?.id);
  const ready = latestRun?.resultStatus === "READY_FOR_APPROVAL" && approval?.status !== "APPROVED";
  const approved = approval?.status === "APPROVED";
  const blocked = latestRun?.resultStatus === "BLOCKED" || latestRun?.phase === "FAILED";
  const unverified = latestRun?.resultStatus === "SUBMISSION_UNVERIFIED";
  const verified = latestRun?.resultStatus === "SUBMISSION_VERIFIED";
  const inspected = data?.documents.find((d) => d.id === inspector) ?? data?.documents.find((d) => d.name === inspector);

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(label);
    setToast(null);
    try {
      await fn();
      await reload();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(null);
    }
  }

  async function approveAndSubmit() {
    if (!latestRun) return;
    setBusy("approve-submit");
    setToast(null);
    try {
      if (approval?.status !== "APPROVED") {
        await postJson(`/api/runs/${latestRun.id}/approve`);
      }
      await postJson(`/api/runs/${latestRun.id}/submit`);
      setConfirm(false);
      await reload();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Unable to approve and submit.");
    } finally {
      setBusy(null);
    }
  }

  const changeEvents = useMemo(
    () => (data?.events ?? []).filter((e) => ["STATUS_CHANGED", "DEADLINE_CHANGED", "QUERY_RAISED", "QUERY_REMOVED"].includes(e.type)),
    [data],
  );

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24" />
        <p className="text-[13px] text-muted">Checking application...</p>
      </div>
    );
  }
  if (!data?.application) {
    return <ErrorState title="Application not found" body={error ?? "No record for this identifier."} />;
  }
  const app = data.application;
  const fire = data.requirements.find((r) => r.type === "FIRE_SAFETY_CERTIFICATE");

  return (
    <div className="pb-24 lg:pb-8">
      <Link href="/applications" className="text-[13px] text-muted hover:text-ink">
        ← Applications
      </Link>
      <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="page-title">{app.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="mono">{app.id}</span>
            <span className="text-muted">
              {app.entity}
              <span className="mx-1">·</span>
              {app.site}
            </span>
            <StatusBadge status={app.status} />
            <span className="text-[13px] text-muted">Deadline · {formatDisplayDate(app.deadline)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={Boolean(busy)} onClick={() => run("check", () => postJson(`/api/applications/${id}/check`))}>
            {busy === "check" ? "Running…" : "Run check"}
          </Button>
          <Link href="/approvals">
            <Button variant="secondary">Review</Button>
          </Link>
        </div>
      </div>

      {toast ? (
        <div className="mt-4 rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-[13px]">{toast}</div>
      ) : null}

      {blocked && fire?.status === "FAILED" ? (
        <div className="mt-5">
          <ErrorState
            title="Submission blocked"
            body={`Required evidence could not be verified. Fire safety certificate expired on 30 Aug 2026. Current date: 29 Sep 2026. The supplied certificate is not currently valid for this application.`}
            action={
              <Button
                onClick={() =>
                  run("replace", async () => {
                    await postJson("/api/demo/replace-certificate");
                    await postJson(`/api/applications/${id}/check`);
                  })
                }
              >
                Replace document
              </Button>
            }
          />
        </div>
      ) : null}

      {latestRun?.resultStatus === "READY_FOR_APPROVAL" ? (
        <Card className="mt-5 border-success/30 bg-success-soft p-5">
          <p className="text-[11px] uppercase tracking-[0.08em] text-success">Verification complete</p>
          <p className="mt-1 text-[16px] font-medium">
            {app.verifiedRequirementCount}/{app.totalRequirementCount} requirements verified
          </p>
          <p className="mt-1 text-[13px] text-ink-soft">
            {data.evidence.filter((e) => e.status === "VERIFIED").length}/{data.evidence.length} evidence claims supported · 0 conflicts · 0 stale evidence
          </p>
          <p className="mt-2 text-[13px] font-medium">Ready for human review</p>
        </Card>
      ) : null}

      {verified ? (
        <Card className="mt-5 border-success/30 bg-success-soft p-5">
          <p className="text-[11px] uppercase tracking-[0.08em] text-success">Submission verified</p>
          <p className="mt-1 text-[16px] font-medium">Acknowledgement {app.acknowledgement ?? "ACK-89218"}</p>
          <p className="mt-1 text-[13px]">Reopening the application confirmed status SUBMITTED.</p>
        </Card>
      ) : null}

      {unverified ? (
        <ErrorState
          title="Submission unverified"
          body={latestRun?.errorMessage ?? "The portal displayed a successful submission message, but reopening the application showed DRAFT."}
        />
      ) : null}

      <div className="mt-6 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={cx(
              "px-3 py-2 text-[13px]",
              tab === item ? "border-b-2 border-ink text-ink" : "text-muted hover:text-ink",
            )}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === "Overview" ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
          <div className="space-y-4">
            <Card className="p-5">
              <h2 className="text-[13px] uppercase tracking-[0.08em] text-muted">Query</h2>
              {app.queryId ? (
                <>
                  <div className="mono mt-2">{app.queryId}</div>
                  <p className="mt-2 text-[14px]">“{app.queryText}”</p>
                </>
              ) : (
                <p className="mt-2 text-[13px] text-muted">No open clarification.</p>
              )}
            </Card>
            <RequirementsList requirements={data.requirements} documents={data.documents} evidence={data.evidence} />
          </div>
          <div className="space-y-4">
            {latestRun ? <RunCard run={latestRun} /> : <Card className="p-5 text-[13px] text-muted">No runs yet.</Card>}
            {ready || approved ? (
              <ApprovalBox
                app={app}
                run={latestRun}
                approvalStatus={approval?.status ?? "PENDING"}
                documents={data.documents.filter((d) => d.active)}
                busy={busy}
                onApprove={() => run("approve", () => postJson(`/api/runs/${latestRun!.id}/approve`))}
                onReject={() => run("reject", () => postJson(`/api/runs/${latestRun!.id}/reject`))}
                onSubmit={() => setConfirm(true)}
              />
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "Changes" ? <ChangeDiff events={changeEvents} all={data.events} /> : null}
      {tab === "Requirements" ? (
        <div className="mt-5">
          <RequirementsList requirements={data.requirements} documents={data.documents} evidence={data.evidence} expanded />
        </div>
      ) : null}
      {tab === "Evidence" ? (
        <EvidenceGraph
          requirements={data.requirements}
          documents={data.documents}
          evidence={data.evidence}
          onOpen={(docId) => setInspector(docId)}
        />
      ) : null}
      {tab === "Runs" ? <RunsList runs={data.runs} /> : null}

      {inspector && inspected ? (
        <EvidenceInspector doc={inspected} evidence={data.evidence} onClose={() => setInspector(null)} />
      ) : null}

      <Modal open={confirm} title="Approve & submit?" onClose={() => setConfirm(false)}>
        <p className="text-[14px] text-ink-soft">
          This will send the prepared clarification and supporting documents to the external portal.
        </p>
        <div className="mt-3 space-y-1 text-[13px]">
          <div>
            Application: <span className="mono">{app.id}</span>
          </div>
          <div>Documents: {data.documents.filter((d) => d.active).length}</div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirm(false)}>
            Cancel
          </Button>
          <Button disabled={busy === "approve-submit"} onClick={() => void approveAndSubmit()}>
            {busy === "approve-submit" ? "Submitting…" : "Approve & Submit"}
          </Button>
        </div>
      </Modal>

      {(ready || approved) && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper p-3 lg:hidden">
          <div className="flex gap-2">
            <Button className="flex-1" variant="secondary" onClick={() => run("reject", () => postJson(`/api/runs/${latestRun!.id}/reject`))}>
              Reject
            </Button>
            <Button className="flex-1" onClick={() => setConfirm(true)}>
              Approve & Submit
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function RequirementsList({
  requirements,
  documents,
  evidence,
  expanded = false,
}: {
  requirements: Bundle["requirements"];
  documents: Bundle["documents"];
  evidence: Bundle["evidence"];
  expanded?: boolean;
}) {
  const [open, setOpen] = useState<string | null>(expanded ? requirements[0]?.id ?? null : null);
  const verified = requirements.filter((r) => r.status === "VERIFIED").length;
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] uppercase tracking-[0.08em] text-muted">Requirements</h2>
        <span className="text-[13px]">
          {verified} / {requirements.length} verified
        </span>
      </div>
      <div className="mt-4 divide-y divide-line">
        {requirements.map((req) => {
          const doc = documents.find((d) => d.type === req.type && d.active);
          const related = evidence.filter((e) => e.requirementId === req.id);
          return (
            <div key={req.id} className="py-3">
              <button className="flex w-full items-start justify-between gap-3 text-left" onClick={() => setOpen(open === req.id ? null : req.id)}>
                <div>
                  <div className="flex items-center gap-2">
                    <span aria-hidden>{req.status === "VERIFIED" ? "✓" : "×"}</span>
                    <span className="font-medium">{req.name}</span>
                  </div>
                  <div className="meta mt-1">
                    {req.status === "VERIFIED" ? `Verified · ${doc?.name ?? "document"}` : req.reason ?? req.status}
                  </div>
                </div>
                <StatusBadge status={req.status} />
              </button>
              {open === req.id ? (
                <div className="mt-3 grid gap-2 bg-canvas px-3 py-3 text-[13px]">
                  <div>Why required: {req.description}</div>
                  <div>Source: authority clarification</div>
                  <div>Evidence: {doc?.name ?? "None"}</div>
                  <div>Verification checks: {related.map((e) => `${e.field} ${e.status}`).join(" · ") || "—"}</div>
                  <div>Result: {req.status}</div>
                </div>
              ) : null}
            </div>
          );
        })}
        {requirements.length === 0 ? <p className="py-6 text-[13px] text-muted">No requirements extracted yet. Run a check after a clarification is raised.</p> : null}
      </div>
    </Card>
  );
}

function ChangeDiff({
  events,
  all,
}: {
  events: Bundle["events"];
  all: Bundle["events"];
}) {
  const status = events.find((e) => e.type === "STATUS_CHANGED");
  const deadline = events.find((e) => e.type === "DEADLINE_CHANGED");
  const query = events.find((e) => e.type === "QUERY_RAISED");
  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <h2 className="text-[13px] uppercase tracking-[0.08em] text-muted">What changed</h2>
        {status ? (
          <DiffBlock label="Status" before={status.beforeValue} after={status.afterValue} />
        ) : (
          <p className="mt-3 text-[13px] text-muted">No status change stored.</p>
        )}
        {deadline ? <DiffBlock label="Deadline" before={deadline.beforeValue} after={deadline.afterValue} /> : null}
        {query ? (
          <div className="mt-5">
            <div className="text-[12px] uppercase tracking-[0.08em] text-muted">New query</div>
            <div className="mono mt-1">Q-291</div>
            <p className="mt-2 text-[14px]">“{query.afterValue}”</p>
            <p className="meta mt-2">Observed {formatDisplayDateTime(query.observedAt)}</p>
          </div>
        ) : null}
      </Card>
      <Card className="p-5">
        <h2 className="text-[13px] uppercase tracking-[0.08em] text-muted">Persisted events</h2>
        <ul className="mt-3 space-y-2 text-[13px]">
          {all.map((event) => (
            <li key={event.id} className="flex justify-between gap-3">
              <span>{event.type.replaceAll("_", " ")}</span>
              <span className="meta">{formatDisplayDateTime(event.observedAt)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function DiffBlock({ label, before, after }: { label: string; before?: string | null; after?: string | null }) {
  return (
    <div className="mt-4">
      <div className="text-[12px] uppercase tracking-[0.08em] text-muted">{label}</div>
      <div className="mt-2 text-[14px] text-muted line-through">{before ? before.replaceAll("_", " ") : "—"}</div>
      <div className="text-[12px] text-muted">↓</div>
      <div className="text-[15px] font-medium">{after ? after.replaceAll("_", " ") : "—"}</div>
    </div>
  );
}

function EvidenceGraph({
  requirements,
  documents,
  evidence,
  onOpen,
}: {
  requirements: Bundle["requirements"];
  documents: Bundle["documents"];
  evidence: Bundle["evidence"];
  onOpen: (id: string) => void;
}) {
  return (
    <div className="mt-5 space-y-4">
      {requirements.map((req) => {
        const doc = documents.find((d) => d.type === req.type && d.active);
        const claims = evidence.filter((e) => e.requirementId === req.id);
        return (
          <Card key={req.id} className="p-5">
            <div className="text-[12px] uppercase tracking-[0.08em] text-muted">{req.name}</div>
            <div className="mt-3 border-l border-line pl-4">
              <div className="text-[12px] text-muted">Supports</div>
              <button className="mt-1 text-left font-medium hover:text-accent" onClick={() => doc && onOpen(doc.id)}>
                {doc?.name ?? "No document"}
              </button>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {claims.map((claim) => (
                  <div key={claim.id} className="rounded-md bg-canvas px-3 py-2 text-[13px]">
                    <div className="meta">{claim.field}</div>
                    <div>
                      {claim.extractedValue} {claim.status === "VERIFIED" ? "✓" : "×"}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                Result: <StatusBadge status={req.status} />
              </div>
            </div>
          </Card>
        );
      })}
      {requirements.length === 0 ? <p className="text-[13px] text-muted">No evidence collected yet.</p> : null}
    </div>
  );
}

function EvidenceInspector({
  doc,
  evidence,
  onClose,
}: {
  doc: Bundle["documents"][number];
  evidence: Bundle["evidence"];
  onClose: () => void;
}) {
  const related = evidence.filter((e) => e.documentId === doc.id);
  return (
    <div className="fixed inset-0 z-40 lg:inset-y-0 lg:left-auto lg:w-[420px]">
      <button className="absolute inset-0 bg-ink/30 lg:hidden" aria-label="Close inspector" onClick={onClose} />
      <aside className="drawer-enter absolute inset-y-0 right-0 w-full overflow-y-auto border-l border-line bg-paper p-5 lg:w-[420px]">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[12px] uppercase tracking-[0.08em] text-muted">Document</div>
            <h3 className="mt-1 text-[16px] font-medium">{doc.name}</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="mt-4 space-y-2 text-[13px]">
          <div>Status: {doc.active ? "Active" : "Superseded"}</div>
          <div>Document type: {doc.type.replaceAll("_", " ")}</div>
          <div>Entity: {doc.entity}</div>
          <div>Site: {doc.site}</div>
          <div>Issue: {formatDisplayDate(doc.issuedAt)}</div>
          <div>Expiry: {formatDisplayDate(doc.expiresAt)}</div>
          <div>
            SHA-256 <span className="mono">{shortHash(doc.sha256)}</span>
          </div>
          <div>Version {doc.version}</div>
        </div>
        <h4 className="mt-5 text-[12px] uppercase tracking-[0.08em] text-muted">Verification</h4>
        <ul className="mt-2 space-y-1 text-[13px]">
          {related.map((item) => (
            <li key={item.id}>
              {item.field} · {item.status}
            </li>
          ))}
        </ul>
        <h4 className="mt-5 text-[12px] uppercase tracking-[0.08em] text-muted">Extracted text</h4>
        <pre className="mt-2 whitespace-pre-wrap rounded-md bg-canvas p-3 text-[12px] leading-5">{doc.content}</pre>
      </aside>
    </div>
  );
}

function RunCard({ run }: { run: Bundle["runs"][number] }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] uppercase tracking-[0.08em] text-muted">Latest run</h2>
        <StatusBadge status={run.resultStatus ?? run.phase} />
      </div>
      <div className="mono mt-2">{run.id}</div>
      <p className="mt-2 text-[13px]">{run.currentStep}</p>
      <Link href={`/runs/${run.id}`} className="mt-3 inline-block text-[13px] text-accent">
        Open command center
      </Link>
    </Card>
  );
}

function ApprovalBox({
  app,
  run,
  approvalStatus,
  documents,
  busy,
  onApprove,
  onReject,
  onSubmit,
}: {
  app: Bundle["application"];
  run?: Bundle["runs"][number];
  approvalStatus: string;
  documents: Bundle["documents"];
  busy: string | null;
  onApprove: () => void;
  onReject: () => void;
  onSubmit: () => void;
}) {
  const approved = approvalStatus === "APPROVED";
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div><h2 className="text-[13px] uppercase tracking-[0.08em] text-muted">Human approval</h2><p className="mt-1 text-[12px] text-muted">The approval binds the prepared run to its current evidence and portal state.</p></div>
        <StatusBadge status={approved ? "APPROVED" : "WAITING_APPROVAL"} />
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-[12px]">
        <div><dt className="meta">Application</dt><dd className="mono mt-1">{app.id}</dd></div>
        <div><dt className="meta">Query</dt><dd className="mono mt-1">{app.queryId ?? "—"}</dd></div>
        <div><dt className="meta">Verification</dt><dd className="mt-1 font-medium">{app.verifiedRequirementCount}/{app.totalRequirementCount} requirements</dd></div>
        <div><dt className="meta">Current documents</dt><dd className="mt-1 font-medium">{documents.length}</dd></div>
      </dl>
      <div className="mt-4"><div className="meta">Prepared response</div><p className="mt-2 rounded-md bg-canvas p-3 text-[13px] leading-6 text-ink-soft">{run?.preparedResponse ?? "No prepared response."}</p></div>
      <div className="mt-4 rounded-md border border-line bg-canvas px-3 py-3 text-[12px] text-muted">
        Before submission PortalPilot re-checks the portal and verifies that the approved evidence set has not changed. Any material change invalidates approval.
      </div>
      <div className="mt-4 hidden gap-2 lg:flex">
        <Button variant="secondary" disabled={Boolean(busy)} onClick={onReject}>Reject</Button>
        {!approved ? <Button disabled={Boolean(busy)} onClick={onApprove}>{busy === "approve" ? "Approving…" : "Approve"}</Button> : null}
        {approved ? <Button disabled={Boolean(busy)} onClick={onSubmit}>{busy === "submit" ? "Submitting…" : "Submit approved run"}</Button> : null}
        {!approved ? <Button variant="secondary" disabled={Boolean(busy)} onClick={onSubmit}>Review & Submit</Button> : null}
      </div>
    </Card>
  );
}

function RunsList({ runs }: { runs: Bundle["runs"] }) {
  return (
    <div className="mt-5 space-y-3">
      {runs.map((run) => (
        <Link key={run.id} href={`/runs/${run.id}`} className="block">
          <Card className="p-4 hover:bg-canvas">
            <div className="flex items-center justify-between">
              <span className="mono">{run.id}</span>
              <StatusBadge status={run.resultStatus ?? run.phase} />
            </div>
            <div className="meta mt-1">
              {formatDisplayDateTime(run.startedAt)} · {run.mode}
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
