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
docker compose exec api php artisan test
cd apps/mobile && flutter analyze && flutter test
```

## Contributing

- Branch from `main` as `wb-xxx-short-name`. Open a PR that names the WB-xxx task and any
  screen IDs. CI and one code-owner review are required to merge.
- Custom code only. No purchased themes, UI kits, marketplace clones or no-code tools.
  Record every new library in `docs/LICENCES.md`.
- Never commit secrets or real customer data.
