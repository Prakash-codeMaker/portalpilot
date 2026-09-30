# PortalPilot

**Verify what changed before you act.**

PortalPilot is a product-style operational control plane for approval and application workflows. It watches external application state, turns portal changes into structured work, traces claims to evidence, verifies critical facts deterministically, prepares a response, pauses for human approval, executes the approved action through a browser, and re-opens the external record to verify what actually happened.

> PortalPilot is not a replacement for an approval portal, a legal decision maker, or a fully autonomous compliance system. The demo is deliberately narrow so the end-to-end reliability guarantees are reproducible.

## Why this product exists

After an application is submitted, teams still spend time checking portals, interpreting clarification requests, searching document vaults, checking expiry and site/entity mismatches, and confirming that a submission really changed the external record.

PortalPilot is built around one operational loop:

```text
OBSERVE
   ↓
DETECT CHANGE
   ↓
UNDERSTAND QUERY
   ↓
FIND EVIDENCE
   ↓
VERIFY
   ↓
PREPARE
   ↓
HUMAN APPROVAL
   ↓
ACT
   ↓
RE-OBSERVE
   ↓
VERIFY OUTCOME
```

## What is implemented

### Product surfaces

- Overview dashboard
- Applications workspace
- Attention queue
- Application detail workspace
- Change diff / observation history
- Clarification and requirement view
- Versioned document vault
- Evidence explorer and inspector
- Runs / command center
- Approval center
- Notifications
- Monitoring rules
- Portal connector registry
- Activity feed
- Audit log
- Workspace / team settings
- Security posture
- Usage / health
- Demo Lab
- Reliability Lab
- Global command search
- Saved application views

### Backend primitives

- PostgreSQL + Drizzle schema
- persisted workflow runs
- durable job table and worker CLI
- monitoring rules with next-run scheduling
- optimistic approval invalidation through state hashing
- submission idempotency for already-verified runs
- server-side approval gate
- application/run event history
- notifications
- audit log
- portal connector model
- workspace/member/role data model
- versioned evidence documents
- content hashing
- typed application errors
- request IDs on API responses
- structured secret-scrubbed logging
- portal URL validation
- upload filename/path sanitization
- pagination and server-side filtering

### AI boundary

The model is intentionally narrow. It can:

- extract requirements
- interpret supplied evidence
- draft a clarification response
- summarize changes

It cannot:

- approve a submission
- override deterministic verification
- invent evidence
- invent portal state
- execute arbitrary shell commands
- issue arbitrary browser commands

Critical truth checks remain deterministic.

## Solari architecture

The application has a clean execution boundary:

```text
                       PORTALPILOT
                           │
                     Workflow Engine
                           │
             ┌─────────────┼─────────────┐
             ↓             ↓             ↓
          Browser       Sandbox        Desktop*
             │             │             │
             │         evidence/         │
             │          compute          │
             └─────────────┬─────────────┘
                           ↓
                     AI interpretation
                           ↓
                       Verifier
                           ↓
                    Human approval
                           ↓
                      Browser action
                           ↓
                     Postcondition
```

`*` Desktop is an extension point for legacy GUI workflows; the primary reproducible vertical slice is Browser + Sandbox.

Live mode is wired to the actual `@solarisdk/browser` and `@solarisdk/sandbox` packages used by the repository. Solari Browser sessions can be recorded and replayed; Solari Sandboxes are disposable compute environments used for isolated evidence processing.

## Demo

The deterministic scenario is:

```text
Application: MH-23881
Factory Expansion Approval
Apex Manufacturing · Pune Plant
```

Initial state:

```text
UNDER_REVIEW
Deadline: 15 Oct 2026
```

Then raise a clarification:

```text
CLARIFICATION_REQUIRED
Deadline: 10 Oct 2026
Query: Q-291
```

Required evidence:

```text
✓ Factory layout
✓ Pollution consent
✗ Fire safety certificate
```

The original fire certificate expires on `2026-08-30`, while the demo clock is `2026-09-29`. PortalPilot blocks the workflow.

Replace it with `fire-certificate-new.pdf`, re-run verification, reach `3/3 verified`, review the prepared response, approve, submit, reopen the portal and verify `SUBMITTED` plus `ACK-89218`.

The Demo Lab also supports a deliberate false-success test where the portal displays a success message while the real record remains `DRAFT`. PortalPilot must report `SUBMISSION_UNVERIFIED`.

## Setup

Requirements:

- Node.js 20+
- PostgreSQL
- npm

Install:

```bash
npm install
```

Create `.env` from `.env.example` and set:

```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
```

