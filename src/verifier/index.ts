import {
  identitiesMatch,
  isCurrent,
  isExpired,
  sha256,
  type VerificationStatus,
} from "@/lib/core";

export interface IdentityTarget {
  entity: string;
  site: string;
}

export interface ParsedDocument {
  name: string;
  type: string;
  entity?: string;
  site?: string;
  issuedAt?: string;
  expiresAt?: string;
  certificateId?: string;
  page?: number;
  quote?: string;
  content: string;
  sha256: string;
}

export interface CheckResult {
  name: string;
  status: "PASS" | "FAIL" | "UNKNOWN";
  detail: string;
}

export interface RequirementInput {
  id: string;
  name: string;
  type: string;
  description: string;
  required: boolean;
}

export interface EvidenceClaim {
  requirementId: string;
  documentId: string;
  documentName: string;
  field: string;
  extractedValue: string;
  quote?: string;
  page?: number;
  status: VerificationStatus;
  hash: string;
  checkName: string;
}

export interface RequirementVerdict {
  requirementId: string;
  required?: boolean;
  type: string;
  name: string;
  status: VerificationStatus;
  reason?: string;
  checks: CheckResult[];
  claims: EvidenceClaim[];
  documentId?: string;
  documentName?: string;
}

export interface VerificationReport {
  requirements: RequirementVerdict[];
  verifiedCount: number;
  totalRequired: number;
  claimCount: number;
  supportedClaimCount: number;
  conflicts: number;
  stale: number;
  missing: number;
  decision: "READY_FOR_APPROVAL" | "BLOCKED" | "REVIEW_REQUIRED";
  blockedReason?: string;
}

export function matchEntity(documentEntity: string | undefined, applicationEntity: string): CheckResult {
  if (!documentEntity) {
    return { name: "Entity match", status: "UNKNOWN", detail: "Document does not declare an entity." };
  }
  if (identitiesMatch(documentEntity, applicationEntity)) {
    return { name: "Entity match", status: "PASS", detail: documentEntity };
  }
  return {
    name: "Entity match",
    status: "FAIL",
    detail: `Document entity does not match application entity. Document: ${documentEntity}. Application: ${applicationEntity}.`,
  };
}

export function matchSite(documentSite: string | undefined, applicationSite: string): CheckResult {
  if (!documentSite) {
    return { name: "Site match", status: "UNKNOWN", detail: "Document does not declare a site." };
  }
  if (identitiesMatch(documentSite, applicationSite)) {
    return { name: "Site match", status: "PASS", detail: documentSite };
  }
  return {
    name: "Site match",
    status: "FAIL",
    detail: `Document site does not match application site. Document: ${documentSite}. Application: ${applicationSite}.`,
  };
}

export function matchType(documentType: string, requiredType: string): CheckResult {
  if (documentType === requiredType) {
    return { name: "Type match", status: "PASS", detail: documentType };
  }
  return {
    name: "Type match",
    status: "FAIL",
    detail: `Document type ${documentType} does not match required type ${requiredType}.`,
  };
}

export function checkExpiry(expiresAt: string | undefined, currentDate: string): CheckResult {
  if (!expiresAt) {
    return { name: "Expiry", status: "FAIL", detail: "Expiry date is missing." };
  }
  if (isExpired(expiresAt, currentDate)) {
    return {
      name: "Expiry",
      status: "FAIL",
      detail: `Expired on ${expiresAt}. Current date: ${currentDate}.`,
    };
  }
  return { name: "Expiry", status: "PASS", detail: expiresAt };
}

export function checkCurrent(expiresAt: string | undefined, currentDate: string): CheckResult {
  if (!expiresAt) {
    return { name: "Current", status: "FAIL", detail: "Cannot confirm currency without an expiry." };
  }
  if (isCurrent(expiresAt, currentDate)) {
    return { name: "Current", status: "PASS", detail: "YES" };
  }
  return { name: "Current", status: "FAIL", detail: "NO" };
}

export function checkIssueDate(issuedAt: string | undefined, currentDate: string): CheckResult {
  if (!issuedAt) {
    return { name: "Issue date", status: "UNKNOWN", detail: "Issue date is not present." };
  }
  if (isExpired(currentDate, issuedAt) && issuedAt !== currentDate) {
    return { name: "Issue date", status: "FAIL", detail: `Issue date ${issuedAt} is in the future.` };
  }
  return { name: "Issue date", status: "PASS", detail: issuedAt };
}

