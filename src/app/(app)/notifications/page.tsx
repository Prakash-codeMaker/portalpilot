"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/shell";
import { Button, Card, EmptyState } from "@/components/primitives";
import { postJson, useJson } from "@/components/use-json";
import { formatDisplayDateTime } from "@/lib/format";

export default function NotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data, reload } = useJson<{ notifications: Array<any>; unreadCount: number }>(`/api/notifications?unreadOnly=${unreadOnly}`);
  async function read(id: string) { await postJson("/api/notifications", { id }); await reload(); }
  return (
    <div>
      <PageHeader title="Notifications" description="Actionable changes and exceptions surfaced from monitored workflows." actions={<Button variant="secondary" onClick={() => setUnreadOnly((v) => !v)}>{unreadOnly ? "Showing unread" : "Show unread"}</Button>} />
      <div className="mb-4 text-[12px] text-muted">{data?.unreadCount ?? 0} unread</div>
      <div className="space-y-2">
        {(data?.notifications ?? []).map((item) => (
          <Card key={item.id} className={!item.readAt ? "border-accent/30 bg-accent-soft/30 p-4" : "p-4"}>
            <div className="flex gap-4"><div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-current text-accent" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-[14px] font-medium">{item.title}</h2><span className="meta">{formatDisplayDateTime(item.createdAt)}</span></div><p className="mt-1 text-[13px] text-ink-soft">{item.message}</p>{item.applicationId ? <Link href={`/applications/${item.applicationId}`} className="mt-2 inline-block text-[12px] text-accent">Open application →</Link> : null}</div>{!item.readAt ? <Button size="sm" variant="ghost" onClick={() => read(item.id)}>Mark read</Button> : null}</div>
          </Card>
        ))}
      </div>
      {(data?.notifications.length ?? 0) === 0 ? <EmptyState title="You're all clear" body="There are no notifications in this view." /> : null}
    </div>
  );
}
