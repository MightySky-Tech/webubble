# ADR-002: CI/CD, branch protection and staging

- Status: Proposed. Two decisions are open (below).
- Date: 2026-11-05
- Task: WB-001

## Decision

**Branch model.** `main` is the only long-lived branch. Work happens on short branches
named `wb-xxx-short-name` and merges by PR only.

**Branch protection on `main`** (`scripts/github/protect-main.sh`):
- PR required, with 1 approving review, CODEOWNERS review, stale approvals dismissed,
  and approval of the last push
- required checks: `ci-ok` (CI) and `references-task` (PR rules)
- branch up to date before merge, linear history, conversations resolved
- no force pushes or deletion, and admins are included

**CI** (`.github/workflows/ci.yml`) runs on every PR and every push to `main`:

| Job | Runs when | Does |
|---|---|---|
| web | web, admin or packages change | install, lint, typecheck, test, build both Next.js apps |
| api | apps/api changes | Pint, PHPUnit on PostGIS and Redis services |
| api-image | apps/api changes | builds the production API image |
| mobile-android | apps/mobile changes | analyze, widget tests, Android build |
| mobile-ios | apps/mobile changes | unsigned iOS build on macOS |
| ci-ok | always | fails if any job above failed. This is the single required check. |

On pushes to `main`, every job runs regardless of paths, except iOS (macOS minutes are
expensive) which runs only when mobile code changed or on manual dispatch.

**PR rules** (`.github/workflows/pr-rules.yml`) fail a PR whose title and description
have no `WB-xxx` reference. The PR template asks for screen IDs.

**Staging** (`.github/workflows/deploy-staging.yml`). After CI passes on `main`, the API,
web and admin images are built and pushed to GHCR with the commit SHA and a `staging`
tag. Because protection allows commits onto `main` only through a reviewed PR, staging
only ever runs approved commits. The deploy job uses the GitHub `staging` environment
and is off until `STAGING_DEPLOY_ENABLED=true`.

## Open decisions

1. **Webubble GitHub organisation.** The founder creates it (or names an existing one) and
   invites MightySky Tech. The repo is created there, not under a MightySky or personal
   account. Then: replace the team names in `.github/CODEOWNERS` and run the protection
   script.
2. **Staging host.** It needs Postgres with PostGIS, Redis, three containers and object
   storage. The two realistic options are:
   - one VPS running Docker Compose plus nightly `pg_dump` to object storage
     (lowest cost, more operations work for us);
   - a managed container platform plus managed Postgres (higher monthly cost, less work).

   Monthly hosting cost should be passed through to Webubble, not absorbed into the fixed
   price. Data-protection (NDPA) needs, such as where production data may live, should be
   confirmed with the founder before production is chosen. Staging uses synthetic data only.

## Consequences

- Until both decisions are made, WB-001's acceptance proof ("a clean checkout builds all
  applications and deploys staging from approved commits") is met up to the image push,
  but not the deploy itself.
- Signed release builds (Play Store keystore, Apple certificates) come later and go in
  GitHub environment secrets owned by Webubble.
