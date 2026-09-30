"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/shell";
import { Badge, Button, Card, EmptyState } from "@/components/primitives";
import { postJson, useJson } from "@/components/use-json";

const titles: Record<string, [string, string]> = {
  workspace: ["Workspace", "Workspace identity and operating context."],
  team: ["Team", "Members and roles with access to the workspace."],
  security: ["Security", "Runtime and control posture."],
  notifications: ["Notifications", "Control how operational changes reach operators."],
  portals: ["Portals", "Configure connector endpoints and capability registry."],
  usage: ["Usage", "Resource and workflow visibility for the current environment."],
};

export default function SettingsSectionPage() {
  const { section } = useParams<{ section: string }>();
  const [message, setMessage] = useState<string | null>(null);
  const title = titles[section]?.[0] ?? "Settings";
  const description = titles[section]?.[1] ?? "PortalPilot configuration.";
  const workspace = useJson<{ workspace: any; members: Array<any> }>(section === "workspace" || section === "team" ? "/api/workspace" : null);
  const notifications = useJson<{ notifications: Array<any>; unreadCount: number }>(section === "notifications" ? "/api/notifications?limit=8" : null);
  const health = useJson<any>(section === "usage" || section === "security" ? "/api/health" : null);
  const portals = useJson<{ portals: Array<any> }>(section === "portals" ? "/api/portals" : null);

  if (!titles[section]) return <EmptyState title="Unknown settings section" body="Choose Workspace, Team, Security, Notifications, Portals or Usage." />;

  async function rename(name: string) {
    setMessage(null);
    try { await postJson("/api/workspace", { action: "rename", name }); await workspace.reload(); setMessage("Workspace updated."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Update failed."); }
  }

  async function invite(name: string, email: string, role: string) {
    setMessage(null);
    try { await postJson("/api/workspace", { action: "invite", name, email, role }); await workspace.reload(); setMessage("Member added."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Invite failed."); }
  }

  async function addPortal(name: string, baseUrl: string) {
    setMessage(null);
    try { await postJson("/api/portals", { name, baseUrl, connectorType: "GENERIC_BROWSER", capabilities: ["OBSERVE", "QUERY_READ"] }); await portals.reload(); setMessage("Portal connector added."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Portal creation failed."); }
  }

  return (
    <div>
      <PageHeader title={title} description={description} actions={<Link href="/settings"><Button variant="secondary">Back to settings</Button></Link>} />
      {message ? <div className="mb-4 rounded-md border border-line bg-paper px-4 py-3 text-[13px]">{message}</div> : null}

      {section === "workspace" ? <WorkspaceCard workspace={workspace.data?.workspace} onRename={rename} /> : null}
      {section === "team" ? <TeamCard members={workspace.data?.members ?? []} onInvite={invite} /> : null}
      {section === "security" ? <Card className="p-5"><h2 className="section-title">Security posture</h2><div className="mt-4 space-y-2 text-[13px]"><Row label="Database" value={health.data?.checks?.database?.ok ? "Healthy" : "Needs attention"} /><Row label="Solari" value={health.data?.checks?.solari?.detail ?? "Unknown"} /><Row label="Approval" value="Server-side gate enforced" /><Row label="Profiles" value="Sensitive authentication state" /><Row label="Audit" value="Persisted operational events" /><Row label="Portal URLs" value="Validated before connector creation" /></div></Card> : null}
      {section === "notifications" ? <Card className="p-5"><div className="flex items-center justify-between"><div><h2 className="section-title">Notification center</h2><p className="meta mt-1">In-app delivery is enabled in this build.</p></div><Badge tone={notifications.data?.unreadCount ? "danger" : "success"}>{notifications.data?.unreadCount ?? 0} unread</Badge></div><div className="mt-4 space-y-2">{(notifications.data?.notifications ?? []).map((n: any) => <div key={n.id} className="rounded-md bg-canvas p-3"><div className="font-medium text-[13px]">{n.title}</div><div className="mt-1 text-[12px] text-muted">{n.message}</div></div>)}</div></Card> : null}
      {section === "portals" ? <PortalCard portals={portals.data?.portals ?? []} onAdd={addPortal} /> : null}
      {section === "usage" ? <Card className="p-5"><h2 className="section-title">System usage & health</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Database" value={health.data?.checks?.database?.ok ? "Healthy" : "Unavailable"} /><Metric label="Portal registry" value={health.data?.checks?.portalRegistry?.detail ?? "—"} /><Metric label="Solari" value={health.data?.checks?.solari?.detail ?? "—"} /><Metric label="Mode" value={health.data?.mode ?? "DEMO"} /></div></Card> : null}
    </div>
  );
}

function WorkspaceCard({ workspace, onRename }: { workspace?: any; onRename: (name: string) => Promise<void> }) {
  const [name, setName] = useState(workspace?.name ?? "Apex Manufacturing");
  return <Card className="p-5"><h2 className="section-title">Workspace identity</h2><div className="mt-4 grid max-w-2xl gap-3 sm:grid-cols-[1fr_auto]"><input value={name} onChange={(e) => setName(e.target.value)} className="h-10 rounded-md border border-line bg-paper px-3 text-[13px]" /><Button onClick={() => void onRename(name)}>Save changes</Button></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><Metric label="Slug" value={workspace?.slug ?? "apex-manufacturing"} /><Metric label="Plan" value={workspace?.plan ?? "demo"} /><Metric label="Status" value={workspace?.status ?? "ACTIVE"} /></div></Card>;
}

function TeamCard({ members, onInvite }: { members: any[]; onInvite: (name: string, email: string, role: string) => Promise<void> }) {
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [role, setRole] = useState("OPERATOR");
  return <div className="space-y-4"><Card className="p-5"><h2 className="section-title">Add a member</h2><div className="mt-4 grid gap-2 md:grid-cols-[1fr_1fr_180px_auto]"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="h-9 rounded-md border border-line px-3 text-[12px]" /><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" className="h-9 rounded-md border border-line px-3 text-[12px]" /><select value={role} onChange={(e) => setRole(e.target.value)} className="h-9 rounded-md border border-line px-3 text-[12px]"><option>OPERATOR</option><option>REVIEWER</option><option>VIEWER</option><option>ADMIN</option></select><Button onClick={() => void onInvite(name, email, role)}>Add member</Button></div></Card><Card className="overflow-hidden p-0"><div className="table-wrap rounded-none border-0"><table><thead><tr><th>Member</th><th>Email</th><th>Role</th><th>Status</th></tr></thead><tbody>{members.map((m) => <tr key={m.id}><td className="font-medium">{m.user?.name}</td><td>{m.user?.email}</td><td><Badge>{m.role}</Badge></td><td>{m.user?.status}</td></tr>)}</tbody></table></div></Card></div>;
}

function PortalCard({ portals, onAdd }: { portals: any[]; onAdd: (name: string, baseUrl: string) => Promise<void> }) {
  const [name, setName] = useState(""); const [baseUrl, setBaseUrl] = useState("");
  return <div className="space-y-4"><Card className="p-5"><h2 className="section-title">Add connector</h2><div className="mt-4 grid gap-2 md:grid-cols-[1fr_1.4fr_auto]"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Portal name" className="h-9 rounded-md border border-line px-3 text-[12px]" /><input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://portal.example.com" className="h-9 rounded-md border border-line px-3 text-[12px]" /><Button onClick={() => void onAdd(name, baseUrl)}>Add portal</Button></div></Card><div className="grid gap-3 md:grid-cols-2">{portals.map((portal) => <Card key={portal.id} className="p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-medium">{portal.name}</h3><p className="mono mt-1">{portal.baseUrl}</p></div><Badge tone={portal.status === "HEALTHY" ? "success" : "warning"}>{portal.status}</Badge></div></Card>)}</div></div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-md bg-canvas p-3"><div className="meta">{label}</div><div className="mt-1 font-medium">{value}</div></div>; }
function Row({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between border-b border-line py-2 last:border-0"><span className="text-muted">{label}</span><span>{value}</span></div>; }
