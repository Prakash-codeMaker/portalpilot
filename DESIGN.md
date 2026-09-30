# PortalPilot — System Design

## 1. Product architecture

PortalPilot is a Next.js App Router application with a PostgreSQL persistence layer and a workflow service that abstracts execution surfaces behind interfaces.

```text
Browser UI
   │
   ├── REST
   └── SSE / polling
        │
        ▼
API Layer
        │
        ▼
Domain / Workflow Services
        │
        ├── Monitoring
        ├── Queries
        ├── Documents
        ├── Evidence
        ├── Verification
        ├── Approval / Policy
        └── Submission
        │
        ├───────────────┐
        ▼               ▼
PostgreSQL        Execution adapters
                        │
             ┌──────────┼───────────┐
             ▼          ▼           ▼
          Browser    Sandbox     Desktop*

* Desktop is optional.
```

The goal is to keep domain state independent from ephemeral Solari resources.

## 2. Execution philosophy

A run is a persisted state machine. A browser or sandbox is a disposable worker resource.

```text
Run state
   │
   ├── persistent
   │
   └── resumable where safe

Solari resource
   │
   ├── ephemeral
   └── cleaned up after work
```

This avoids treating a browser process or VM as durable state.

## 3. Workflow state machine

Primary path:

```text
CREATED
  ↓
BROWSER
  ↓
OBSERVING
  ↓
EXTRACTING
  ↓
SANDBOX
  ↓
VERIFYING
  ↓
PREPARING
  ↓
WAITING_APPROVAL
  ↓
SUBMITTING
  ↓
POST_VERIFY
  ↓
COMPLETE
```

Failure path:

```text
any phase → FAILED
```

A submission that cannot be independently confirmed is not a complete success:

```text
SUBMIT
 ↓
REOPEN
 ↓
DRAFT
 ↓
SUBMISSION_UNVERIFIED
```

## 4. Domain modules

### Workspace

Owns workspace, users, memberships and roles.

### Applications

Represents monitored external applications.

### Portals

Contains external system metadata and connector capabilities.

### Monitoring

Contains watch frequency, change types, notification policy and next-run scheduling.

### Queries

Represents external clarification requests.

### Documents

Versioned artifacts associated with applications.

### Evidence

Claim-level traceability from requirement → document → page/quote → extracted value → verification.

### Verification

Deterministic validation layer.

### Approval

Human/policy gate.

### Runs

Execution and technical evidence.

### Audit

Immutable operational history.

## 5. Database

Core tables:

```text
pp_workspaces
pp_users
pp_workspace_members
pp_portals
pp_applications
pp_portal_applications
pp_monitoring_rules
pp_jobs
pp_observations
pp_application_events
pp_documents
pp_requirements
pp_evidence
pp_runs
pp_run_events
pp_approvals
pp_notifications
pp_audit_logs
pp_saved_views
pp_workspace_settings
```

All major workspace-owned entities have `workspaceId` fields so the schema can evolve to strict tenant isolation.

## 6. Evidence architecture

Evidence is not a single confidence score.

```text
Application
    │
    ▼
Query
    │
    ▼
Requirement
    │
    ▼
Document
    │
    ▼
Page / quote
    │
    ▼
Extracted field
    │
    ▼
Deterministic checks
    │
    ▼
Verification result
```

Every important claim can carry:

- document ID
- document version
- SHA-256 hash
- page
- quote
- extracted value
- run ID
- observation time

## 7. AI boundary

The model is a bounded interpreter.

```text
UNTRUSTED PORTAL/DOCUMENT DATA
                ↓
        LLM interpretation
                ↓
        Schema validation
                ↓
        Deterministic verifier
                ↓
            Decision
```

Model instructions contained inside portal pages or documents are data, not system instructions.

## 8. Deterministic verifier

The verifier checks:

- existence
- document type
- entity
- site
- issue date
- expiry
- currentness
- conflicts
- stale hashes
- required coverage
- portal state
- approval state
- postconditions

`READY_FOR_APPROVAL` is only possible when all required evidence is verified and there are no unresolved conflicts, missing evidence or stale evidence.

## 9. Approval integrity

