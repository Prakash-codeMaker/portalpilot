# PortalPilot — Implementation Journal

## Repository status

PortalPilot was implemented inside the existing uploaded project rather than as a separate application.

Primary location:

```text
src/
```

The project remains a single Next.js App Router application with PostgreSQL/Drizzle.

## Major implemented layers

### Product

- Overview
- Applications
- Attention
- Approvals
- Evidence
- Runs
- Activity
- Notifications
- Documents
- Portals
- Monitoring
- Integrations
- Settings
- Demo Lab
- Reliability Lab
- Audit log
- Architecture overview

### Workflow

- persisted runs
- phase transitions
- observation diffing
- clarification extraction
- document processing
- deterministic verification
- evidence persistence
- response preparation
- approval gate
- submission
- postcondition verification
- cleanup

### Operational data

Added PostgreSQL/Drizzle tables for:

- workspaces
- users
- workspace members
- portals
- monitoring rules
- jobs
- notifications
- audit logs
- saved views

Major records also carry `workspaceId` so the schema can evolve into strict tenant isolation.

## Solari Browser

The live adapter is in:

```text
src/browser/index.ts
```

It uses the current installed/public Solari Browser package surface as resolved by the repository configuration.

The live observation path uses structured DOM selectors/attributes for:

- status
- deadline
- query ID
- query text
- acknowledgement
- success state
- last message

The live submit path uses explicit selectors and does not swallow interaction errors.

Recording is enabled for live launches where supported.

Replay information is requested after browser release when available.

## Solari Sandbox

The live adapter is in:

```text
src/sandbox/index.ts
```

The sandbox:

- writes relevant evidence files
- runs an isolated parser
- calculates SHA-256
- returns structured parsed documents
- collects metrics where supported
- takes a lightweight verification checkpoint when supported
- destroys the remote VM during cleanup

## Important SDK discipline

The project does not intentionally invent Solari APIs.

Live integration should still be validated by running `npm install` and `npm run live` against the exact dependency versions resolved in the user's environment.

## Jobs

The worker entrypoint is:

```text
scripts/worker.ts
```

It:

1. enqueues due monitoring checks
2. claims queued jobs
3. executes runs
4. persists job completion/failure

The current worker is a single iteration CLI. A production deployment can run it continuously or schedule it.

## Live CLI

```text
scripts/live.ts
```

Required configuration:

```env
SOLARI_API_KEY=
PORTALPILOT_PORTAL_URL=
```

The CLI switches the workspace into LIVE mode for the selected observation run and prints:

- run ID
- mode
- phase
- result
- browser session ID
- sandbox ID
- snapshot ID
- replay availability
- cleanup status

It does not fake live execution when credentials are absent.

## Security helpers

`src/lib/core.ts` includes:

- secret scrubbing
- safe filename handling
- private-host/SSRF checks
- explicit live mode checks
- typed error codes
- retry classification
- SHA-256 hashing

`src/lib/api.ts` adds request IDs and consistent error responses.

## Current challenge demo

Primary demo:

```text
MH-23881
Factory Expansion Approval
Apex Manufacturing
Pune Plant
```

False-success scenario:

```text
portal message = success
actual state = DRAFT
```

Expected:

```text
SUBMISSION_UNVERIFIED
```

## Validation performed in this working environment

The source tree was statically parsed with the TypeScript parser for all `.ts` and `.tsx` files and no parser diagnostics were found.

Dependency installation could not be completed within the execution environment's network/runtime window, so a fresh `npm install`, full `tsc`, Next.js build and database-backed integration run could not be re-executed here after the final modifications.

Therefore this file intentionally does **not** claim a fresh green build in this environment.

The repository should be validated in the user's environment with:

```bash
npm install
npm run seed
npm run typecheck
npm test
npm run build
npm run dev
```

Then, with Solari credentials:

```bash
npm run live
```

## Known limitations

- challenge demo documents are structured text fixtures named as PDFs
- production binary PDF/document storage is not implemented
- production authentication/SSO is not implemented
- tenant fields and permissions exist, but production identity enforcement is still required
- Desktop is an extension point rather than the primary demo path
- live portal behavior depends on the reachable portal and credentials
