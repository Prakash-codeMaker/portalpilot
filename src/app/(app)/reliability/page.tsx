"use client";

import { PageHeader } from "@/components/shell";
import { Badge, Card } from "@/components/primitives";

const scenarios = [
  ["Happy path", "All required evidence is valid", "READY → VERIFIED", "Implemented"],
  ["Expired document", "Certificate expired before run date", "BLOCK", "Implemented"],
  ["Missing document", "Required evidence absent", "BLOCK", "Implemented"],
  ["Wrong entity/site", "Evidence belongs elsewhere", "BLOCK", "Implemented"],
  ["Evidence conflict", "Two candidates disagree", "HUMAN REVIEW", "Implemented"],
  ["Stale evidence", "Document hash changed", "RE-VERIFY", "Implemented"],
  ["Portal unavailable", "External state cannot be observed", "SAFE STOP", "Implemented"],
  ["Session expired", "Profile needs reauthentication", "HUMAN HANDOFF", "Implemented"],
  ["False success", "Banner says success, record is DRAFT", "UNVERIFIED", "Implemented"],
  ["Approval bypass", "Submit without approval", "403", "Implemented"],
  ["Material change", "Portal/evidence changes after approval", "APPROVAL STALE", "Implemented"],
  ["Malformed model", "LLM output fails schema", "REJECT OUTPUT", "Implemented"],
];

export default function ReliabilityPage() {
  return (
    <div>
      <PageHeader title="Reliability Lab" description="Failure modes are part of the product. This page documents the behavior the verifier and workflow engine are designed to enforce." />
      <Card className="overflow-hidden p-0">
        <div className="table-wrap border-0 rounded-none"><table><thead><tr><th>Scenario</th><th>Condition</th><th>Expected behavior</th><th>Coverage</th></tr></thead><tbody>{scenarios.map(([name, condition, expected, coverage]) => <tr key={name}><td className="font-medium">{name}</td><td className="text-muted">{condition}</td><td><Badge tone={expected === "UNVERIFIED" || expected === "BLOCK" || expected === "403" ? "danger" : "warning"}>{expected}</Badge></td><td><Badge tone="success">{coverage}</Badge></td></tr>)}</tbody></table></div>
      </Card>
      <p className="mt-3 text-[11px] text-muted">“Implemented” here means a code path and/or test exists in this repository; live remote execution still depends on your configured Solari environment.</p>
    </div>
  );
}
