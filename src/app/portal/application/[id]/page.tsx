import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { portalApplications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Card, StatusBadge } from "@/components/primitives";
import { formatDisplayDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PortalApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await db.select().from(portalApplications).where(eq(portalApplications.id, id)).limit(1);
  if (!row) notFound();
  return (
    <div>
      <Link href="/portal/dashboard" className="text-[13px] text-muted">
        ← Dashboard
      </Link>
      <div className="mt-4">
        <div className="mono text-muted">{row.id}</div>
        <h1 className="text-[26px] font-medium">{row.title}</h1>
        <p className="mt-1 text-[14px]">
          {row.entity} · {row.site}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span data-testid="application-status" data-status={row.status}>
            <StatusBadge status={row.status} />
          </span>
          <span className="text-[13px]" data-testid="application-deadline" data-deadline={row.deadline ?? ""}>
            Deadline {formatDisplayDate(row.deadline)}
          </span>
          <span className="sr-only" data-testid="application-query-id" data-query-id={row.queryId ?? ""} />
        </div>
      </div>
      {row.successMessage ? (
        <Card
          className="mt-5 border-success/30 bg-success-soft p-4"
          data-testid="application-success"
          data-success="true"
        >
          <p className="font-medium">Application submitted successfully</p>
          <p data-testid="application-last-message" className="sr-only">{row.lastMessage ?? "Application submitted successfully"}</p>
          {row.acknowledgement ? <p className="mono mt-1" data-testid="application-ack" data-ack={row.acknowledgement}>{row.acknowledgement}</p> : null}
        </Card>
      ) : null}
      {row.queryId ? (
        <Card className="mt-5 p-5">
          <div className="text-[12px] uppercase tracking-[0.08em] text-muted">Clarification</div>
          <div className="mono mt-1">{row.queryId}</div>
          <p className="mt-2" data-testid="application-query-text">{row.queryText}</p>
          <Link href={`/portal/application/${row.id}/query`} className="mt-3 inline-block text-[13px] text-accent">
            Respond to query
          </Link>
        </Card>
      ) : null}
    </div>
  );
}
