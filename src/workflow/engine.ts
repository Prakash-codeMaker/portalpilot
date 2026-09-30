import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  applicationEvents,
  applications,
  approvals,
  documents,
  evidence,
  jobs,
  observations,
  portalApplications,
  requirements,
  runEvents,
  runs,
} from "@/db/schema";
import {
  createId,
  isLiveConfigured,
  logError,
  logInfo,
  PortalPilotError,
  sha256,
  sleep,
  type ExecutionMode,
  type RunPhase,
} from "@/lib/core";
import { analyzeEvidence, draftClarificationResponse, extractWithOptionalLlm } from "@/agent";
import { createPortalBrowser, type PortalBrowser } from "@/browser";
import { createDocumentSandbox } from "@/sandbox";
import {
  detectConflicts,
  detectObservationChanges,
  finalizeVerification,
  verifyDocumentAgainstRequirement,
  verifyPostcondition,
  type ParsedDocument,
} from "@/verifier";
import { createJob, getCurrentDate, getMode, recordEvent, updateJob } from "@/db/repository";

const inflight = new Map<string, Promise<void>>();

async function setPhase(runId: string, phase: RunPhase, currentStep?: string) {
  await db
    .update(runs)
    .set({ phase, currentStep: currentStep ?? phase })
    .where(eq(runs.id, runId));
}

async function emit(runId: string, type: string, message: string, phase?: string, data?: Record<string, unknown>) {
  await db.insert(runEvents).values({
    id: createId("rev"),
    runId,
    type,
    message,
    phase,
    data,
  });
}

export async function getRunBundle(runId: string) {
  const [run] = await db.select().from(runs).where(eq(runs.id, runId)).limit(1);
  if (!run) return null;
  const events = await db.select().from(runEvents).where(eq(runEvents.runId, runId)).orderBy(runEvents.at);
  const [approval] = await db.select().from(approvals).where(eq(approvals.runId, runId)).limit(1);
  const reqs = await db.select().from(requirements).where(eq(requirements.runId, runId));
  const ev = await db.select().from(evidence).where(eq(evidence.runId, runId));
  return { run, events, approval, requirements: reqs, evidence: ev };
}

export async function queueCheck(applicationId: string, opts?: { submit?: boolean }) {
  const mode = await getMode();
  if (mode === "LIVE" && !isLiveConfigured()) {
    throw new PortalPilotError("LIVE_MODE_REQUIRES_KEY");
  }
  const [app] = await db.select().from(applications).where(eq(applications.id, applicationId)).limit(1);
  if (!app) throw new PortalPilotError("PORTAL_UNAVAILABLE", "Application not found.");

  const [latestRun] = await db
    .select()
    .from(runs)
    .where(eq(runs.applicationId, applicationId))
    .orderBy(desc(runs.startedAt))
    .limit(1);
  if (
    latestRun &&
    [
      "CREATED",
      "BROWSER",
      "OBSERVING",
      "EXTRACTING",
      "SANDBOX",
      "VERIFYING",
      "PREPARING",
      "SUBMITTING",
      "POST_VERIFY",
    ].includes(latestRun.phase)
  ) {
    throw new PortalPilotError("VERIFICATION_FAILED", "A check is already running for this application.");
  }

  const runId = createId("run");
  const job = await createJob({
    type: "APPLICATION_CHECK",
    applicationId,
    payload: { submit: Boolean(opts?.submit) },
  });
  await db.insert(runs).values({
    id: runId,
    applicationId,
    phase: "CREATED",
    mode,
    jobId: job.id,
    currentStep: "Queued",
  });
  await updateJob(job.id, { runId });
  await emit(runId, "run_created", "Run created", "CREATED", { applicationId, mode });

  if (process.env.PORTALPILOT_ASYNC === "true") {
    return { runId, status: "QUEUED" as const, mode };
  }

  const work = executeRun(runId, { submit: opts?.submit })
    .then(async () => {
      await updateJob(job.id, { status: "COMPLETE", lockedAt: new Date(), lockedBy: "inline-worker" });
    })
    .catch(async (error) => {
      const message = error instanceof Error ? error.message : String(error);
      logError("run_failed", { runId, jobId: job.id, error: message });
      await updateJob(job.id, { status: "FAILED", lastError: message, attempts: 1 });
    });
  inflight.set(runId, work);
  return { runId, status: "QUEUED" as const, mode };
}

