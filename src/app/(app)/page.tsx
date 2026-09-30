"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shell";
import { Badge, Button, Card, EmptyState, Skeleton, StatusBadge } from "@/components/primitives";
import { useJson } from "@/components/use-json";
import { daysUntil, formatDisplayDate, formatDisplayDateTime } from "@/lib/format";


type Overview = {
  stats: { applications: number; attention: number; awaitingApproval: number; verifiedToday: number };
  attention: Array<{
    id: string;
    title: string;
    entity: string;
    site: string;
    status: string;
    deadline: string | null;
    verifiedRequirementCount: number;
    totalRequirementCount: number;
    lastChangeSummary: string | null;
    portal?: string;
  }>;
  activity: Array<{ id: string; type: string; applicationId: string; afterValue?: string | null; observedAt: string }>;
  changes: Array<{ id: string; type: string; applicationId: string; beforeValue?: string | null; afterValue?: string | null; observedAt: string }>;
  environment: { mode: string; demoDate: string; operatorName: string; workspaceName: string; liveConfigured: boolean };
};

export default function OverviewPage() {
  const { data, loading } = useJson<Overview>("/api/overview");
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning." : hour < 18 ? "Good afternoon." : "Good evening.";
  const isDemo = data?.environment.mode === "DEMO";

  return (
    <div className="page-section fade-in">
      <PageHeader
        eyebrow="Operations"
        title={greeting}
        description="A single place to see what changed, what is blocked, and what needs a human decision."
        actions={
          <>
            <Link href="/demo"><Button variant="secondary">Open demo lab</Button></Link>
            <Link href="/applications"><Button>View applications</Button></Link>
          </>
        }
      />

      {isDemo ? (
        <div className="mb-7 flex flex-col gap-3 rounded-2xl border border-[#dfd2b2] bg-[#fbf7ec] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[12px] font-semibold text-[#77551c]"><span className="h-2 w-2 rounded-full bg-[#b58a37]"/> Demo workspace</div>
            <p className="mt-1 text-[12px] leading-5 text-[#7c6b49]">This workspace contains one synthetic approval case for reproducible evaluation. Connected customer applications belong in the normal workspace.</p>
          </div>
          <Link href="/demo" className="shrink-0 text-[12px] font-semibold text-[#77551c]">Open Demo Lab →</Link>
        </div>
      ) : null}

      <div className="grid grid-cols-2 divide-x divide-line rounded-2xl border border-line bg-paper sm:grid-cols-4">
        <Metric label="Applications" value={data?.stats.applications} loading={loading} />
        <Metric label="Need attention" value={data?.stats.attention} loading={loading} />
        <Metric label="Awaiting approval" value={data?.stats.awaitingApproval} loading={loading} />
        <Metric label="Verified today" value={data?.stats.verifiedToday} loading={loading} />
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,.8fr)]">
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Attention queue</p>
              <h2 className="mt-1 text-[19px] font-semibold tracking-[-0.025em]">Needs a decision</h2>
            </div>
            <Link href="/attention" className="text-[12px] font-semibold text-accent">View all →</Link>
          </div>

          {loading ? <div className="space-y-2"><Skeleton className="h-28"/><Skeleton className="h-28"/></div> : null}

          {!loading && (data?.attention.length ?? 0) === 0 ? (
            <Card className="overflow-hidden"><EmptyState title="You're all clear" body="No connected application currently requires a decision." action={<Link href="/applications"><Button size="sm">Add an application</Button></Link>} /></Card>
          ) : null}

          <div className="space-y-2">
            {data?.attention.map((app) => {
              const due = app.deadline ? daysUntil(app.deadline, data.environment.demoDate) : null;
              return (
                <Link key={app.id} href={`/applications/${app.id}`} className="group block rounded-2xl border border-line bg-paper px-5 py-4 transition hover:border-line-strong hover:shadow-[0_12px_30px_rgba(12,18,15,.045)]">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="mono text-muted">{app.id}</span>
                        {app.portal?.startsWith("PortalPilot Demo") ? <Badge>Demo</Badge> : null}
                        <StatusBadge status={app.status} />
                      </div>
                      <h3 className="mt-2 truncate text-[15px] font-semibold tracking-[-0.015em] group-hover:text-accent">{app.title}</h3>
                      <p className="mt-1 text-[12px] text-muted">{app.entity} · {app.site}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-7 text-[12px]">
                      <div><div className="eyebrow text-[9px]">Evidence</div><div className="mt-1 font-semibold">{app.verifiedRequirementCount}/{app.totalRequirementCount || "—"}</div></div>
                      <div><div className="eyebrow text-[9px]">Deadline</div><div className="mt-1 font-semibold">{formatDisplayDate(app.deadline)}</div>{due !== null && due <= 7 ? <div className={due < 0 ? "mt-0.5 text-[11px] text-danger" : "mt-0.5 text-[11px] text-warning"}>{due < 0 ? `${Math.abs(due)}d overdue` : `Due in ${due}d`}</div> : null}</div>
                      <div className="hidden text-right lg:block"><div className="eyebrow text-[9px]">Last change</div><div className="mt-1 max-w-[180px] truncate font-medium">{app.lastChangeSummary ?? "No recorded change"}</div></div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <aside className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div><p className="eyebrow">Recent changes</p><h2 className="mt-1 text-[17px] font-semibold">What moved</h2></div>
              <Link href="/activity" className="text-[12px] font-semibold text-accent">Activity →</Link>
            </div>
            <div className="mt-5 space-y-4">
              {(data?.changes ?? []).slice(0, 5).map((event) => (
                <Link key={event.id} href={`/applications/${event.applicationId}?tab=Changes`} className="group block">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[12px] font-semibold capitalize">{event.type.replaceAll("_", " ").toLowerCase()}</span>
                    <span className="mono text-muted">{event.applicationId}</span>
                  </div>
                  {(event.beforeValue || event.afterValue) ? <div className="mt-1 text-[12px] text-muted"><span>{event.beforeValue ?? "—"}</span><span className="mx-1.5 text-line-strong">→</span><span className="text-ink-soft">{event.afterValue ?? "—"}</span></div> : null}
                </Link>
              ))}
              {(data?.changes.length ?? 0) === 0 ? <p className="text-[12px] text-muted">No changes recorded yet.</p> : null}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between"><div><p className="eyebrow">Activity</p><h2 className="mt-1 text-[17px] font-semibold">Latest runs</h2></div><Link href="/runs" className="text-[12px] font-semibold text-accent">View runs →</Link></div>
            <div className="mt-5 divide-y divide-line">
              {(data?.activity ?? []).slice(0, 6).map((event) => (
                <Link key={event.id} href={`/applications/${event.applicationId}`} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0"><div className="truncate text-[12px] font-semibold capitalize">{event.type.replaceAll("_", " ").toLowerCase()}</div><div className="mono mt-0.5 text-muted">{event.applicationId}</div></div>
                  <span className="mono shrink-0 text-muted">{formatDisplayDateTime(event.observedAt)}</span>
                </Link>
              ))}
              {(data?.activity.length ?? 0) === 0 ? <p className="py-2 text-[12px] text-muted">No activity yet.</p> : null}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Metric({ label, value, loading }: { label: string; value?: number; loading: boolean }) {
  return <div className="min-h-[94px] px-5 py-4 sm:px-6">
    <div className="eyebrow text-[9px]">{label}</div>
    <div className="mt-2 text-[29px] font-semibold tracking-[-0.045em]">{loading ? <Skeleton className="h-8 w-12" /> : value ?? 0}</div>
  </div>;
}
