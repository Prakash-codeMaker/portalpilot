"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shell";
import { useJson } from "@/components/use-json";
import { formatClock, formatDisplayDateTime } from "@/lib/format";

type Event = {
  id: string;
  applicationId: string;
  type: string;
  afterValue: string | null;
  observedAt: string;
};

export default function ActivityPage() {
  const { data } = useJson<{ events: Event[] }>("/api/activity");
  const groups = new Map<string, Event[]>();
  for (const event of data?.events ?? []) {
    const day = event.observedAt.slice(0, 10);
    const list = groups.get(day) ?? [];
    list.push(event);
    groups.set(day, list);
  }

  return (
    <div>
      <PageHeader title="Activity" description="Persisted workflow history, not a hardcoded timeline." />
      {Array.from(groups.entries()).map(([day, events]) => (
        <section key={day} className="mb-8">
          <h2 className="text-[13px] uppercase tracking-[0.08em] text-muted">{day === "2026-09-29" ? "Today" : formatDisplayDateTime(day)}</h2>
          <ol className="mt-3 space-y-3">
            {events.map((event) => (
              <li key={event.id}>
                <Link href={`/applications/${event.applicationId}`} className="flex items-baseline gap-4 hover:text-accent">
                  <span className="mono w-16 text-muted">{formatClock(event.observedAt)}</span>
                  <span className="flex-1">
                    {event.type.replaceAll("_", " ")}
                    <span className="mono ml-2 text-muted">{event.applicationId}</span>
                    {event.afterValue ? <span className="ml-2 text-muted">{event.afterValue}</span> : null}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
