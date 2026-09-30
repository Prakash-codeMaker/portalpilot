import Link from "next/link";
import { db } from "@/db";
import { portalApplications } from "@/db/schema";
import { Card, StatusBadge } from "@/components/primitives";

export const dynamic = "force-dynamic";

export default async function PortalDashboardPage() {
  const rows = await db.select().from(portalApplications);
  return (
    <div>
      <h1 className="text-[24px] font-medium">Applications</h1>
      <div className="mt-4 grid gap-3">
        {rows.map((row) => (
          <Link key={row.id} href={`/portal/application/${row.id}`}>
            <Card className="p-4 hover:bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="mono text-muted">{row.id}</div>
                  <div className="font-medium">{row.title}</div>
                </div>
                <StatusBadge status={row.status} />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
