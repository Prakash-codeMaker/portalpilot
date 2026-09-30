"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shell";
import { Badge, Button, Card, EmptyState, Modal, StatusBadge } from "@/components/primitives";
import { postJson, useJson } from "@/components/use-json";
import { formatDisplayDate } from "@/lib/format";

export default function DocumentsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const query = useMemo(() => `/api/documents?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}&pageSize=50`, [search, status]);
  const { data, loading, reload } = useJson<{ rows: Array<any>; total: number; page: number; pageSize: number }>(query);

  async function upload(payload: any) {
    await postJson("/api/documents", payload);
    setUploadOpen(false);
    setMessage("Document added to the current evidence set.");
    await reload();
  }

  return (
    <div>
      <PageHeader title="Documents" description="Versioned evidence inventory. Historical artifacts remain intact when a newer document supersedes them." actions={<Button onClick={() => setUploadOpen(true)}>Add document</Button>} />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search document, entity, site, certificate…" className="h-9 flex-1 rounded-md border border-line bg-paper px-3 text-[12px] outline-none focus:border-accent" /><select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-md border border-line bg-paper px-3 text-[12px]"><option value="">All documents</option><option value="ACTIVE">Active</option><option value="SUPERSEDED">Superseded</option></select></div>
      {message ? <div className="mb-3 rounded-md border border-accent/20 bg-accent-soft/40 px-3 py-2 text-[12px]">{message}</div> : null}
      {loading && !data ? <div className="surface h-56 rounded-lg" /> : null}
      {(data?.rows.length ?? 0) > 0 ? <Card className="overflow-hidden p-0"><div className="table-wrap rounded-none border-0"><table><thead><tr><th>Document</th><th>Type</th><th>Entity / site</th><th>Validity</th><th>Version</th><th>Hash</th><th>Application</th></tr></thead><tbody>{data?.rows.map((doc) => <tr key={doc.id}><td><div className="font-medium">{doc.name}</div><div className="meta">{formatDisplayDate(doc.createdAt)}</div></td><td><Badge>{doc.type.replaceAll("_", " ")}</Badge></td><td>{doc.entity || "—"}<div className="meta">{doc.site || "—"}</div></td><td>{doc.expiresAt ? <div><div>{formatDisplayDate(doc.expiresAt)}</div><StatusBadge status={doc.active ? "VERIFIED" : "STALE"} /></div> : <span className="text-muted">No expiry</span>}</td><td><span className="mono">v{doc.version}</span> {doc.active ? <Badge tone="success">Active</Badge> : <Badge>Superseded</Badge>}</td><td className="mono">{doc.sha256.slice(0, 12)}…</td><td><Link href={`/applications/${doc.applicationId}?tab=Evidence`} className="text-accent">{doc.applicationId}</Link></td></tr>)}</tbody></table></div></Card> : null}
      {!loading && (data?.rows.length ?? 0) === 0 ? <EmptyState title="No documents found" body="Upload or replace evidence from an application workflow." action={<Button onClick={() => setUploadOpen(true)}>Add document</Button>} /> : null}
      {data && data.total > data.pageSize ? <div className="mt-3 text-[12px] text-muted">Showing first {data.pageSize} of {data.total}. Use search and filters to narrow large evidence stores.</div> : null}
      <Modal open={uploadOpen} title="Add document" onClose={() => setUploadOpen(false)}><DocumentForm onCancel={() => setUploadOpen(false)} onSubmit={upload} /></Modal>
    </div>
  );
}

function DocumentForm({ onSubmit, onCancel }: { onSubmit: (payload: any) => Promise<void>; onCancel: () => void }) {
  const [applicationId, setApplicationId] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("FIRE_SAFETY_CERTIFICATE");
  const [entity, setEntity] = useState("");
  const [site, setSite] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [certificateId, setCertificateId] = useState("");
  const [content, setContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function fileChanged(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    setName(file.name);
    if (file.size > 1_500_000) { setError("File is larger than the 1.5MB demo limit."); return; }
    try { setContent(await file.text()); } catch { setError("Unable to read the selected text fixture."); }
  }
  async function submit() { setBusy(true); setError(""); try { await onSubmit({ applicationId, name, type, entity, site, issuedAt, expiresAt, certificateId, content }); } catch (e) { setError(e instanceof Error ? e.message : "Upload failed"); } finally { setBusy(false); } }
  return <div className="space-y-3"><div className="rounded-md border border-line bg-canvas px-3 py-2 text-[11px] text-muted">For this demo build, text-readable fixtures are ingested directly. Production storage should upload binary files to an object store and hand only scoped artifacts to the sandbox.</div><input value={applicationId} onChange={(e)=>setApplicationId(e.target.value)} placeholder="Application ID" className="h-9 w-full rounded-md border border-line px-3 text-[12px]"/><div className="grid gap-2 sm:grid-cols-2"><input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Filename" className="h-9 rounded-md border border-line px-3 text-[12px]"/><input value={type} onChange={(e)=>setType(e.target.value)} placeholder="Document type" className="h-9 rounded-md border border-line px-3 text-[12px]"/></div><input type="file" accept=".txt,.md,.json,.csv" onChange={(e)=>void fileChanged(e.target.files?.[0])} className="block w-full text-[12px]"/>{fileName?<div className="meta">Selected {fileName}</div>:null}<div className="grid gap-2 sm:grid-cols-2"><input value={entity} onChange={(e)=>setEntity(e.target.value)} placeholder="Entity" className="h-9 rounded-md border border-line px-3 text-[12px]"/><input value={site} onChange={(e)=>setSite(e.target.value)} placeholder="Site" className="h-9 rounded-md border border-line px-3 text-[12px]"/></div><div className="grid gap-2 sm:grid-cols-3"><input type="date" value={issuedAt} onChange={(e)=>setIssuedAt(e.target.value)} className="h-9 rounded-md border border-line px-3 text-[12px]"/><input type="date" value={expiresAt} onChange={(e)=>setExpiresAt(e.target.value)} className="h-9 rounded-md border border-line px-3 text-[12px]"/><input value={certificateId} onChange={(e)=>setCertificateId(e.target.value)} placeholder="Certificate ID" className="h-9 rounded-md border border-line px-3 text-[12px]"/></div><textarea value={content} onChange={(e)=>setContent(e.target.value)} className="min-h-32 w-full rounded-md border border-line px-3 py-2 text-[12px] leading-5"/><p className="text-[11px] text-muted">Selected file content is read as text for the deterministic demo parser.</p>{error?<div className="text-[12px] text-danger">{error}</div>:null}<div className="flex justify-end gap-2"><Button variant="secondary" onClick={onCancel}>Cancel</Button><Button disabled={busy || !applicationId || !name || !type || !content} onClick={()=>void submit()}>{busy?"Adding…":"Add document"}</Button></div></div>;
}
