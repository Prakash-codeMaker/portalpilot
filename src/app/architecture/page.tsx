import Link from "next/link";

export default function ArchitecturePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-[12px] uppercase tracking-[0.08em] text-muted">Architecture</p>
      <h1 className="page-title mt-2">Observe, verify, approve, confirm</h1>
      <p className="mt-4 text-[15px] text-ink-soft">
        PortalPilot is an operational layer around approval workflows. The LLM interprets. Deterministic code decides.
      </p>
      <ol className="mt-8 space-y-3 text-[14px]">
        <li>Application</li>
        <li>Change detected</li>
        <li>Evidence verified</li>
        <li>Human approval</li>
        <li>Submission confirmed</li>
      </ol>
      <div className="mt-8 flex gap-3">
        <Link href="/" className="text-accent">
          Open product
        </Link>
        <Link href="/demo" className="text-accent">
          Open demo
        </Link>
      </div>
    </main>
  );
}
