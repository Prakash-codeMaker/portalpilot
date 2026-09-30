"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shell";
import { Badge, Button, Card, EmptyState, StatusBadge } from "@/components/primitives";
import { useJson } from "@/components/use-json";
import { formatDisplayDateTime } from "@/lib/format";

export default function PortalsPage() {
  const { data } = useJson<{ portals: Array<any> }>("/api/portals");
  return (
    <div>
      <PageHeader title="Portals" description="Connector registry for the external systems PortalPilot observes and acts on." actions={<Link href="/settings/portals"><Button>Add portal</Button></Link>} />
      <div className="grid gap-4 lg:grid-cols-2">
        {(data?.portals ?? []).map((portal) => (
          <Card key={portal.id} className="surface-hover p-5">
            <div className="flex items-start justify-between gap-3">
              <div><div className="flex items-center gap-2"><p className="meta">{portal.connectorType}</p>{portal.name.startsWith("PortalPilot Demo") ? <Badge>Demo</Badge> : null}</div><h2 className="mt-1 text-[16px] font-medium">{portal.name}</h2><p className="mt-1 text-[12px] text-muted">{portal.baseUrl}</p></div>
              <Badge tone={portal.status === "HEALTHY" ? "success" : portal.status === "DEGRADED" ? "warning" : "danger"}>{portal.status}</Badge>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">{(portal.capabilities ?? []).map((cap: string) => <Badge key={cap}>{cap}</Badge>)}</div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-[12px]">
              <div><div className="meta">Last health check</div><div className="mt-1">{portal.lastHealthCheckAt ? formatDisplayDateTime(portal.lastHealthCheckAt) : "Never"}</div></div>
              <div><div className="meta">Connector</div><div className="mt-1 mono">{portal.connectorType}</div></div>
            </div>
          </Card>
        ))}
      </div>
      {(data?.portals.length ?? 0) === 0 ? <EmptyState title="No portals connected" body="Add a connector to begin observing external application state." /> : null}
      <Card className="mt-5 p-5">
        <h2 className="section-title">Connector model</h2>
        <p className="mt-2 max-w-3xl text-[13px] leading-6 text-muted">PortalPilot keeps portal-specific selectors and behaviors behind a connector boundary, so adding another approval system does not require rewriting the monitoring, evidence, verifier or approval engine.</p>
      </Card>
    </div>
  );
}
