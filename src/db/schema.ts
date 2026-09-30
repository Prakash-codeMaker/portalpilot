import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const workspaceId = () => text("workspace_id").notNull().default("workspace");

export const applications = pgTable(
  "pp_applications",
  {
    id: text("id").primaryKey(),
    workspaceId: workspaceId(),
    externalId: text("external_id").notNull(),
    portal: text("portal").notNull(),
    portalId: text("portal_id").default("portal_demo"),
    title: text("title").notNull(),
    entity: text("entity").notNull(),
    site: text("site").notNull(),
    status: text("status").notNull(),
    deadline: text("deadline"),
    profileId: text("profile_id"),
    jobId: text("job_id"),
    workflowVersion: integer("workflow_version").notNull().default(1),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    queryId: text("query_id"),
    queryText: text("query_text"),
    acknowledgement: text("acknowledgement"),
    needsAttention: boolean("needs_attention").notNull().default(false),
    ownerId: text("owner_id").default("user_priya"),
    evidenceState: text("evidence_state").notNull().default("UNKNOWN"),
    verifiedRequirementCount: integer("verified_requirement_count").notNull().default(0),
    totalRequirementCount: integer("total_requirement_count").notNull().default(0),
    lastChangeAt: timestamp("last_change_at", { withTimezone: true }),
    lastChangeSummary: text("last_change_summary"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("pp_applications_status_idx").on(t.status),
    index("pp_applications_attention_idx").on(t.needsAttention),
    index("pp_applications_deadline_idx").on(t.deadline),
    index("pp_applications_portal_idx").on(t.portal),
  ],
);

export const applicationEvents = pgTable(
  "pp_application_events",
  {
    id: text("id").primaryKey(),
    workspaceId: workspaceId(),
    applicationId: text("application_id").notNull(),
    type: text("type").notNull(),
    beforeValue: text("before_value"),
    afterValue: text("after_value"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull().defaultNow(),
    runId: text("run_id"),
  },
  (t) => [
    index("pp_events_app_idx").on(t.applicationId),
    index("pp_events_type_idx").on(t.type),
    index("pp_events_observed_idx").on(t.observedAt),
  ],
);

export const documents = pgTable(
  "pp_documents",
  {
    id: text("id").primaryKey(),
    workspaceId: workspaceId(),
    applicationId: text("application_id").notNull(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    path: text("path").notNull(),
    content: text("content").notNull(),
    entity: text("entity"),
    site: text("site"),
    issuedAt: text("issued_at"),
    expiresAt: text("expires_at"),
    certificateId: text("certificate_id"),
    version: integer("version").notNull().default(1),
    sha256: text("sha256").notNull(),
    active: boolean("active").notNull().default(true),
    supersededBy: text("superseded_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("pp_documents_app_idx").on(t.applicationId),
    index("pp_documents_type_idx").on(t.type),
    index("pp_documents_hash_idx").on(t.sha256),
  ],
);

export const requirements = pgTable(
  "pp_requirements",
  {
    id: text("id").primaryKey(),
    workspaceId: workspaceId(),
    applicationId: text("application_id").notNull(),
    runId: text("run_id"),
    name: text("name").notNull(),
    type: text("type").notNull(),
    description: text("description").notNull(),
    required: boolean("required").notNull().default(true),
    status: text("status").notNull().default("MISSING"),
    reason: text("reason"),
    sourceQueryId: text("source_query_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("pp_requirements_app_idx").on(t.applicationId),
    index("pp_requirements_run_idx").on(t.runId),
  ],
);

export const evidence = pgTable(
  "pp_evidence",
  {
    id: text("id").primaryKey(),
    workspaceId: workspaceId(),
    requirementId: text("requirement_id").notNull(),
    documentId: text("document_id"),
    applicationId: text("application_id").notNull(),
    runId: text("run_id"),
    sourceUrl: text("source_url"),
    page: integer("page"),
    quote: text("quote"),
    field: text("field"),
    extractedValue: text("extracted_value"),
    status: text("status").notNull(),
    hash: text("hash"),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("pp_evidence_req_idx").on(t.requirementId),
    index("pp_evidence_app_idx").on(t.applicationId),
    index("pp_evidence_doc_idx").on(t.documentId),
  ],
);

export const runs = pgTable(
  "pp_runs",
  {
    id: text("id").primaryKey(),
    workspaceId: workspaceId(),
    applicationId: text("application_id").notNull(),
    jobId: text("job_id"),
    phase: text("phase").notNull(),
    mode: text("mode").notNull(),
    browserSessionId: text("browser_session_id"),
    sandboxId: text("sandbox_id"),
    snapshotId: text("snapshot_id"),
    profileId: text("profile_id"),
    replayUrl: text("replay_url"),
    metrics: jsonb("metrics").$type<Record<string, number>>(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    resultStatus: text("result_status"),
    preparedResponse: text("prepared_response"),
    manifest: jsonb("manifest").$type<Record<string, unknown>>(),
    cleanupStatus: text("cleanup_status").notNull().default("PENDING"),
    browserCleanup: text("browser_cleanup"),
    sandboxCleanup: text("sandbox_cleanup"),
    durationMs: integer("duration_ms"),
    currentStep: text("current_step"),
  },
  (t) => [
    index("pp_runs_app_idx").on(t.applicationId),
    index("pp_runs_job_idx").on(t.jobId),
    index("pp_runs_phase_idx").on(t.phase),
  ],
);

export const runEvents = pgTable(
  "pp_run_events",
  {
    id: text("id").primaryKey(),
    workspaceId: workspaceId(),
    runId: text("run_id").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    type: text("type").notNull(),
    message: text("message").notNull(),
    phase: text("phase"),
    data: jsonb("data").$type<Record<string, unknown>>(),
  },
  (t) => [index("pp_run_events_run_idx").on(t.runId)],
);

export const approvals = pgTable(
  "pp_approvals",
  {
    id: text("id").primaryKey(),
    workspaceId: workspaceId(),
    runId: text("run_id").notNull(),
    applicationId: text("application_id").notNull(),
    status: text("status").notNull(),
    approvedBy: text("approved_by"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    stateHash: text("state_hash"),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("pp_approvals_run_idx").on(t.runId),
    index("pp_approvals_status_idx").on(t.status),
  ],
);

export const observations = pgTable(
  "pp_observations",
  {
    id: text("id").primaryKey(),
    workspaceId: workspaceId(),
    applicationId: text("application_id").notNull(),
    runId: text("run_id"),
    status: text("status").notNull(),
    deadline: text("deadline"),
    queryId: text("query_id"),
    queryText: text("query_text"),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("pp_observations_app_idx").on(t.applicationId)],
);

export const portalApplications = pgTable("pp_portal_applications", {
  id: text("id").primaryKey(),
  workspaceId: workspaceId(),
  title: text("title").notNull(),
  entity: text("entity").notNull(),
  site: text("site").notNull(),
  status: text("status").notNull(),
  deadline: text("deadline"),
  queryId: text("query_id"),
  queryText: text("query_text"),
  acknowledgement: text("acknowledgement"),
  falseSuccess: boolean("false_success").notNull().default(false),
  successMessage: boolean("success_message").notNull().default(false),
  lastMessage: text("last_message"),
  submittedResponse: text("submitted_response"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workspaceSettings = pgTable("pp_workspace_settings", {
  id: text("id").primaryKey(),
  mode: text("mode").notNull().default("DEMO"),
  demoDate: text("demo_date").notNull().default("2026-09-29"),
  operatorName: text("operator_name").notNull().default("Priya Shah"),
  workspaceName: text("workspace_name").notNull().default("Apex Manufacturing"),
  portalBaseUrl: text("portal_base_url"),
});

export const workspaces = pgTable(
  "pp_workspaces",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    plan: text("plan").notNull().default("demo"),
    status: text("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("pp_workspaces_slug_idx").on(t.slug)],
);

export const users = pgTable(
  "pp_users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    status: text("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("pp_users_email_idx").on(t.email)],
);

export const workspaceMembers = pgTable(
  "pp_workspace_members",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().default("workspace"),
    userId: text("user_id").notNull(),
    role: text("role").notNull().default("OPERATOR"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("pp_members_workspace_idx").on(t.workspaceId),
    uniqueIndex("pp_members_workspace_user_idx").on(t.workspaceId, t.userId),
  ],
);

export const portals = pgTable(
  "pp_portals",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().default("workspace"),
    name: text("name").notNull(),
    baseUrl: text("base_url").notNull(),
    connectorType: text("connector_type").notNull().default("DEMO"),
    status: text("status").notNull().default("HEALTHY"),
    capabilities: jsonb("capabilities").$type<string[]>().notNull().default([]),
    lastHealthCheckAt: timestamp("last_health_check_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("pp_portals_workspace_idx").on(t.workspaceId), index("pp_portals_status_idx").on(t.status)],
);

export const monitoringRules = pgTable(
  "pp_monitoring_rules",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().default("workspace"),
    applicationId: text("application_id").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    intervalMinutes: integer("interval_minutes").notNull().default(360),
    changeTypes: jsonb("change_types").$type<string[]>().notNull().default([]),
    notificationPolicy: jsonb("notification_policy").$type<Record<string, unknown>>(),
    quietHours: jsonb("quiet_hours").$type<{ start: string; end: string }>(),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("pp_monitoring_workspace_idx").on(t.workspaceId),
    index("pp_monitoring_application_idx").on(t.applicationId),
    index("pp_monitoring_next_run_idx").on(t.nextRunAt),
  ],
);

export const notifications = pgTable(
  "pp_notifications",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().default("workspace"),
    userId: text("user_id"),
    applicationId: text("application_id"),
    runId: text("run_id"),
    type: text("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("pp_notifications_workspace_idx").on(t.workspaceId),
    index("pp_notifications_user_idx").on(t.userId),
    index("pp_notifications_created_idx").on(t.createdAt),
  ],
);

export const auditLogs = pgTable(
  "pp_audit_logs",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().default("workspace"),
    actorUserId: text("actor_user_id"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    requestId: text("request_id"),
    runId: text("run_id"),
    beforeState: jsonb("before_state").$type<Record<string, unknown>>(),
    afterState: jsonb("after_state").$type<Record<string, unknown>>(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("pp_audit_workspace_idx").on(t.workspaceId),
    index("pp_audit_entity_idx").on(t.entityType, t.entityId),
    index("pp_audit_created_idx").on(t.createdAt),
  ],
);

export const jobs = pgTable(
  "pp_jobs",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().default("workspace"),
    type: text("type").notNull(),
    status: text("status").notNull().default("QUEUED"),
    applicationId: text("application_id"),
    runId: text("run_id"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull().defaultNow(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: text("locked_by"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("pp_jobs_status_idx").on(t.status),
    index("pp_jobs_schedule_idx").on(t.scheduledAt),
    index("pp_jobs_application_idx").on(t.applicationId),
  ],
);

export const savedViews = pgTable(
  "pp_saved_views",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().default("workspace"),
    userId: text("user_id"),
    name: text("name").notNull(),
    resource: text("resource").notNull().default("applications"),
    filters: jsonb("filters").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("pp_saved_views_workspace_idx").on(t.workspaceId), index("pp_saved_views_user_idx").on(t.userId)],
);

export const schema = {
  applications,
  applicationEvents,
  documents,
  requirements,
  evidence,
  runs,
  runEvents,
  approvals,
  observations,
  portalApplications,
  workspaceSettings,
  workspaces,
  users,
  workspaceMembers,
  portals,
  monitoringRules,
  notifications,
  auditLogs,
  jobs,
  savedViews,
};
