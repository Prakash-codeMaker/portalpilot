import { describe, expect, it } from "vitest";
import {
  checkExpiry,
  contentHash,
  detectConflicts,
  detectObservationChanges,
  finalizeVerification,
  isStale,
  matchEntity,
  matchSite,
  verifyDocumentAgainstRequirement,
  verifyPostcondition,
} from "@/verifier";
import { compareDates, isExpired, sha256 } from "@/lib/core";
import { parseModelRequirements as parseReqs, extractRequirementsFromText as extract, analyzeEvidence as analyze } from "@/agent";
import { parseDocumentContent } from "@/sandbox";
import { FIRE_CERTIFICATE_NEW, FIRE_CERTIFICATE_OLD, FIRE_CERTIFICATE_WRONG_ENTITY, FIRE_CERTIFICATE_WRONG_SITE, FACTORY_LAYOUT } from "@/demo/documents";

describe("date comparison", () => {
  it("compares ISO dates", () => {
    expect(compareDates("2026-08-30", "2026-09-29")).toBeLessThan(0);
    expect(compareDates("2027-08-31", "2026-09-29")).toBeGreaterThan(0);
  });

  it("detects expiry against the demo clock", () => {
    expect(isExpired("2026-08-30", "2026-09-29")).toBe(true);
    expect(isExpired("2027-08-31", "2026-09-29")).toBe(false);
    expect(checkExpiry("2026-08-30", "2026-09-29").status).toBe("FAIL");
    expect(checkExpiry("2027-08-31", "2026-09-29").status).toBe("PASS");
  });
});

describe("identity matching", () => {
  it("matches entity exactly after normalization", () => {
    expect(matchEntity("Apex Manufacturing", "Apex Manufacturing").status).toBe("PASS");
    expect(matchEntity("Helix Industrials", "Apex Manufacturing").status).toBe("FAIL");
  });

  it("fails on site mismatch", () => {
    const result = matchSite("Mumbai Plant", "Pune Plant");
    expect(result.status).toBe("FAIL");
    expect(result.detail).toMatch(/does not match application site/);
  });
});

