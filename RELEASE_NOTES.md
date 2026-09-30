# PortalPilot production build — release notes

## Implemented

- Premium SaaS shell with responsive navigation, search, notifications and workspace context
- Application dashboard, attention queue, applications table, filters and saved view model
- Application detail, change diff, requirements, evidence inspector and run timeline
- Documents, versioning metadata, hashing, replacement workflow and evidence provenance
- Human approval gate with state hash, expiry and server-side enforcement
- Idempotent submission path with pre-submit re-observation
- Postcondition verification and explicit false-success detection
- Solari Browser live adapter with recording/profile support and replay capture
- Solari Sandbox live adapter with document processing, metrics and cleanup
- Persistent jobs/monitoring rules, queue/worker path and stale-job recovery
- Workspace/team/member/RBAC-ready data model
- Portal connector registry and health metadata
- Notifications, audit log, saved views and activity surfaces
- Reliability lab and failure-mode tests
- Security controls for URL validation, upload hardening, prompt-injection boundaries and secret redaction
- Live/demo mode separation and a real live CLI entrypoint
- README, DESIGN, SECURITY and IMPLEMENTATION documentation

## Verification performed in this environment

- Static TypeScript/JS/TSX parsing: 85 source files, 0 syntax diagnostics
- Local import/export resolution check: 0 unresolved local imports/exports
- `npm install`: attempted but timed out in the execution environment before dependencies became available
- Because dependencies could not be installed here, a fresh `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, and real live Solari run were not claimed as executed in this environment.

Run the following after extracting the ZIP in a normal Node 20+ environment:

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
npm run dev
npm run live
```


## Premium product pass

- Rebuilt the product shell and primary operations screens for a denser, quieter B2B SaaS experience.
- Default application views no longer display the legacy fleet of synthetic demo applications; the main workspace retains only the primary reproducible demo case while real connected applications are shown as live records.
- Added explicit Demo labeling and a Demo Lab boundary.
- Application creation no longer silently defaults to the demo authority.
- Document creation forms no longer ship with customer-specific placeholder values.
