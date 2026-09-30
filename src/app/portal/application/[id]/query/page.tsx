import { notFound } from "next/navigation";
import { db } from "@/db";
import { portalApplications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Card, StatusBadge } from "@/components/primitives";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PortalQueryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [row] = await db
    .select()
    .from(portalApplications)
    .where(eq(portalApplications.id, id))
    .limit(1);

  if (!row) {
    notFound();
  }

  return (
    <div>
      <Link
        href={`/portal/application/${id}`}
        className="text-[13px] text-muted"
      >
        ← Application
      </Link>

      <Card className="mt-4 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="mono text-muted">{row.id}</div>
            <h1 className="mt-1 text-[22px] font-medium">
              Respond to {row.queryId ?? "query"}
            </h1>
          </div>

          <StatusBadge status={row.status} />
        </div>

        <div className="mt-4">
          <div className="text-[12px] uppercase tracking-[0.08em] text-muted">
            Authority clarification
          </div>

          <p
            className="mt-2 text-[14px]"
            data-testid="application-query-text"
          >
            {row.queryText ?? "No clarification text available."}
          </p>
        </div>

        <form
          method="POST"
          action={`/api/portal/application/${id}`}
          className="mt-6"
        >
          <label className="block text-[13px] font-medium">
            Response
            <textarea
              name="response"
              required
              className="mt-2 h-32 w-full rounded-md border border-line p-3 text-[14px]"
              placeholder="Prepared response"
              defaultValue=""
            />
          </label>

          <label className="mt-4 block text-[13px] font-medium">
            Supporting documents
            <textarea
              name="documents"
              className="mt-2 h-24 w-full rounded-md border border-line p-3 text-[13px]"
              placeholder="One verified document per line"
              defaultValue=""
            />
          </label>

          <div className="mt-5">
            <button
              type="submit"
              className="rounded-md border border-line bg-foreground px-4 py-2 text-[13px] font-medium text-background"
            >
              Submit response
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}