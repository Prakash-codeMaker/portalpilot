"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/shell";
import { Button, Card } from "@/components/primitives";
import { postJson } from "@/components/use-json";

export default function DemoLabPage() {
  const [log, setLog] = useState<string[]>(["Demo environment ready. This is not a production government portal."]);
  const [busy, setBusy] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);

  async function act(label: string, url: string) {
    setBusy(true);
    try {
      const result = await postJson<Record<string, unknown>>(url);
      if (typeof result.runId === "string") setRunId(result.runId);
      setLog((prev) => [`${label}: ${JSON.stringify(result)}`, ...prev].slice(0, 12));
    } catch (error) {
      setLog((prev) => [`${label} failed: ${error instanceof Error ? error.message : "error"}`, ...prev]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="DEMO"
        title="Demo environment"
        description="Deterministic reproduction of the Factory Expansion Approval workflow. Never pretend this is a production authority portal."
      />
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5">
          <h2 className="text-[13px] uppercase tracking-[0.08em] text-muted">Controls</h2>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button variant="secondary" disabled={busy} onClick={() => act("Reset", "/api/demo/reset")}>
              Reset
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => act("Raise clarification", "/api/demo/raise-query")}>
              Raise clarification
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => act("Change deadline", "/api/demo/change-deadline")}>
              Change deadline
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => act("Insert expired certificate", "/api/demo/insert-expired")}>
              Insert expired certificate
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => act("Replace certificate", "/api/demo/replace-certificate")}>
              Replace certificate
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => act("Simulate false success", "/api/demo/false-success")}>
              Simulate false success
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => act("Run monitoring", "/api/applications/MH-23881/check")}>
              Run monitoring
            </Button>
            <Button
              disabled={busy}
              onClick={() => act("Run full demo", "/api/demo/guided")}
            >
              Run full demo
            </Button>
          </div>
          <p className="mt-4 text-[13px] text-muted">
            Guided demo stops after verification is blocked or ready for human review. Final submission always requires Approve & Submit.
          </p>
          <div className="mt-4 flex gap-3 text-[13px]">
            <Link href="/applications/MH-23881" className="text-accent">
              Open MH-23881
            </Link>
            <Link href="/portal/application/MH-23881" className="text-accent">
              Open demo portal
            </Link>
            {runId ? (
              <Link href={`/runs/${runId}`} className="text-accent">
                Open run
              </Link>
            ) : null}
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="text-[13px] uppercase tracking-[0.08em] text-muted">Story</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-4 text-[13px] text-ink-soft">
            <li>Factory Expansion Approval is Under Review.</li>
            <li>Raise clarification Q-291 and tighten the deadline.</li>
            <li>Run check: observe, extract, sandbox, verify.</li>
            <li>Expired fire certificate blocks submission.</li>
            <li>Replace with fire-certificate-new.pdf and re-verify.</li>
            <li>Human clicks Approve & Submit.</li>
            <li>PortalPilot reopens the application and checks actual state.</li>
            <li>False success still yields Submission Unverified if the portal stayed DRAFT.</li>
          </ol>
          <pre className="mt-4 max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-canvas p-3 text-[11px] leading-5">
            {log.join("\n\n")}
          </pre>
        </Card>
      </div>
    </div>
  );
}