export async function executeRun(runId: string, opts?: { submit?: boolean }) {
  const [run] = await db.select().from(runs).where(eq(runs.id, runId)).limit(1);
  if (!run) return;
  const mode = run.mode as ExecutionMode;
  const started = Date.now();
  let browser: PortalBrowser | null = null;
  let sandbox: ReturnType<typeof createDocumentSandbox> | null = null;
  let browserCleanup = "pending";
  let sandboxCleanup = "pending";
  let cleanupStatus = "PENDING";

  try {
    await setPhase(runId, "BROWSER", "Checking application...");
    await emit(runId, "browser_created", "Browser session created", "BROWSER");
    browser = createPortalBrowser(mode);
    await browser.start();
    await db.update(runs).set({ browserSessionId: browser.sessionId }).where(eq(runs.id, runId));
    await emit(runId, "browser_session", `Browser session ${browser.sessionId}`, "BROWSER", {
      browserSessionId: browser.sessionId,
    });

    await setPhase(runId, "OBSERVING", "Reading portal state...");
    await emit(runId, "application_found", "Application opened", "OBSERVING");
    const observation = await browser.observeApplication(run.applicationId);
    const [previous] = await db
      .select()
      .from(observations)
      .where(eq(observations.applicationId, run.applicationId))
      .orderBy(desc(observations.observedAt))
      .limit(1);

    const changes = detectObservationChanges(previous, observation);
    await db.insert(observations).values({
      id: createId("obs"),
      applicationId: run.applicationId,
      runId,
      status: observation.status,
      deadline: observation.deadline,
      queryId: observation.queryId,
      queryText: observation.queryText,
    });

    const appPatch: Partial<typeof applications.$inferInsert> = {
      status: observation.status,
      deadline: observation.deadline,
      queryId: observation.queryId ?? null,
      queryText: observation.queryText ?? null,
      lastCheckedAt: new Date(),
      updatedAt: new Date(),
    };
    const meaningful = changes.filter((c) => c.type !== "NO_CHANGE" && c.type !== "INITIAL_OBSERVATION");
    if (meaningful.length > 0) {
      appPatch.lastChangeAt = new Date();
      appPatch.lastChangeSummary = meaningful.map((c) => c.type.replaceAll("_", " ")).join(", ");
      appPatch.needsAttention = observation.status === "CLARIFICATION_REQUIRED";
    }
    await db.update(applications).set(appPatch).where(eq(applications.id, run.applicationId));

    for (const change of changes) {
      await recordEvent({
        applicationId: run.applicationId,
        type: change.type,
        beforeValue: change.before,
        afterValue: change.after,
        runId,
      });
      if (change.type === "STATUS_CHANGED") {
        await emit(runId, "status_changed", `Status changed ${change.before} → ${change.after}`, "OBSERVING", change);
      } else if (change.type === "DEADLINE_CHANGED") {
        await emit(runId, "deadline_changed", `Deadline changed ${change.before} → ${change.after}`, "OBSERVING", change);
      } else if (change.type === "QUERY_RAISED") {
        await emit(runId, "query_found", `Query ${observation.queryId ?? ""} detected`, "OBSERVING", change);
      } else {
        await emit(runId, change.type.toLowerCase(), change.type.replaceAll("_", " "), "OBSERVING", change);
      }
    }

    await setPhase(runId, "EXTRACTING", "Extracting requirements...");
    let extracted =
      observation.queryText
        ? await extractWithOptionalLlm(observation.queryText)
        : { requirements: [] as Array<{ type: string; name: string; description: string; required: boolean }> };

    if (observation.queryText && extracted.requirements.length === 0) {
      throw new PortalPilotError("MODEL_OUTPUT_INVALID");
    }

    const requirementRows = [];
    if (extracted.requirements.length === 0) {
      await emit(runId, "no_query", "No clarification present. Observation complete.", "OBSERVING");
      await db.update(runs).set({
        phase: "COMPLETE",
        resultStatus: "NO_CHANGE",
        currentStep: "Observation complete",
      }).where(eq(runs.id, runId));
      return;
    }
    for (const req of extracted.requirements) {
      const row = {
        id: createId("req"),
        applicationId: run.applicationId,
        runId,
        name: req.name,
        type: req.type,
        description: req.description,
        required: req.required,
        status: "MISSING",
        sourceQueryId: observation.queryId,
      };
      await db.insert(requirements).values(row);
      requirementRows.push(row);
    }

    await setPhase(runId, "SANDBOX", "Indexing documents...");
    sandbox = createDocumentSandbox(mode);
    const activeDocs = await db
      .select()
      .from(documents)
      .where(and(eq(documents.applicationId, run.applicationId), eq(documents.active, true)));
    await emit(runId, "sandbox_created", "Sandbox created", "SANDBOX");
    const processed = await sandbox.process(activeDocs.map((d) => ({ name: d.name, content: d.content })));
    await db.update(runs).set({
      sandboxId: processed.sandboxId,
      snapshotId: processed.snapshotId ?? null,
      metrics: processed.metrics
        ? {
            cpuPct: processed.metrics.cpuPct,
            memBytes: processed.metrics.memBytes,
            memTotalBytes: processed.metrics.memTotalBytes,
            diskBytes: processed.metrics.diskBytes,
          }
        : null,
    }).where(eq(runs.id, runId));
    await emit(runId, "documents_indexed", "Documents indexed", "SANDBOX", {
      sandboxId: processed.sandboxId,
      count: processed.documents.length,
    });

    const parsedByName = new Map(processed.documents.map((d) => [d.name, d]));
    const parsedActive: ParsedDocument[] = activeDocs.map((d) => {
      const parsed = parsedByName.get(d.name) ?? {
        name: d.name,
        type: d.type,
        entity: d.entity ?? undefined,
        site: d.site ?? undefined,
        issuedAt: d.issuedAt ?? undefined,
        expiresAt: d.expiresAt ?? undefined,
        certificateId: d.certificateId ?? undefined,
        content: d.content,
        sha256: d.sha256,
        page: 1,
      };
      return parsed;
    });

    await setPhase(runId, "VERIFYING", "Verifying evidence...");
    await emit(runId, "verification_started", "Verification started", "VERIFYING");
    const currentDate = await getCurrentDate();
    const [app] = await db.select().from(applications).where(eq(applications.id, run.applicationId)).limit(1);
    if (!app) throw new PortalPilotError("PORTAL_UNAVAILABLE");

    const conflictTypes = detectConflicts(parsedActive);
    const verdicts = [];
    for (const req of requirementRows) {
      const candidates = parsedActive.filter((d) => d.type === req.type);
      const conflicting = conflictTypes.includes(req.type) && candidates.length > 1;
      const chosen = conflicting ? undefined : candidates[0];
      const currentDocRow = activeDocs.find((d) => d.name === chosen?.name);
      const previousEvidence = currentDocRow
        ? await db
            .select({ hash: evidence.hash })
            .from(evidence)
            .where(and(eq(evidence.applicationId, run.applicationId), eq(evidence.documentId, currentDocRow.id)))
            .limit(1)
        : [];
      const stale = Boolean(previousEvidence[0]?.hash && chosen?.sha256 && previousEvidence[0].hash !== chosen.sha256);
      const verdict = verifyDocumentAgainstRequirement({
        requirement: req,
        document: conflicting ? candidates[0] : chosen,
        application: { entity: app.entity, site: app.site },
        currentDate,
        conflicting,
        stale,
      });
      if (conflicting) {
        verdict.status = "CONFLICT";
        verdict.reason = "Two candidate documents contain conflicting values. Human review required.";
      }
      verdicts.push(verdict);

      await db
        .update(requirements)
        .set({ status: verdict.status, reason: verdict.reason })
        .where(eq(requirements.id, req.id));

      for (const claim of verdict.claims) {
        const doc = activeDocs.find((d) => d.name === claim.documentName);
        await db.insert(evidence).values({
          id: createId("evd"),
          requirementId: req.id,
          documentId: doc?.id,
          applicationId: run.applicationId,
          runId,
          page: claim.page,
          quote: claim.quote,
          field: claim.field,
          extractedValue: claim.extractedValue,
          status: claim.status,
          hash: claim.hash,
        });
      }

      const analyst = analyzeEvidence({
        requirementName: req.name,
        evidence: verdict.claims.map((c) => ({
          documentName: c.documentName,
          quote: c.quote,
          field: c.field,
          extractedValue: c.extractedValue,
          status: c.status,
        })),
      });
      if (analyst.result === "VERIFIED" && verdict.status !== "VERIFIED") {
        // Deterministic verifier is the authority. Analyst cannot promote FAILED/UNKNOWN.
      }

      if (verdict.status === "VERIFIED") {
        await emit(runId, "requirement_verified", `${req.name} verified`, "VERIFYING", { requirementId: req.id });
      } else {
        await emit(runId, "requirement_failed", `${req.name} ${verdict.status.toLowerCase()}`, "VERIFYING", {
          requirementId: req.id,
          reason: verdict.reason,
        });
      }
    }

    const report = finalizeVerification(verdicts);
    await db
      .update(applications)
      .set({
        evidenceState: report.decision === "READY_FOR_APPROVAL" ? "VERIFIED" : report.conflicts ? "CONFLICT" : "FAILED",
        verifiedRequirementCount: report.verifiedCount,
        totalRequirementCount: report.totalRequired,
        needsAttention: report.decision !== "READY_FOR_APPROVAL" || observation.status === "CLARIFICATION_REQUIRED",
      })
      .where(eq(applications.id, run.applicationId));

    if (report.decision !== "READY_FOR_APPROVAL") {
      await recordEvent({
        applicationId: run.applicationId,
        type: "VERIFICATION_FAILED",
        afterValue: report.blockedReason,
        runId,
      });
      await emit(runId, "run_blocked", report.blockedReason ?? "Run blocked", "VERIFYING", {
        decision: report.decision,
      });
      await db.update(runs).set({
        resultStatus: report.decision,
        phase: "FAILED",
        currentStep: report.blockedReason ?? "Blocked",
        errorCode: report.conflicts ? "CONFLICT" : report.missing ? "DOCUMENT_MISSING" : "VERIFICATION_FAILED",
        errorMessage: report.blockedReason,
      }).where(eq(runs.id, runId));
      return;
    }

    await setPhase(runId, "PREPARING", "Preparing response...");
    const draft = draftClarificationResponse({
      queryId: observation.queryId ?? "clarification",
      entity: app.entity,
      site: app.site,
      verifiedNames: verdicts.filter((v) => v.status === "VERIFIED").map((v) => v.name),
    });
    await db.update(runs).set({ preparedResponse: draft, resultStatus: "READY_FOR_APPROVAL" }).where(eq(runs.id, runId));
    await recordEvent({
      applicationId: run.applicationId,
      type: "VERIFICATION_COMPLETE",
      afterValue: `${report.verifiedCount}/${report.totalRequired}`,
      runId,
    });
    await emit(runId, "approval_requested", "Ready for human review", "PREPARING");

    await setPhase(runId, "WAITING_APPROVAL", "Waiting for human approval");
    const [existingApproval] = await db.select().from(approvals).where(eq(approvals.runId, runId)).limit(1);
    if (!existingApproval) {
      await db.insert(approvals).values({
        id: createId("apr"),
        runId,
        applicationId: run.applicationId,
        status: "PENDING",
      });
    }
    await recordEvent({
      applicationId: run.applicationId,
      type: "APPROVAL_REQUESTED",
      afterValue: runId,
      runId,
    });

    if (opts?.submit) {
      await submitRun(runId, { actor: "system-demo" });
    }
  } catch (error) {
    const err = error instanceof PortalPilotError ? error : new PortalPilotError("VERIFICATION_FAILED", error instanceof Error ? error.message : "Run failed");
    logError("run_error", { runId, code: err.code, message: err.message });
    await emit(runId, "run_failed", err.message, "FAILED", { code: err.code });
    await db.update(runs).set({
      phase: "FAILED",
      errorCode: err.code,
      errorMessage: err.message,
      currentStep: err.message,
      resultStatus: "FAILED",
    }).where(eq(runs.id, runId));
    await recordEvent({
      applicationId: run.applicationId,
      type: "RUN_FAILED",
      afterValue: err.code,
      runId,
    });
  } finally {
    try {
      if (browser) {
        await browser.close();
        browserCleanup = "released";
        await emit(runId, "cleanup_browser", "Browser released", "COMPLETE");
      } else {
        browserCleanup = "none";
      }
    } catch (error) {
      browserCleanup = "failed";
      logError("browser_cleanup_failed", { runId, error: String(error) });
    }
    try {
      if (sandbox) {
        await sandbox.destroy();
        sandboxCleanup = "destroyed";
        await emit(runId, "cleanup_sandbox", "Sandbox destroyed", "COMPLETE");
      } else {
        sandboxCleanup = "none";
      }
    } catch (error) {
      sandboxCleanup = "failed";
      logError("sandbox_cleanup_failed", { runId, error: String(error) });
    }
    cleanupStatus = browserCleanup === "failed" || sandboxCleanup === "failed" ? "RESOURCE_CLEANUP_FAILED" : "COMPLETE";
    if (cleanupStatus === "RESOURCE_CLEANUP_FAILED") {
      await emit(runId, "cleanup_failed", "Resource cleanup failed", "FAILED");
    } else {
      await emit(runId, "cleanup_complete", "Run finalized", "COMPLETE");
      await recordEvent({
        applicationId: run.applicationId,
        type: "RESOURCE_CLEANUP_COMPLETE",
        afterValue: cleanupStatus,
        runId,
      });
    }
    const [latest] = await db.select().from(runs).where(eq(runs.id, runId)).limit(1);
    const manifest = {
      runId,
      applicationId: run.applicationId,
      mode,
      browserSessionId: latest?.browserSessionId,
      sandboxId: latest?.sandboxId,
      snapshotId: latest?.snapshotId,
      metrics: latest?.metrics,
      replayUrl: browser?.replayUrl ?? latest?.replayUrl ?? null,
      requirementsVerified: latest?.resultStatus,
      submission: latest?.resultStatus,
      cleanup: { browser: browserCleanup, sandbox: sandboxCleanup, status: cleanupStatus },
    };
    await db.update(runs).set({
      endedAt: new Date(),
      durationMs: Date.now() - started,
      cleanupStatus,
      browserCleanup,
      sandboxCleanup,
      manifest,
      replayUrl: browser?.replayUrl ?? latest?.replayUrl ?? null,
    }).where(eq(runs.id, runId));
    inflight.delete(runId);
  }
}