export function detectConflicts(documents: ParsedDocument[]): string[] {
  const byType = new Map<string, ParsedDocument[]>();
  for (const doc of documents) {
    const list = byType.get(doc.type) ?? [];
    list.push(doc);
    byType.set(doc.type, list);
  }
  const conflicts: string[] = [];
  for (const [type, list] of byType) {
    if (list.length < 2) continue;
    const signatures = new Set(
      list.map((d) =>
        [d.entity ?? "", d.site ?? "", d.expiresAt ?? "", d.certificateId ?? ""].join("|"),
      ),
    );
    if (signatures.size > 1) {
      conflicts.push(type);
    }
  }
  return conflicts;
}

export function isStale(storedHash: string | undefined, currentHash: string): boolean {
  if (!storedHash) return true;
  return storedHash !== currentHash;
}

export function contentHash(content: string): string {
  return sha256(content);
}

function checksToStatus(checks: CheckResult[], required: boolean): VerificationStatus {
  if (checks.some((c) => c.status === "FAIL")) return "FAILED";
  if (checks.some((c) => c.status === "UNKNOWN")) return required ? "UNKNOWN" : "UNKNOWN";
  if (checks.length === 0) return required ? "MISSING" : "UNKNOWN";
  return "VERIFIED";
}

export function verifyDocumentAgainstRequirement(opts: {
  requirement: RequirementInput;
  document: ParsedDocument | undefined;
  application: IdentityTarget;
  currentDate: string;
  conflicting: boolean;
  stale: boolean;
}): RequirementVerdict {
  const { requirement, document, application, currentDate, conflicting, stale } = opts;

  if (conflicting) {
    return {
      requirementId: requirement.id,
      required: requirement.required,
      type: requirement.type,
      name: requirement.name,
      status: "CONFLICT",
      reason: "Two candidate documents contain conflicting values. Human review required.",
      checks: [{ name: "Conflict", status: "FAIL", detail: "Conflicting candidates for this requirement." }],
      claims: [],
    };
  }

  if (!document) {
    return {
      requirementId: requirement.id,
      required: requirement.required,
      type: requirement.type,
      name: requirement.name,
      status: "MISSING",
      reason: "Required evidence has not been supplied.",
      checks: [{ name: "Document exists", status: "FAIL", detail: "No active document of this type." }],
      claims: [],
    };
  }

  if (stale) {
    return {
      requirementId: requirement.id,
      required: requirement.required,
      type: requirement.type,
      name: requirement.name,
      status: "STALE",
      reason: "Stored evidence no longer matches the current document hash.",
      checks: [{ name: "Freshness", status: "FAIL", detail: "Hash mismatch." }],
      claims: [],
      documentId: document.name,
      documentName: document.name,
    };
  }

  const checks: CheckResult[] = [
    { name: "Document exists", status: "PASS", detail: document.name },
    matchType(document.type, requirement.type),
    matchEntity(document.entity, application.entity),
    matchSite(document.site, application.site),
  ];

  const needsExpiry =
    requirement.type === "FIRE_SAFETY_CERTIFICATE" || requirement.type === "POLLUTION_CONSENT";
  if (needsExpiry) {
    checks.push(checkIssueDate(document.issuedAt, currentDate));
    checks.push(checkExpiry(document.expiresAt, currentDate));
    checks.push(checkCurrent(document.expiresAt, currentDate));
  } else if (document.expiresAt) {
    checks.push(checkExpiry(document.expiresAt, currentDate));
  }

  const status = checksToStatus(checks, requirement.required);
  const failed = checks.find((c) => c.status === "FAIL");
  const claims: EvidenceClaim[] = [];

  const pushClaim = (field: string, value: string | undefined, checkName: string, ok: boolean) => {
    if (!value) return;
    claims.push({
      requirementId: requirement.id,
      documentId: document.name,
      documentName: document.name,
      field,
      extractedValue: value,
      quote: document.quote,
      page: document.page ?? 1,
      status: ok ? "VERIFIED" : "FAILED",
      hash: document.sha256,
      checkName,
    });
  };

  pushClaim("entity", document.entity, "Entity match", checks.find((c) => c.name === "Entity match")?.status === "PASS");
  pushClaim("site", document.site, "Site match", checks.find((c) => c.name === "Site match")?.status === "PASS");
  if (document.certificateId) {
    pushClaim("certificate", document.certificateId, "Certificate id", true);
  }
  if (document.expiresAt) {
    const expiryOk = checks.find((c) => c.name === "Expiry")?.status === "PASS";
    pushClaim("expiry", document.expiresAt, "Expiry", expiryOk ?? false);
    pushClaim("current", expiryOk ? "YES" : "NO", "Current", expiryOk ?? false);
  }

  let reason: string | undefined;
  if (status === "FAILED") {
    if (failed?.name === "Expiry" || failed?.name === "Current") {
      reason = `Expired on ${document.expiresAt}. Current date: ${currentDate}.`;
    } else if (failed?.name === "Site match") {
      reason = `Document site does not match application site.`;
    } else if (failed?.name === "Entity match") {
      reason = `Document entity does not match application entity.`;
    } else {
      reason = failed?.detail;
    }
  }

  return {
    requirementId: requirement.id,
    type: requirement.type,
    name: requirement.name,
    status,
    reason,
    checks,
    claims,
    documentId: document.name,
    documentName: document.name,
  };
}

