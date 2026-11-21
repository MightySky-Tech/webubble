# Third-party licence register

Client rule: vetted libraries and SDKs are allowed, but each one's licence is recorded
here. Add a row in the same PR that adds a dependency. Transitive dependencies are covered
by the lockfiles (`pnpm-lock.yaml`, `apps/api/composer.lock`, `apps/mobile/pubspec.lock`).

| Component | Used by | Licence | Notes |
|---|---|---|---|
| Next.js | web, admin | MIT | |
| React, React DOM | web, admin | MIT | |
| TypeScript | web, admin | Apache-2.0 | dev only |
| openapi-typescript | api-client | MIT | dev only; generates TypeScript contract types |
| ESLint, eslint-config-next | web, admin | MIT | dev only |
| Vitest, @vitejs/plugin-react | web, admin, ui | MIT | dev only |
| Testing Library (react, dom) | web, admin, ui | MIT | dev only |
| @testing-library/user-event | ui | MIT | dev only |
| axe-core | ui | MPL-2.0 | dev only; automated accessibility checks |
| @eslint/eslintrc | ui | MIT | dev only |
| @types/react, @types/react-dom | ui | MIT | dev only |
| jsdom | web, admin, ui | MIT | dev only |
| Laravel framework and skeleton | api | MIT | |
| Laravel Sanctum | api | MIT | API bearer tokens |
| pragmarx/google2fa | api | MIT | Admin authenticator-based TOTP MFA |
| Laravel Pint | api | MIT | dev only |
| PHPUnit | api | BSD-3-Clause | dev only |
| FrankenPHP | api runtime image | MIT | |
| Flutter SDK | mobile | BSD-3-Clause | |
| cupertino_icons | mobile | MIT | |
| flutter_lints | mobile | BSD-3-Clause | dev only |
| PostgreSQL | data | PostgreSQL Licence | run as a service |
| PostGIS | data | GPL-2.0-or-later | Run as a separate database service and not linked into our code, so it places no obligations on Webubble's source. |
| Redis 7.4 | cache, queues | RSALv2 / SSPLv1 | Fine for use as Webubble's internal cache. It only restricts reselling Redis as a service. Valkey (BSD-3) is a drop-in alternative if the client prefers an OSI licence. |
| Mailpit | local dev only | MIT | not deployed |
