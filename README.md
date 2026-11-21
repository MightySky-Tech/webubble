# Webubble

Local-commerce platform for buyers, registered (CAC) sellers, informal sellers and street
vendors. Android, iOS and web share one API and one data model.

| App | Path | Stack |
|---|---|---|
| Website (buyer, seller, vendor) | `apps/web` | Next.js, TypeScript |
| Admin portal | `apps/admin` | Next.js, TypeScript |
| API | `apps/api` | Laravel 12, PHP 8.4, `/api/v1` |
| Mobile | `apps/mobile` | Flutter (Android and iOS) |

Architecture decisions are in [docs/adr](docs/adr). The third-party licence register is
[docs/LICENCES.md](docs/LICENCES.md).

## Prerequisites

- Node 24 and pnpm 11 (`corepack enable`)
- Docker with Compose
- Flutter stable, for mobile work. Without it, use the `ghcr.io/cirruslabs/flutter:stable` image.

PHP, Composer, Postgres and Redis run in Docker. They do not need to be installed locally.

## First run

```sh
pnpm install
cp apps/api/.env.example apps/api/.env
docker compose up -d                      # postgres+postgis, redis, mailpit, api
docker compose exec api php artisan key:generate
docker compose exec api php artisan migrate
curl http://localhost:8100/api/v1/health  # {"status":"ok",...}

pnpm dev:web     # http://localhost:3000
pnpm dev:admin   # http://localhost:3001
```

The Postgres init scripts create an isolated `webubble_test_wb` database for API tests
when the volume is first initialized. For an existing volume, create it once with
`docker compose exec postgres createdb -U webubble -O webubble webubble_test_wb` and
enable PostGIS and citext with
`docker compose exec postgres psql -U webubble -d webubble_test_wb -c "CREATE EXTENSION IF NOT EXISTS postgis; CREATE EXTENSION IF NOT EXISTS citext;"`.

Default host ports: API 8100, Postgres 5432, Redis 6380, Mailpit UI 8025. If one clashes
with another local project, override it with `WB_API_PORT`, `WB_PG_PORT`, `WB_REDIS_PORT`,
`WB_MAIL_UI_PORT` or `WB_SMTP_PORT`.

Mobile:

```sh
cd apps/mobile
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8100/api/v1   # Android emulator
```

## Checks (the same ones CI runs)

```sh
pnpm lint && pnpm typecheck && pnpm test && pnpm build
docker compose exec api vendor/bin/pint --test
docker compose exec -e DB_CONNECTION=pgsql -e DB_DATABASE=webubble_test_wb -e DB_URL= api php artisan test
cd apps/mobile && flutter analyze && flutter test
```

## Shared design system

`packages/ui/tokens/tokens.json` is the source of truth for web, admin and Flutter
tokens. After changing it, run `pnpm --filter @webubble/ui tokens`; CI checks generated
outputs with `pnpm --filter @webubble/ui tokens:check`. React components are exported
from `@webubble/ui`. Token values are provisional until Gate A screen and brand approval.

## Buyer authentication (WB-003, WB-006)

The web MVP uses email one-time codes. In local development, open Mailpit at
`http://localhost:8025` to read verification emails. Codes expire after 10 minutes,
allow five attempts, and are rate-limited. Verified users receive the buyer role and a
30-day API token; the web app keeps it in an HttpOnly cookie and proxies authenticated
requests to Laravel. Phone verification is deferred until Webubble selects an SMS
provider. Production email delivery requires an approved SMTP service.

## Seller onboarding (WB-007..009)

Buyers can apply as a CAC-registered business or an informal seller from their account.
Business applications require CAC details and a PDF/JPG/PNG evidence file, stored on
Laravel's private local disk; informal applications require a contact phone and do not
collect CAC, ID documents, or payout credentials. For an informal seller, an administrator
records a separate manual identity-check status; approval is blocked until that status is
explicitly approved, and the decision is audited without storing identity documents.
Seller/vendor roles are granted only on approval; every account retains its buyer role.
CAC verification is shown only for approved registered businesses. Payout verification
remains unstarted until Webubble selects a licensed payment provider.

The admin portal has its own email-OTP sign-in at `http://localhost:3001/sign-in`.
Administrators must also enroll in or verify an authenticator app (TOTP). Email login
creates a short-lived, limited token; review and private CAC evidence access require a
separate MFA-confirmed token. TOTP secrets are encrypted at rest and codes cannot be
replayed within a time step. Only users already assigned the admin role can view
applications or download private CAC evidence. Review decisions are audited; rejection
and information requests require a reviewer note.

