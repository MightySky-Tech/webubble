# ADR-001: Repository layout and stack

- Status: Accepted (internal). To be confirmed at Gate B.
- Date: 2026-11-05
- Task: WB-001

## Context

Webubble needs Android, iOS, a fully transactional website and an admin portal, all on
one backend and one data model (client rule). The handoff fixes the languages: TypeScript,
Dart, PHP and SQL. All code must be custom and live in Webubble-controlled GitHub with
branch protection and PR review.

## Decision

One monorepo in the Webubble GitHub organisation:

```
apps/web        Next.js (App Router, TypeScript): buyer, seller and vendor site
apps/admin      Next.js admin portal, deployed separately (least privilege, MFA)
apps/api        Laravel 12 on PHP 8.4, API only, versioned under /api/v1
apps/mobile     Flutter: one codebase, separate Android and iOS builds
packages/       shared TypeScript: api-client (generated from OpenAPI, WB-003), ui (WB-002)
infra/          Dockerfiles and database init scripts
docs/           client docs, proposal, ADRs, ERD, threat model
docker-compose.yml   local Postgres+PostGIS, Redis, Mailpit and the API
```

| Concern | Choice |
|---|---|
| JS package manager | pnpm workspaces (`apps/web`, `apps/admin`, `packages/*`) |
| API runtime | FrankenPHP container. Dev mounts the source; prod is an immutable image. |
| Database | PostgreSQL 17 with PostGIS 3.5 (location search, vendors, delivery). Tests run on PostGIS too, not SQLite. |
| Cache and queues | Redis 7.4 |
| Web tests | Vitest and Testing Library |
| API tests | PHPUnit feature tests against Postgres, plus Pint for style |
| Mobile tests | `flutter analyze` and widget tests |
| Next.js deploy unit | `output: "standalone"` container image (`infra/docker/next.Dockerfile`) |

Laravel's bundled Vite/Tailwind frontend was removed. The API serves JSON only.

## Why one monorepo rather than one repo per app

- The OpenAPI contract, generated client and all three clients change together. One PR
  can carry a contract change and every consumer, and the client's "PR per WB task" rule
  maps to one PR rather than three to five linked ones.
- One set of branch protection rules, CODEOWNERS and CI to maintain.
- Path-filtered CI keeps the cost close to separate repos (see ADR-002).

## Consequences

- The admin portal is a separate app and deployment, so it can sit behind its own
  network rules and MFA.
- Flutter is not installed on dev machines yet. CI builds it, and locally it runs through
  the `ghcr.io/cirruslabs/flutter` image until Flutter is installed.
- Every new third-party library must be added to `docs/LICENCES.md` in the same PR.
