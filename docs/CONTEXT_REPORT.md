# VendorGroupOS Context Report

The supplied workspace did not contain a prior VendorOS master package. The attached brief was treated as the source of truth and preserved as product direction.

## Existing Package Inventory

- The repository contains a Vite, React, and TypeScript VendorOS Functional Alpha.
- The master zip package is planning/prototype source material, not a production codebase.
- The implementation now separates app, domain, adapters, repositories, and AI provider modules.

## Brand Reference

VendorGroup's live site presents a compliance-focused public-company service brand: restrained navigation, editorial typography, strong whitespace, white and near-black contrast, precise language, and emphasis on IR websites, newswire, managed hosting, SEC feeds, and confidence-building execution.

## Approved Decisions Carried Forward

- Private AI-native operating system for VendorGroup.
- Local simulated auth and role selection.
- Real state machine for the lifecycle.
- Mock integrations only; no production systems touched.
- Fictional public-company client: Meridian Applied Robotics, Inc. `NASDAQ: MARX`.
- Mock AI provider outputs are labeled and source-backed.

## Known Assumptions

- Local browser storage is the persistence adapter for this demonstration and is validated with Zod at load/save boundaries.
- Vite/React/TypeScript was selected because no existing stack was found and it keeps the demo runnable.
- External model, CMS, CRM, billing, hosting, and DNS integrations are isolated as mock records.

## Implementation Plan Executed

- Preserve the v0.1 lifecycle foundation while replacing single-client assumptions.
- Add simulated authentication, sessions, route guards, and action-level permissions.
- Add five seeded fictional clients, concurrent projects, evidence-bearing approvals, launch readiness, deployments, QA runs, integration runs, customer-success records, governance records, and structured AI records.
- Replace stale AI behavior with a deterministic provider that regenerates from current state after mutations.
- Expand unit and E2E tests for permissions, gate blocking, structured classification, and mobile overflow.
