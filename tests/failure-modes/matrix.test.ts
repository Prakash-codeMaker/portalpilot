import { beforeAll, describe, expect, it } from "vitest";
import { seedDemo, replaceCertificate, raiseClarification, setFalseSuccess, addDocument } from "@/db/repository";
import { queueCheck, waitForRun, submitRun, decideApproval } from "@/workflow/engine";
import { PortalPilotError } from "@/lib/core";
import { parseModelRequirements } from "@/agent";
import { FIRE_CERTIFICATE_WRONG_SITE, FIRE_CERTIFICATE_WRONG_ENTITY } from "@/demo/documents";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { POST as runAction } from "@/app/api/runs/[id]/[action]/route";

beforeAll(async () => {
  await seedDemo(true);
});

describe("failure-mode matrix", () => {
  it("blocks the expired certificate on the happy demo path", async () => {
    await seedDemo(true);
    await raiseClarification("MH-23881");
    const { runId } = await queueCheck("MH-23881");
    const bundle = await waitForRun(runId);
    expect(bundle?.run.resultStatus).toBe("BLOCKED");
    expect(bundle?.run.phase).not.toBe("COMPLETE");
    const fire = bundle?.requirements.find((r) => r.type === "FIRE_SAFETY_CERTIFICATE");
    expect(fire?.status).toBe("FAILED");
  });

  it("reaches human review after replacement", async () => {
    await seedDemo(true);
    await raiseClarification("MH-23881");
    await replaceCertificate("MH-23881");
    const { runId } = await queueCheck("MH-23881");
    const bundle = await waitForRun(runId);
    expect(bundle?.run.resultStatus).toBe("READY_FOR_APPROVAL");
    expect(bundle?.run.phase).toBe("WAITING_APPROVAL");
    expect(bundle?.requirements.every((r) => r.status === "VERIFIED")).toBe(true);
  });

  it("rejects submission without approval with 403", async () => {
    await seedDemo(true);
    await raiseClarification("MH-23881");
    await replaceCertificate("MH-23881");
    const { runId } = await queueCheck("MH-23881");
    await waitForRun(runId);
    await expect(submitRun(runId)).rejects.toMatchObject({ code: "APPROVAL_REQUIRED", message: "Approval required." });

    const response = await runAction(new Request("http://localhost/api/runs/x/submit", { method: "POST", body: "{}" }), {
      params: Promise.resolve({ id: runId, action: "submit" }),
    });
    expect(response.status).toBe(403);
    const body = (await response.json()) as { error: string; code: string };
    expect(body.error).toBe("Approval required.");
    expect(body.code).toBe("APPROVAL_REQUIRED");
  });

  it("detects false success after an approved submit", async () => {
    await seedDemo(true);
    await raiseClarification("MH-23881");
    await replaceCertificate("MH-23881");
    const { runId } = await queueCheck("MH-23881");
    await waitForRun(runId);
    await decideApproval(runId, "APPROVED", "Priya Shah");
    await setFalseSuccess("MH-23881");
    const result = await submitRun(runId, { actor: "Priya Shah" });
    expect(result.result).toBe("SUBMISSION_UNVERIFIED");
    const bundle = await waitForRun(runId);
    expect(bundle?.run.resultStatus).toBe("SUBMISSION_UNVERIFIED");
    expect(bundle?.run.phase).not.toBe("COMPLETE");
    expect(bundle?.run.errorCode).toBe("SUBMISSION_NOT_VERIFIED");
  });

  it("verifies a genuine submission", async () => {
    await seedDemo(true);
    await raiseClarification("MH-23881");
    await replaceCertificate("MH-23881");
    const { runId } = await queueCheck("MH-23881");
    await waitForRun(runId);
    await decideApproval(runId, "APPROVED", "Priya Shah");
    const result = await submitRun(runId, { actor: "Priya Shah" });
    expect(result.result).toBe("SUBMISSION_VERIFIED");
    expect(result.acknowledgement).toBe("ACK-89218");
    const bundle = await waitForRun(runId);
    expect(bundle?.run.phase).toBe("COMPLETE");
  });

  it("fails a wrong-site certificate", async () => {
    await seedDemo(true);
    await raiseClarification("MH-23881");
    await db
      .update(documents)
      .set({ active: false })
      .where(and(eq(documents.applicationId, "MH-23881"), eq(documents.type, "FIRE_SAFETY_CERTIFICATE")));
    await addDocument("MH-23881", FIRE_CERTIFICATE_WRONG_SITE);
    const { runId } = await queueCheck("MH-23881");
    const bundle = await waitForRun(runId);
    const fire = bundle?.requirements.find((r) => r.type === "FIRE_SAFETY_CERTIFICATE");
    expect(fire?.status).toBe("FAILED");
    expect(bundle?.run.phase).not.toBe("COMPLETE");
  });

  it("fails a wrong-entity document", async () => {
    await seedDemo(true);
    await raiseClarification("MH-23881");
    await db
      .update(documents)
      .set({ active: false })
      .where(and(eq(documents.applicationId, "MH-23881"), eq(documents.type, "FIRE_SAFETY_CERTIFICATE")));
    await addDocument("MH-23881", FIRE_CERTIFICATE_WRONG_ENTITY);
    const { runId } = await queueCheck("MH-23881");
    const bundle = await waitForRun(runId);
    const fire = bundle?.requirements.find((r) => r.type === "FIRE_SAFETY_CERTIFICATE");
    expect(fire?.status).toBe("FAILED");
  });

  it("rejects malformed LLM output", () => {
    try {
      parseModelRequirements({ requirements: "not-an-array" });
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(PortalPilotError);
      expect((error as PortalPilotError).code).toBe("MODEL_OUTPUT_INVALID");
    }
  });
});
