# Auth page styling

Applies to `/sign-in`, `/sign-up` and `/verify-email` (WB-006, AUTH-UI-01..03).

## Design

- `.wb-auth-page` is a full-viewport gradient with the content centred on it.
- `.wb-auth-card` holds the form. It uses the `@webubble/ui` theme tokens (`--wb-color-bg`, `--wb-color-text`), so it follows both the light and dark token sets.
- `AuthBrand` (`apps/web/src/app/AuthBrand.tsx`) shows the Webubble logo and wordmark as the first element of the card and links to `/`. To show it on another auth-style page, render `<AuthBrand />` as the first child of the card.

## Maintainer notes

- The global `main` rule in `globals.css` sets a 40rem column. `.wb-auth-page` resets `max-width` and `margin`, otherwise the gradient shrinks to a centred strip on desktop.
- `.wb-auth-page` is shared with `/seller/onboarding`. Text placed directly on the gradient (for example its loading message) is white; anything inside the card uses the theme text colour.
- `.wb-auth-form .wb-field__label` is `display: block` so the required `*` stays on the same line as the label text. The generic `.wb-auth-form label` rule uses `display: grid`, which would stack them.

## Checked

- Embedded Chromium at 1280x800, 390x844 and 360x520: gradient covers the viewport, no horizontal overflow.
- Light tokens and `data-theme="dark"` tokens.
- Unit tests: `apps/web/src/app/AuthBrand.test.tsx` (logo link, and presence on all three pages).

Not yet checked: Safari, Firefox, real devices, and a measured contrast audit.