async function computeApprovalStateHash(applicationId: string, runId: string) {
  const [application] = await db.select({
    status: applications.status,
    deadline: applications.deadline,
    queryId: applications.queryId,
    queryText: applications.queryText,
    workflowVersion: applications.workflowVersion,
  }).from(applications).where(eq(applications.id, applicationId)).limit(1);
  const evidenceRows = await db
    .select({ documentId: evidence.documentId, hash: evidence.hash, status: evidence.status })
    .from(evidence)
    .where(eq(evidence.runId, runId));
  const activeDocs = await db
    .select({ id: documents.id, sha256: documents.sha256, version: documents.version, active: documents.active })
    .from(documents)
    .where(and(eq(documents.applicationId, applicationId), eq(documents.active, true)));
  return sha256(JSON.stringify({ application, evidence: evidenceRows, activeDocs }));
}

export async function decideApproval(runId: string, decision: "APPROVED" | "REJECTED", actor: string, reason?: string) {
  const bundle = await getRunBundle(runId);
  if (!bundle) throw new PortalPilotError("PORTAL_UNAVAILABLE", "Run not found.");
  if (bundle.run.phase !== "WAITING_APPROVAL" && bundle.run.resultStatus !== "READY_FOR_APPROVAL") {
    throw new PortalPilotError("VERIFICATION_FAILED", "This run is not waiting for approval.");
  }
  const [approval] = await db.select().from(approvals).where(eq(approvals.runId, runId)).limit(1);
  if (!approval) throw new PortalPilotError("APPROVAL_REQUIRED");
  if (approval.status !== "PENDING") {
    throw new PortalPilotError("VERIFICATION_FAILED", `This approval is already ${approval.status.toLowerCase()}.`);
  }

  const stateHash = await computeApprovalStateHash(bundle.run.applicationId, runId);
  const expiresAt = new Date(Date.now() + 15 * 60_000);
  await db
    .update(approvals)
    .set({
      status: decision,
      approvedBy: actor,
      approvedAt: new Date(),
      expiresAt: decision === "APPROVED" ? expiresAt : null,
      stateHash: decision === "APPROVED" ? stateHash : null,
      reason: reason ?? null,
    })
    .where(eq(approvals.id, approval.id));
  await recordEvent({
    applicationId: bundle.run.applicationId,
    type: decision === "APPROVED" ? "APPROVED" : "REJECTED",
    afterValue: actor,
    runId,
  });
  return { runId, status: decision };
}