export function finalizeVerification(verdicts: RequirementVerdict[]): VerificationReport {
  const required = verdicts.filter((v) => v.required !== false);
  const verifiedCount = required.filter((v) => v.status === "VERIFIED").length;
  const conflicts = required.filter((v) => v.status === "CONFLICT").length;
  const stale = required.filter((v) => v.status === "STALE").length;
  const missing = required.filter((v) => v.status === "MISSING").length;
  const claims = required.flatMap((v) => v.claims);
  const supportedClaimCount = claims.filter((c) => c.status === "VERIFIED").length;

  const allVerified = required.every((v) => v.status === "VERIFIED");
  let decision: VerificationReport["decision"] = "BLOCKED";
  let blockedReason: string | undefined;

  if (conflicts > 0) {
    decision = "REVIEW_REQUIRED";
    blockedReason = "Evidence conflict. Human review required.";
  } else if (stale > 0) {
    decision = "BLOCKED";
    blockedReason = "Evidence is stale and must be re-verified.";
  } else if (allVerified && required.length > 0) {
    decision = "READY_FOR_APPROVAL";
  } else {
    decision = "BLOCKED";
    const failed = required.find((v) => v.status !== "VERIFIED");
    blockedReason = failed?.reason ?? "Required evidence could not be verified.";
  }

  return {
    requirements: verdicts,
    verifiedCount,
    totalRequired: required.length,
    claimCount: claims.length,
    supportedClaimCount,
    conflicts,
    stale,
    missing,
    decision,
    blockedReason,
  };
}

export function verifyPostcondition(opts: {
  displayedSuccess: boolean;
  actualStatus: string;
  acknowledgement?: string | null;
}): {
  result: "SUBMISSION_VERIFIED" | "SUBMISSION_UNVERIFIED";
  message: string;
} {
  const { displayedSuccess, actualStatus, acknowledgement } = opts;
  if (displayedSuccess && actualStatus === "DRAFT") {
    return {
      result: "SUBMISSION_UNVERIFIED",
      message:
        "The portal displayed a successful submission message, but reopening the application showed DRAFT.",
    };
  }
  if (actualStatus === "SUBMITTED" && acknowledgement) {
    return {
      result: "SUBMISSION_VERIFIED",
      message: `Submission verified. Acknowledgement ${acknowledgement}.`,
    };
  }
  if (actualStatus !== "SUBMITTED") {
    return {
      result: "SUBMISSION_UNVERIFIED",
      message: `Reopening the application showed ${actualStatus}, not SUBMITTED.`,
    };
  }
  return {
    result: "SUBMISSION_UNVERIFIED",
    message: "Reopening the application did not produce an acknowledgement.",
  };
}

export function detectObservationChanges(
  previous: { status: string; deadline?: string | null; queryId?: string | null; queryText?: string | null } | null,
  next: { status: string; deadline?: string | null; queryId?: string | null; queryText?: string | null },
): Array<{ type: string; before?: string | null; after?: string | null }> {
  if (!previous) {
    const changes: Array<{ type: string; before?: string | null; after?: string | null }> = [
      { type: "INITIAL_OBSERVATION", after: next.status },
    ];
    if (next.queryId) {
      changes.push({ type: "QUERY_RAISED", after: next.queryText ?? next.queryId });
    }
    return changes;
  }
  const changes: Array<{ type: string; before?: string | null; after?: string | null }> = [];
  if (previous.status !== next.status) {
    changes.push({ type: "STATUS_CHANGED", before: previous.status, after: next.status });
  }
  if ((previous.deadline ?? "") !== (next.deadline ?? "")) {
    changes.push({ type: "DEADLINE_CHANGED", before: previous.deadline, after: next.deadline });
  }
  if (!previous.queryId && next.queryId) {
    changes.push({ type: "QUERY_RAISED", before: null, after: next.queryText ?? next.queryId });
  } else if (previous.queryId && !next.queryId) {
    changes.push({ type: "QUERY_REMOVED", before: previous.queryText ?? previous.queryId, after: null });
  } else if (previous.queryText !== next.queryText && next.queryText) {
    changes.push({ type: "QUERY_RAISED", before: previous.queryText, after: next.queryText });
  }
  if (changes.length === 0) {
    changes.push({ type: "NO_CHANGE", after: next.status });
  }
  return changes;
}