describe("hashing", () => {
  it("is stable SHA-256", () => {
    expect(sha256("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(contentHash("abc")).toBe(sha256("abc"));
  });
});

describe("conflicts and staleness", () => {
  it("detects conflicting certificates", () => {
    const a = parseDocumentContent(FIRE_CERTIFICATE_OLD.name, FIRE_CERTIFICATE_OLD.content);
    const b = parseDocumentContent(FIRE_CERTIFICATE_NEW.name, FIRE_CERTIFICATE_NEW.content);
    expect(detectConflicts([a, b])).toContain("FIRE_SAFETY_CERTIFICATE");
  });

  it("marks evidence stale when the hash changes", () => {
    const oldHash = sha256(FIRE_CERTIFICATE_OLD.content);
    const newHash = sha256(FIRE_CERTIFICATE_NEW.content);
    expect(isStale(oldHash, newHash)).toBe(true);
    expect(isStale(newHash, newHash)).toBe(false);
  });
});

describe("observation diffs", () => {
  it("detects status, deadline and query changes", () => {
    const changes = detectObservationChanges(
      { status: "UNDER_REVIEW", deadline: "2026-10-15", queryId: null, queryText: null },
      {
        status: "CLARIFICATION_REQUIRED",
        deadline: "2026-10-10",
        queryId: "Q-291",
        queryText: "Upload updated factory layout, valid fire safety certificate and pollution consent.",
      },
    );
    expect(changes.map((c) => c.type)).toEqual(["STATUS_CHANGED", "DEADLINE_CHANGED", "QUERY_RAISED"]);
  });
});

describe("requirement extraction", () => {
  it("extracts the three demo requirements", () => {
    const extracted = extract(
      "Upload updated factory layout, valid fire safety certificate and pollution consent.",
    );
    expect(extracted.requirements).toHaveLength(3);
    expect(extracted.requirements.map((r) => r.type).sort()).toEqual([
      "FACTORY_LAYOUT",
      "FIRE_SAFETY_CERTIFICATE",
      "POLLUTION_CONSENT",
    ].sort());
  });

  it("rejects malformed model output", () => {
    expect(() => parseReqs({ requirements: "not-an-array" })).toThrow(/did not match/);
  });
});

describe("analyst hallucination guard", () => {
  it("returns UNKNOWN when no evidence is supplied", () => {
    const result = analyze({ requirementName: "Valid fire safety certificate", evidence: [] });
    expect(result.result).toBe("UNKNOWN");
  });
});

describe("document verification", () => {
  const application = { entity: "Apex Manufacturing", site: "Pune Plant" };
  const requirement = {
    id: "req_1",
    name: "Valid fire safety certificate",
    type: "FIRE_SAFETY_CERTIFICATE",
    description: "Valid fire safety certificate",
    required: true,
  };

  it("blocks an expired certificate", () => {
    const doc = parseDocumentContent(FIRE_CERTIFICATE_OLD.name, FIRE_CERTIFICATE_OLD.content);
    const verdict = verifyDocumentAgainstRequirement({
      requirement,
      document: doc,
      application,
      currentDate: "2026-09-29",
      conflicting: false,
      stale: false,
    });
    expect(verdict.status).toBe("FAILED");
    expect(verdict.reason).toMatch(/Expired on 2026-08-30/);
  });

  it("verifies a current certificate", () => {
    const doc = parseDocumentContent(FIRE_CERTIFICATE_NEW.name, FIRE_CERTIFICATE_NEW.content);
    const verdict = verifyDocumentAgainstRequirement({
      requirement,
      document: doc,
      application,
      currentDate: "2026-09-29",
      conflicting: false,
      stale: false,
    });
    expect(verdict.status).toBe("VERIFIED");
  });

  it("fails a wrong-site certificate", () => {
    const doc = parseDocumentContent(FIRE_CERTIFICATE_WRONG_SITE.name, FIRE_CERTIFICATE_WRONG_SITE.content);
    const verdict = verifyDocumentAgainstRequirement({
      requirement,
      document: doc,
      application,
      currentDate: "2026-09-29",
      conflicting: false,
      stale: false,
    });
    expect(verdict.status).toBe("FAILED");
    expect(verdict.reason).toMatch(/site/);
  });

  it("fails a wrong-entity document", () => {
    const doc = parseDocumentContent(FIRE_CERTIFICATE_WRONG_ENTITY.name, FIRE_CERTIFICATE_WRONG_ENTITY.content);
    const verdict = verifyDocumentAgainstRequirement({
      requirement,
      document: doc,
      application,
      currentDate: "2026-09-29",
      conflicting: false,
      stale: false,
    });
    expect(verdict.status).toBe("FAILED");
    expect(verdict.reason).toMatch(/entity/);
  });

  it("marks missing documents", () => {
    const verdict = verifyDocumentAgainstRequirement({
      requirement,
      document: undefined,
      application,
      currentDate: "2026-09-29",
      conflicting: false,
      stale: false,
    });
    expect(verdict.status).toBe("MISSING");
  });

  it("does not auto-resolve conflicts", () => {
    const doc = parseDocumentContent(FIRE_CERTIFICATE_NEW.name, FIRE_CERTIFICATE_NEW.content);
    const verdict = verifyDocumentAgainstRequirement({
      requirement,
      document: doc,
      application,
      currentDate: "2026-09-29",
      conflicting: true,
      stale: false,
    });
    expect(verdict.status).toBe("CONFLICT");
  });

  it("blocks stale evidence", () => {
    const doc = parseDocumentContent(FACTORY_LAYOUT.name, FACTORY_LAYOUT.content);
    const verdict = verifyDocumentAgainstRequirement({
      requirement: { ...requirement, type: "FACTORY_LAYOUT", name: "Updated factory layout" },
      document: doc,
      application,
      currentDate: "2026-09-29",
      conflicting: false,
      stale: true,
    });
    expect(verdict.status).toBe("STALE");
  });

  it("only reaches READY_FOR_APPROVAL when every requirement is verified", () => {
    const ready = finalizeVerification([
      { requirementId: "1", type: "A", name: "A", status: "VERIFIED", checks: [], claims: [] },
      { requirementId: "2", type: "B", name: "B", status: "VERIFIED", checks: [], claims: [] },
    ]);
    expect(ready.decision).toBe("READY_FOR_APPROVAL");
    const blocked = finalizeVerification([
      { requirementId: "1", type: "A", name: "A", status: "VERIFIED", checks: [], claims: [] },
      { requirementId: "2", type: "B", name: "B", status: "FAILED", reason: "Expired", checks: [], claims: [] },
    ]);
    expect(blocked.decision).toBe("BLOCKED");
  });
});

describe("postcondition", () => {
  it("treats false success as unverified", () => {
    const result = verifyPostcondition({
      displayedSuccess: true,
      actualStatus: "DRAFT",
    });
    expect(result.result).toBe("SUBMISSION_UNVERIFIED");
    expect(result.message).toMatch(/showed DRAFT/);
  });

  it("verifies a real submission", () => {
    const result = verifyPostcondition({
      displayedSuccess: true,
      actualStatus: "SUBMITTED",
      acknowledgement: "ACK-89218",
    });
    expect(result.result).toBe("SUBMISSION_VERIFIED");
  });
});
