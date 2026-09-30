# PortalPilot Frontend Refresh

The previous UI was overly template-like and exposed a synthetic fleet of unrelated demo records in the main Applications screen.

This refresh makes the product feel like a real operational SaaS workspace:

- rebuilt application shell with a slim navigation rail and quieter secondary navigation
- stronger typography using the native Segoe UI Variable / SF Pro-style stack
- fewer decorative cards and stronger information hierarchy
- compact enterprise-grade tables and filters
- explicit Demo environment treatment
- main Applications view keeps only the primary reproducible demo case plus real connected records
- legacy synthetic demo fleet removed from fresh demo resets
- application creation no longer silently defaults to the demo authority
- document creation no longer ships with customer-specific placeholder values
- operator identity is read from workspace settings rather than hardcoded into the UI/API action routes
- Dashboard and Applications pages emphasize attention, change, evidence and next action
- reusable visual primitives were updated globally

The Demo Lab remains the place for deterministic failure injection and guided demonstrations.
