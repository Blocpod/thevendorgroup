# VendorGroupOS

VendorGroupOS is a local, testable operating-system alpha for VendorGroup's public-company website lifecycle. It includes simulated authentication, multi-client portfolio records, project lifecycle gates, action-level permissions, evidence-bearing approvals, launch/deployment records, structured request classification, simulated integration adapters, a browser-local append-only audit trail, and deterministic AI operations briefs generated from current app data.

## Run Locally

```bash
npm install
npm run dev
```

Demo credentials:

- Administrator: `admin@vendorgroup.example` / `demo-admin`
- Executive: `executive@vendorgroup.example` / `demo-exec`
- Operations Manager: `ops@vendorgroup.example` / `demo-ops`
- Creative Lead: `creative@vendorgroup.example` / `demo-creative`
- Technical Lead: `tech@vendorgroup.example` / `demo-tech`
- Client Approver: `approver@meridian.example` / `demo-client`
- Client Contributor: `contributor@meridian.example` / `demo-contributor`
- Viewer: `viewer@vendorgroup.example` / `demo-viewer`

## Verification

```bash
npm run lint
npm test
npm run build
npm run test:e2e
```

Seeded fictional clients:

- Meridian Applied Robotics, Inc. `NASDAQ: MARX`
- Northstar Critical Minerals `NYSE: NCMI`
- Helix Therapeutics `NASDAQ: HLXT`
- Atlas Autonomous Systems `NYSE: ATLS`
- Granite BioSystems `NASDAQ: GBIO`

## Architecture

- `src/app` contains the route-aware React shell and screens.
- `src/domain` contains the state machine, gate evaluation, permissions, audit helpers, and request-classification rules.
- `src/data/seed.ts` creates the realistic simulated client environment.
- `src/repositories` validates and persists browser-local application state.
- `src/adapters` contains simulated integration adapters and integration-run records.
- `src/features/ai` contains the AI provider interface and deterministic mock provider.
- `src/test` covers lifecycle, classification, integration-style UI flow, and mobile overflow checks.

## Current Limitations

- Persistence uses validated `localStorage`, not SQLite or Prisma.
- AI is deterministic and local by design; outputs require human review.
- Integrations are simulated adapter records and never touch production systems.
- Accessibility checks include semantic/focus implementation and Playwright smoke coverage; a human WCAG review is still recommended before production.
- The visual system is tokenized in CSS but not yet extracted into a package.
- The audit trail is browser-local and honestly labeled simulated append-only, not server-immutable.
