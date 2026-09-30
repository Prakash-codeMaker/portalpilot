"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shell";
import { Badge, Button, Card, EmptyState, Modal, Skeleton, StatusBadge } from "@/components/primitives";
import { postJson, useJson } from "@/components/use-json";
import { daysUntil, formatDisplayDate, formatDisplayDateTime } from "@/lib/format";

type Row = {
  id: string;
  title: string;
  entity: string;
  site: string;
  portal: string;
  status: string;
  deadline: string | null;
  evidenceState: string;
  lastChangeAt: string | null;
  lastCheckedAt: string | null;
  needsAttention: boolean;
  verifiedRequirementCount: number;
  totalRequirementCount: number;
};

type SavedView = { id: string; name: string; filters: Record<string, unknown> };

export default function ApplicationsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [attention, setAttention] = useState(false);
  const [sort, setSort] = useState("deadline");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [savedViewName, setSavedViewName] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (attention) params.set("attention", "true");
    params.set("sort", sort);
    params.set("page", String(page));
    params.set("pageSize", "25");
    return `/api/applications?${params.toString()}`;
  }, [search, status, attention, sort, page]);

  const { data, loading, reload } = useJson<{ rows: Row[]; total: number; page: number; pageSize: number }>(query);
  const saved = useJson<{ views: SavedView[] }>("/api/saved-views?resource=applications");
  const chips = [
    status ? { key: "status", label: status.replaceAll("_", " "), clear: () => setStatus("") } : null,
    attention ? { key: "attention", label: "Needs attention", clear: () => setAttention(false) } : null,
  ].filter(Boolean) as Array<{ key: string; label: string; clear: () => void }>;

  async function createView() {
    if (!savedViewName.trim()) return;
    await postJson("/api/saved-views", { name: savedViewName.trim(), filters: { search, status, attention, sort } });
    setSavedViewName("");
    await saved.reload();
    setMessage("Saved view created.");
  }

  async function createApplication(payload: { id?: string; title: string; entity: string; site: string; deadline: string; portal: string }) {
    await postJson("/api/applications", payload);
    setCreateOpen(false);
    setMessage("Application connected.");
    await reload();
  }

  return (
    <div className="page-section fade-in">
      <PageHeader
        eyebrow="Operations / register"
        title="Applications"
        description="The source of truth for external approval workflows. Every record is connected to a portal, an owner, evidence and a monitoring policy."
        actions={<Button onClick={() => setCreateOpen(true)}>Add application</Button>}
      />

      <div className="mb-5 flex flex-wrap items-center gap-2 text-[12px] text-muted">
        <span className="font-semibold text-ink">{data?.total ?? 0}</span> tracked applications
        <span className="text-line-strong">·</span>
        <span>sorted by {sort === "deadline" ? "deadline" : sort === "checked" ? "last checked" : sort === "updated" ? "recent change" : "status"}</span>
      </div>

      <div className="rounded-2xl border border-line bg-paper">
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search applications, entities, sites, IDs..." className="input-control pl-10" />
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">⌕</span>
          </div>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="input-control w-full lg:w-48">
            <option value="">All statuses</option>
            {["DRAFT", "SUBMITTED", "UNDER_REVIEW", "CLARIFICATION_REQUIRED", "APPROVED", "REJECTED"].map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="input-control w-full lg:w-44">
            <option value="deadline">Deadline</option>
            <option value="checked">Last checked</option>
            <option value="status">Status</option>
            <option value="updated">Recent change</option>
          </select>
          <label className="flex h-10 shrink-0 items-center gap-2 rounded-[9px] border border-line bg-paper px-3 text-[12px] font-medium">
            <input type="checkbox" checked={attention} onChange={(e) => { setAttention(e.target.checked); setPage(1); }} />
            Needs attention
          </label>
        </div>

        {(chips.length || (saved.data?.views.length ?? 0) > 0) ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
            {chips.map((chip) => <button key={chip.key} onClick={chip.clear} className="rounded-full border border-accent/20 bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent-2">{chip.label} ×</button>)}
            {(saved.data?.views ?? []).map((view) => <button key={view.id} className="rounded-full border border-line bg-canvas px-2.5 py-1 text-[11px] font-semibold text-ink-soft hover:border-line-strong" onClick={() => { const f = view.filters as { search?: string; status?: string; attention?: boolean; sort?: string }; setSearch(String(f.search ?? "")); setStatus(String(f.status ?? "")); setAttention(Boolean(f.attention)); setSort(String(f.sort ?? "deadline")); setPage(1); }}>{view.name}</button>)}
            <div className="ml-auto flex items-center gap-2">
              <input value={savedViewName} onChange={(e) => setSavedViewName(e.target.value)} placeholder="Save current view" className="hidden h-8 w-36 rounded-lg border border-line px-2.5 text-[11px] sm:block" />
              <button onClick={() => void createView()} className="text-[11px] font-semibold text-accent">Save view</button>
            </div>
          </div>
        ) : null}

        {message ? <div className="m-4 rounded-xl border border-accent/20 bg-accent-soft px-4 py-3 text-[12px] font-medium text-accent-2">{message}</div> : null}

        {loading && !data ? <div className="p-4"><Skeleton className="h-80" /></div> : null}

        {(data?.rows.length ?? 0) > 0 ? (
          <div className="table-wrap rounded-none border-0">
            <table>
              <thead>
                <tr><th>Application</th><th>Status</th><th>Portal</th><th>Evidence</th><th>Deadline</th><th>Last change</th><th>Checked</th><th /></tr>
              </thead>
              <tbody>
                {data?.rows.map((row) => {
                  const due = row.deadline ? daysUntil(row.deadline) : null;
                  const isDemo = row.portal.startsWith("PortalPilot Demo");
                  return (
                    <tr key={row.id}>
                      <td>
                        <Link href={`/applications/${row.id}`} className="group block min-w-[250px]">
                          <div className="flex items-center gap-2"><span className="font-semibold tracking-[-0.01em] group-hover:text-accent">{row.title}</span>{isDemo ? <Badge>Demo</Badge> : null}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-2"><span className="mono text-muted">{row.id}</span><span className="text-muted">{row.entity}</span><span className="text-line-strong">·</span><span className="text-muted">{row.site}</span></div>
                        </Link>
                      </td>
                      <td><StatusBadge status={row.status} /></td>
                      <td><div className="max-w-[180px] text-[12px] font-medium">{row.portal}</div></td>
                      <td><div className={row.totalRequirementCount > 0 && row.verifiedRequirementCount < row.totalRequirementCount ? "font-semibold text-warning" : "font-semibold text-success"}>{row.verifiedRequirementCount}/{row.totalRequirementCount || "—"}</div><div className="mt-0.5 text-[11px] text-muted">{row.evidenceState.toLowerCase()}</div></td>
                      <td><div className="font-medium">{formatDisplayDate(row.deadline)}</div>{due !== null && due <= 7 ? <div className={due < 0 ? "mt-0.5 text-[11px] text-danger" : "mt-0.5 text-[11px] text-warning"}>{due < 0 ? `${Math.abs(due)}d overdue` : `Due in ${due}d`}</div> : null}</td>
                      <td><div className="max-w-[170px] text-[12px] text-ink-soft">{row.lastChangeAt ? formatDisplayDateTime(row.lastChangeAt) : "No recorded change"}</div></td>
                      <td><span className="text-[12px] text-muted">{formatDisplayDateTime(row.lastCheckedAt)}</span></td>
                      <td><Link href={`/applications/${row.id}`} className="text-[12px] font-semibold text-accent">Open →</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {!loading && (data?.rows.length ?? 0) === 0 ? (
        <Card className="mt-5"><EmptyState title="No connected applications" body="PortalPilot does not invent fleet data. Add a real application, connect a portal, and monitoring will appear here." action={<Button onClick={() => setCreateOpen(true)}>Connect an application</Button>} /></Card>
      ) : null}

      {data && data.total > data.pageSize ? <div className="mt-4 flex items-center justify-between text-[12px] text-muted"><span>{(data.page - 1) * data.pageSize + 1}–{Math.min(data.page * data.pageSize, data.total)} of {data.total}</span><div className="flex gap-2"><Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button><Button size="sm" variant="secondary" disabled={page * data.pageSize >= data.total} onClick={() => setPage((p) => p + 1)}>Next</Button></div></div> : null}

      <Modal open={createOpen} title="Connect an application" onClose={() => setCreateOpen(false)}>
        <ApplicationForm onSubmit={createApplication} onCancel={() => setCreateOpen(false)} />
      </Modal>
    </div>
  );
}

function ApplicationForm({ onSubmit, onCancel }: { onSubmit: (payload: { id?: string; title: string; entity: string; site: string; deadline: string; portal: string }) => Promise<void>; onCancel: () => void }) {
  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [entity, setEntity] = useState("");
  const [site, setSite] = useState("");
  const [portal, setPortal] = useState("");
  const [deadline, setDeadline] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true);
    setError("");
    try {
      await onSubmit({ id: id.trim() || undefined, title: title.trim(), entity: entity.trim(), site: site.trim(), deadline, portal: portal.trim() });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to connect application");
    } finally {
      setBusy(false);
    }
  }

  return <div className="space-y-4">
    <div className="rounded-xl border border-line bg-canvas/55 px-4 py-3 text-[12px] leading-5 text-muted">This creates a real application record. Portal credentials and authenticated browser profiles are configured separately; they are never stored in this form.</div>
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Application ID" value={id} onChange={setId} placeholder="e.g. MH-23881" />
      <Field label="Portal" value={portal} onChange={setPortal} placeholder="e.g. NSWS" />
    </div>
    <Field label="Application title" value={title} onChange={setTitle} placeholder="Factory expansion approval" />
    <div className="grid gap-3 sm:grid-cols-2"><Field label="Organization" value={entity} onChange={setEntity} placeholder="Acme Manufacturing" /><Field label="Site" value={site} onChange={setSite} placeholder="Pune Plant" /></div>
    <label className="block text-[12px] font-semibold text-ink">Deadline<input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="input-control mt-1.5" /></label>
    {error ? <div className="rounded-xl border border-danger/20 bg-danger-soft px-3 py-2 text-[12px] text-danger">{error}</div> : null}
    <div className="flex justify-end gap-2 pt-1"><Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button><Button disabled={busy || !title || !entity || !site || !portal} onClick={() => void submit()}>{busy ? "Connecting…" : "Connect application"}</Button></div>
  </div>;
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="block text-[12px] font-semibold text-ink">{label}<input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input-control mt-1.5" /></label>;
}