export async function submitRun(runId: string, opts?: { actor?: string }) {
  const bundle = await getRunBundle(runId);
  if (!bundle) throw new PortalPilotError("PORTAL_UNAVAILABLE", "Run not found.");
  if (bundle.run.resultStatus === "SUBMISSION_VERIFIED") {
    return { result: "SUBMISSION_VERIFIED" as const, message: "Submission was already verified for this run.", acknowledgement: null, status: "SUBMITTED" };
  }
  if (!["READY_FOR_APPROVAL", "WAITING_APPROVAL"].includes(bundle.run.resultStatus ?? "") && bundle.run.phase !== "WAITING_APPROVAL") {
    throw new PortalPilotError("VERIFICATION_FAILED", "This run is not ready for submission.");
  }
  const [approval] = await db.select().from(approvals).where(eq(approvals.runId, runId)).limit(1);
  if (!approval || approval.status !== "APPROVED") {
    throw new PortalPilotError("APPROVAL_REQUIRED", "Approval required.");
  }
  if (approval.expiresAt && approval.expiresAt.getTime() < Date.now()) {
    await db.update(approvals).set({ status: "EXPIRED" }).where(eq(approvals.id, approval.id));
    throw new PortalPilotError("APPROVAL_REQUIRED", "Approval has expired and must be renewed.");
  }
  if (bundle.run.resultStatus !== "READY_FOR_APPROVAL" && bundle.run.phase !== "WAITING_APPROVAL") {
    if (bundle.run.resultStatus === "BLOCKED" || bundle.run.phase === "FAILED") {
      throw new PortalPilotError("VERIFICATION_FAILED", "Submission is blocked until evidence is verified.");
    }
  }

  const mode = bundle.run.mode as ExecutionMode;
  if (mode === "LIVE" && !isLiveConfigured()) {
    throw new PortalPilotError("LIVE_MODE_REQUIRES_KEY");
  }

  let browser: PortalBrowser | null = null;
  let browserCleanup = "pending";
  try {
    const currentStateHash = await computeApprovalStateHash(bundle.run.applicationId, runId);
    const [application] = await db.select().from(applications).where(eq(applications.id, bundle.run.applicationId)).limit(1);
    if (approval.stateHash && approval.stateHash !== currentStateHash) {
      await db.update(approvals).set({ status: "STALE", reason: "Application or evidence changed after approval." }).where(eq(approvals.id, approval.id));
      throw new PortalPilotError("STALE", "Application or evidence changed after approval. Re-review is required.");
    }

    const recheckBrowser = createPortalBrowser(mode);
    await recheckBrowser.start();
    try {
      const latest = await recheckBrowser.observeApplication(bundle.run.applicationId);
      if (latest.status !== application?.status || latest.queryId !== application?.queryId) {
        await db.update(approvals).set({ status: "STALE", reason: "Portal state changed after approval." }).where(eq(approvals.id, approval.id));
        throw new PortalPilotError("STALE", "Portal state changed after approval. Re-review is required.");
      }
    } finally {
      await recheckBrowser.close().catch(() => undefined);
    }

    await setPhase(runId, "SUBMITTING", "Submitting...");
    await emit(runId, "submission_started", "Submission started", "SUBMITTING");
    await recordEvent({
      applicationId: bundle.run.applicationId,
      type: "SUBMISSION_STARTED",
      runId,
    });
    browser = createPortalBrowser(mode);
    await browser.start();
    await db.update(runs).set({ browserSessionId: browser.sessionId }).where(eq(runs.id, runId));
    await emit(runId, "browser_created", "Browser session created", "SUBMITTING");

    const docs = await db
      .select()
      .from(documents)
      .where(and(eq(documents.applicationId, bundle.run.applicationId), eq(documents.active, true)));
    const attempt = await browser.submit({
      applicationId: bundle.run.applicationId,
      responseText: bundle.run.preparedResponse ?? "",
      documentNames: docs.map((d) => d.name),
    });
    await emit(runId, "portal_message", attempt.message, "SUBMITTING", { displayedSuccess: attempt.displayedSuccess });
    await sleep(80);

    await setPhase(runId, "POST_VERIFY", "Reopening application...");
    await emit(runId, "reopen", "Reopening application", "POST_VERIFY");
    const post = await browser.verifySubmission(bundle.run.applicationId);
    const verdict = verifyPostcondition({
      displayedSuccess: attempt.displayedSuccess || post.displayedSuccess,
      actualStatus: post.status,
      acknowledgement: post.acknowledgement,
    });

    await db
      .update(applications)
      .set({
        status: post.status,
        acknowledgement: post.acknowledgement,
        lastCheckedAt: new Date(),
        lastChangeAt: new Date(),
        lastChangeSummary: verdict.result.replaceAll("_", " "),
        needsAttention: verdict.result !== "SUBMISSION_VERIFIED",
        queryId: verdict.result === "SUBMISSION_VERIFIED" ? null : undefined,
        queryText: verdict.result === "SUBMISSION_VERIFIED" ? null : undefined,
      })
      .where(eq(applications.id, bundle.run.applicationId));

    if (verdict.result === "SUBMISSION_UNVERIFIED") {
      await emit(runId, "postcondition_failed", verdict.message, "POST_VERIFY", { actualStatus: post.status });
      await recordEvent({
        applicationId: bundle.run.applicationId,
        type: "SUBMISSION_UNVERIFIED",
        afterValue: post.status,
        runId,
        metadata: { message: verdict.message },
      });
      await db.update(runs).set({
        phase: "FAILED",
        resultStatus: "SUBMISSION_UNVERIFIED",
        errorCode: "SUBMISSION_NOT_VERIFIED",
        errorMessage: verdict.message,
        currentStep: "Submission unverified",
      }).where(eq(runs.id, runId));
      return { result: verdict.result, message: verdict.message, acknowledgement: post.acknowledgement, status: post.status };
    }

    await emit(runId, "postcondition_verified", verdict.message, "POST_VERIFY", {
      acknowledgement: post.acknowledgement,
    });
    await recordEvent({
      applicationId: bundle.run.applicationId,
      type: "SUBMISSION_VERIFIED",
      afterValue: post.acknowledgement,
      runId,
    });
    await db.update(runs).set({
      phase: "COMPLETE",
      resultStatus: "SUBMISSION_VERIFIED",
      currentStep: "Submission verified",
      errorCode: null,
      errorMessage: null,
      replayUrl: browser.replayUrl ?? null,
    }).where(eq(runs.id, runId));
    await db
      .update(applications)
      .set({ needsAttention: false, evidenceState: "VERIFIED" })
      .where(eq(applications.id, bundle.run.applicationId));
    return { result: verdict.result, message: verdict.message, acknowledgement: post.acknowledgement, status: post.status };
  } finally {
    try {
      if (browser) {
        await browser.close();
        browserCleanup = "released";
      }
    } catch {
      browserCleanup = "failed";
    }
    await db.update(runs).set({
      browserCleanup,
      cleanupStatus: browserCleanup === "failed" ? "RESOURCE_CLEANUP_FAILED" : "COMPLETE",
      endedAt: new Date(),
      replayUrl: browser?.replayUrl ?? null,
    }).where(eq(runs.id, runId));
  }
}