## Seller product listings (WB-011; SELL-UI-03, BUY-UI-02)

Approved sellers and vendors can create and edit product drafts at
`http://localhost:3000/seller/products`. Listings support an approved product category,
name, description, NGN price, text attributes and up to five JPG/PNG/WebP photos (5 MB
each). Photos are stored on Laravel's private local disk; a seller can see their own
draft photos, while administrators can review pending photos after MFA. Before photos
are used on staging, configure persistent private storage for the API deployment.

Sellers submit drafts for moderation. An MFA-verified administrator reviews listings at
`http://localhost:3001/products` and can approve, request changes or reject with a note.
New categories are inactive until approved in the same admin screen. Only listings from
approved sellers in active categories appear in the live browse page at
`http://localhost:3000/products`; the fictional concept catalogue remains separate.
The storefront header has a global search field on home, browse, product detail and
account pages. Submitting a search opens the live catalogue with the query preserved;
results match product, category and seller names. The browse page also supports category
and availability filters, minimum/maximum price, price sorting and pagination. See the
WB-012 section below for variant and inventory behavior. Cart, reservations and checkout
are not part of this listing slice.

For local storefront testing, seed a fictional approved seller and three listings with:

```sh
docker compose exec api php artisan db:seed --class=LocalDemoMarketplaceSeeder
```

This seeder refuses to run outside `APP_ENV=local`. Its seller identity and approval are
simulated, and every listing is labeled **DEMO ONLY - NOT FOR SALE**; it creates no real
seller, verification claim or purchasable offer. It is idempotent and can be run again
to restore the sample prices and stock.

## Product variants and inventory (WB-012; SELL-UI-03, SELL-UI-05, BUY-UI-04)

Each listing has one or more seller-defined options (for example, size or package weight)
and optional SKUs. All options share the product price; stock and a configurable low-stock
threshold are tracked independently for each option. New options start at zero stock, and
products without custom options use a `Standard` option. Sellers can update stock without
unpublishing an approved listing; inventory changes are locked atomically, guarded against
stale edits, and recorded with the actor, reason, previous count and new count. The seller
portal shows the latest 50 changes. Setting a threshold to zero disables its low-stock
indicator.

Buyers can view option names and availability on the product detail page. Exact stock
counts and SKUs remain private to the seller and admin. No cart, stock reservation,
payment or checkout is included here; those behaviors belong to WB-015.

## Catalogue concept review

The storefront starts with 48 example catalogue cards across six proposed shopping
categories as a first-pass design for Webubble's owner to review. Prices (stored as
integer kobo), stock counts, seller names and seller blurbs are fictional demo data:
they are not real offers, real businesses or verified seller claims. The cards are
preview-only and cannot be purchased. After signing in to the MFA-protected admin portal,
use **Review catalogue concepts** or open `http://localhost:3001/catalogue` to search,
filter, add, edit, reorder or remove ideas; category names can also be changed or added.
The same editor manages each card's sample price, stock and fictional seller details.
Changes are saved in the shared API database and appear on the storefront at
`http://localhost:3000/#catalogue`. The display category list is a proposal, not an
approved taxonomy. Configure `NEXT_PUBLIC_WEB_URL` in the admin app when the storefront
is hosted somewhere other than `http://localhost:3000`.

The OpenAPI contract is `apps/api/openapi/openapi.yaml`; generate shared TypeScript
types with `pnpm --filter @webubble/api-client generate`. Set `WEBUBBLE_API_URL` to the
API origin for the web server (defaults to `http://localhost:8100` for local development).

## Installable mobile web app

The storefront is responsive and installable as a PWA from a supported mobile browser.
Use HTTPS in staging/production (localhost is allowed for local testing), then choose
**Install** in a supported browser or **Share → Add to Home Screen** in iOS Safari. The
service worker only provides a static offline notice; it does not cache account pages,
API responses, forms, or checkout information. The admin portal is responsive but is
not configured as an installable app.

## Contributing

- Branch from `main` as `wb-xxx-short-name`. Open a PR that names the WB-xxx task and any
  screen IDs. CI and one code-owner review are required to merge.
- Custom code only. No purchased themes, UI kits, marketplace clones or no-code tools.
  Record every new library in `docs/LICENCES.md`.
- Never commit secrets or real customer data.