Approval is tied to a state hash covering:

- application state
- workflow version
- run evidence
- active document hashes/versions

An approval becomes invalid when that state changes.

The approval also has a short expiration window.

## 10. Submission integrity

Submission uses a bounded connector operation, never arbitrary model-generated browser commands.

Before submission:

1. verify approval
2. verify approval freshness
3. verify application state
4. re-observe portal
5. verify evidence freshness
6. execute submission

After submission:

1. reopen
2. observe actual state
3. read acknowledgement
4. evaluate postcondition

## 11. Idempotency

A run that already reached `SUBMISSION_VERIFIED` returns its existing verified result instead of submitting again.

A future database-level idempotency key can be attached to every consequential action.

## 12. Jobs and worker model

Manual checks and scheduled monitoring become persisted jobs.

```text
Monitoring Rule
      ↓
Due
      ↓
Job QUEUED
      ↓
Worker claims
      ↓
Job RUNNING
      ↓
Run executes
      ↓
COMPLETE / FAILED
```

The worker claims a job with a conditional status transition so two workers cannot both claim the same queued row.

Stale worker recovery is handled by reclaiming old `RUNNING` locks before new work is claimed.

## 13. Monitoring

Each monitoring rule contains:

- application
- enabled state
- interval
- change types
- notification policy
- quiet hours
- last run
- next run

The worker enqueues due rules and advances `nextRunAt` to prevent continuous duplicate scheduling.

## 14. Notifications

Operational events map to in-app notifications:

```text
QUERY_RAISED
→ NEW_QUERY

DEADLINE_CHANGED
→ DEADLINE_CHANGED

VERIFICATION_FAILED
→ EVIDENCE_FAILED

APPROVAL_REQUESTED
→ APPROVAL_REQUESTED

SUBMISSION_VERIFIED
→ SUBMISSION_VERIFIED

SUBMISSION_UNVERIFIED
→ SUBMISSION_UNVERIFIED
```

The provider interface is intentionally generic so email, Slack and webhooks can be added without coupling them to the workflow engine.

## 15. Portal connector abstraction

The workflow engine does not know portal-specific selectors.

```ts
interface PortalConnector {
  getMetadata(): Promise<...>;
  checkHealth(): Promise<...>;
  authenticate(): Promise<...>;
  observe(): Promise<...>;
  readQuery(): Promise<...>;
  downloadEvidence(): Promise<...>;
  prepareSubmission(): Promise<...>;
  submit(): Promise<...>;
  verify(): Promise<...>;
}
```

The demo portal is one connector implementation.

The design supports future connectors without rewriting evidence, verification or approval.

## 16. Solari Browser

Live Browser responsibilities:

- session lifecycle
- navigation
- observation
- bounded form actions
- optional profile attachment
- recording/replay
- cleanup

The current implementation deliberately uses structured DOM attributes/selectors rather than trying to infer critical state from screenshots or arbitrary page prose.

## 17. Solari Sandbox

Live Sandbox responsibilities:

- isolated document processing
- file writes
- parser execution
- metrics where available
- optional checkpoint snapshot
- destruction after use

The sandbox is not the source of application state.

## 18. Desktop extension

Desktop is an optional execution adapter for legacy GUI portals. Its output still requires independent verification.

A screenshot is evidence of what the screen displayed, not proof that the underlying operation persisted.

## 19. Security architecture

Major controls:

- server-side secret handling
- redacted structured logs
- SSRF-resistant portal URL validation
- safe filenames
- server-side approval gate
- tenant-ready workspace fields
- role/permission model
- immutable audit records
- model schema validation
- untrusted-document/portal instruction handling

## 20. Scalability path

### Current demo

One workspace
One operator
One primary connector
PostgreSQL
Simple worker

### Next

Multiple authenticated users
Multiple workers
Multiple connectors
Object storage
External queue
Email/Slack/webhooks

### Enterprise

SSO
SCIM
strict tenant row-level policy
centralized secrets manager
policy engine
multi-step approvals
regional storage
retention policies
usage/billing

The domain interfaces are designed so these layers can be added without changing the core observe → verify → approve → confirm workflow.