export async function processQueuedJobs(limit = 5) {
  const workerId = `worker_${process.pid}`;
  const staleBefore = new Date(Date.now() - 10 * 60_000);
  await db
    .update(jobs)
    .set({ status: "QUEUED", lockedAt: null, lockedBy: null, updatedAt: new Date() })
    .where(and(eq(jobs.status, "RUNNING"), sql`${jobs.lockedAt} < ${staleBefore}`));

  const due = await db
    .select()
    .from(jobs)
    .where(eq(jobs.status, "QUEUED"))
    .orderBy(jobs.scheduledAt)
    .limit(Math.min(20, Math.max(1, limit)));
  let processed = 0;
  for (const job of due) {
    if (!job.runId || (job.scheduledAt && job.scheduledAt.getTime() > Date.now())) continue;
    const [claimed] = await db
      .update(jobs)
      .set({ status: "RUNNING", lockedAt: new Date(), lockedBy: workerId, attempts: (job.attempts ?? 0) + 1, updatedAt: new Date() })
      .where(and(eq(jobs.id, job.id), eq(jobs.status, "QUEUED")))
      .returning();
    if (!claimed) continue;
    processed += 1;
    try {
      await executeRun(job.runId, { submit: Boolean((job.payload as { submit?: boolean } | null)?.submit) });
      const [finished] = await db.select({ phase: runs.phase, resultStatus: runs.resultStatus, errorMessage: runs.errorMessage }).from(runs).where(eq(runs.id, job.runId)).limit(1);
      const failed = finished?.phase === "FAILED" || (finished?.resultStatus ?? "").endsWith("UNVERIFIED");
      await updateJob(job.id, {
        status: failed ? ((job.attempts ?? 0) < (job.maxAttempts ?? 3) ? "FAILED" : "FAILED") : "COMPLETE",
        lastError: failed ? (finished?.errorMessage ?? finished?.resultStatus ?? "Run failed") : null,
        updatedAt: new Date(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await updateJob(job.id, { status: "FAILED", lastError: message, updatedAt: new Date() });
    }
  }
  return { processed };
}

export async function waitForRun(runId: string) {
  const pending = inflight.get(runId);
  if (pending) await pending;
  return getRunBundle(runId);
}

export { applicationEvents, portalApplications };