Apply the schema:

```bash
npm run seed
```

Start:

```bash
npm run dev
```

Open:

```text
http://localhost:3000/
```

## Demo mode

Demo mode is the default and does not require Solari credentials.

```bash
npm run demo
npm run dev
```

Open:

```text
/demo
```

The Demo Lab controls are intentionally deterministic so a reviewer can reproduce the failure → fix → approval → verified submission story.

## Live Solari mode

Set:

```env
SOLARI_API_KEY=...
PORTALPILOT_PORTAL_URL=https://your-reachable-portal.example
SOLARI_BASE_URL=https://api.getsolari.com
```

Then:

```bash
npm run live
```

Live mode:

- refuses to run without `SOLARI_API_KEY`
- requires a reachable portal URL
- launches the real Solari Browser adapter
- performs structured observation against the portal DOM
- launches the real Solari Sandbox for evidence processing
- records real resource IDs in the run manifest
- retrieves replay information when available
- destroys remote resources during cleanup

There is no silent fallback from LIVE to DEMO.

## Worker / scheduled monitoring

The application persists jobs in PostgreSQL so execution does not depend on an in-memory queue.

Run a worker iteration:

```bash
npm run worker
```

The worker:

1. enqueues due monitoring checks
2. claims queued jobs
3. executes the workflow
4. updates job state
5. records failures

For deployment, run the worker on a recurring schedule or as a continuously running process.

## Tests

```bash
npm test
npm run typecheck
npm run build
```

The repository includes tests for:

- ISO date comparison
- expiry
- identity/site matching
- hashing
- conflicts
- stale evidence
- change detection
- requirement extraction
- malformed model output
- evidence hallucination guard
- missing documents
- approval gating
- false-success postconditions
- wrong-site / wrong-entity validation

## Failure modes

| Scenario | Expected result |
| --- | --- |
| Happy path | Submission verified |
| Expired document | Block |
| Missing document | Block |
| Wrong entity | Failed |
| Wrong site | Failed |
| Conflicting evidence | Human review |
| Stale evidence | Re-verify |
| Malformed model output | Reject output |
| Portal unavailable | Safe stop / retry policy |
| Authentication required | Human handoff |
| False success banner | `SUBMISSION_UNVERIFIED` |
| Submit without approval | `403 APPROVAL_REQUIRED` |
| State changes after approval | Approval becomes stale |

## Security model

See [`SECURITY.md`](./SECURITY.md).

The important guarantees are:

- secrets remain in server environment variables
- credentials/cookies are never sent to the model
- portal content is treated as untrusted input
- uploaded filenames are sanitized
- remote portal URLs are checked for private-network targets
- model output is schema-validated
- approval is enforced server-side
- submission is verified after reopening the external record
- evidence carries document hashes and timestamps
- audit records preserve operational history

## Scaling model

PortalPilot is intentionally structured so the demo can grow into a real multi-tenant application:

```text
Users / Workspace
        ↓
Applications
        ↓
Monitoring Rules
        ↓
Persistent Jobs
        ↓
Disposable Workers
        ↓
Solari Browser / Sandbox / Desktop
        ↓
Evidence + Verifier
        ↓
Approval / Policy
        ↓
External Action
        ↓
Postcondition
```

The schema already contains workspace IDs, members, roles, portals, monitoring rules, jobs, audit logs, notifications and saved views. The current demo still uses a fixed demo workspace/operator because external authentication/SSO is intentionally outside the reproducible challenge slice.

## Current limitations

1. The reproducible demo uses structured text document fixtures named with `.pdf` extensions rather than shipping a large binary-document processing dependency.
2. The live browser flow requires an externally reachable portal URL and valid Solari credentials.
3. The current repository has a tenant-ready schema and permission model, but not a production identity provider or SSO integration.
4. The Demo Authority is controlled software and is not a government system.
5. Desktop, snapshot/fork, external email/Slack delivery and additional portal connectors are extension points rather than required parts of the primary demo.

## Project structure

```text
src/
├── agent/       bounded LLM extraction / analysis / drafting
├── browser/     Demo + live Solari Browser adapters
├── db/          Drizzle schema and repository
├── notifications/
├── policy/
├── portals/     connector contracts
├── sandbox/     Demo + live Solari Sandbox adapters
├── verifier/    deterministic truth boundary
├── workflow/    persisted orchestration / jobs
├── components/  reusable product UI
└── app/         Next.js routes and APIs
```

## Design principle

PortalPilot follows one rule throughout the stack:

> **Interpret with AI. Decide with evidence. Act with approval. Verify the result.**
