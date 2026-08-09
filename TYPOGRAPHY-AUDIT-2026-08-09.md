# Typography audit — ISOUA `ISOA/main` (theme 163261120741) — 2026-08-09

Analysis-only. No files edited. Scope: PDP + spotwear-PDP + collection + homepage + all `/page.*` templates + header/footer.

**Headline finding.** Horizon already exposes per-level heading-size controls in `config/settings_schema.json:439-1357` (`type_size_h1..h6`, values `10..184`px). The store has already dialled these down in `config/settings_data.json:20-43` to **h1 22 / h2 18 / h3 16 / h4 15 / h5 13 / h6 13** — the "small heading" scale is basically in place at the global level. What breaks the story is that ~30 sections shipped by "SS - " vendors (and our own `rhode-*`) don't consume the global tokens at all: they hardcode `font-size: {{ block.settings.heading_size }}px` from schema ranges whose defaults are **28-72px**, and each section stores its own current value in the section JSON. Every visual "big heading" on the store is one of these overrides.

## 1 — Global heading system

Engine: `snippets/theme-styles-variables.liquid:242-352` builds `--font-h1--size … --font-h6--size` from the schema settings. Sizes **>= 48px** become `clamp(min, Xvw, max)` (fluid); **< 48** are fixed `rem`. Applied via `snippets/typography-style.liquid` on any element carrying `type_preset` classes (h1..h6, rte, paragraph).

Current computed sizes (`settings_data.json:20-43`; all < 48 so no fluid scaling → same at desktop and mobile):

| Level | size | line-height | letter-spacing | text-case | font-var | weight |
|---|---|---|---|---|---|---|
| h1 | 22px | display-normal 1.1 | heading-normal 0 | none | `heading` (Inter, style forced normal in `isoua-button-overrides.css:245-257`) | inherited |
| h2 | 18px | display-tight 1.0 | heading-normal | none | heading | inherited |
| h3 | 16px | display-normal 1.1 | heading-normal | none | heading | inherited |
| h4 | 15px | display-tight 1.0 | — | — | subheading | inherited |
| h5 | 13px | display-loose 1.2 | — | — | subheading | inherited |
| h6 | 13px | display-loose 1.2 | — | — | subheading | inherited |

Paragraph: `type_size_paragraph: 14`, `body-loose 1.6` (`settings_data.json:18-19`). Body font: `inter_n4`; subheading `inter_n5`; heading `inter_i8` (italic 800, but italic is disabled at the CSS-var layer by `isoua-button-overrides.css:245-257`). Colors: `--color-foreground-heading` per scheme (`settings_data.json` foreground_heading = `#67645e` in the beige/grey scheme used by most sections).

Loaded on every page: `snippets/stylesheets.liquid:1-4` (base.css, main.css, isoua-button-overrides.css). Template-scoped: `layout/theme.liquid:44-66` adds `rhode-pdp.css` on `product.rhode-product-page` + `product.spotwear-pdp`; `rhode-collection-cards.css` + `isoua-collection-mobile.css` on any `template contains 'collection'`. No `rhode-*.css` size overrides target the global h1..h6 selectors — they all use their own custom classes.

## 2 — Per-section overrides table

Every row below **bypasses** the global h1..h6 tokens. "src" = where the override actually renders. All sections read a `range` schema setting and interpolate it into `font-size: {{ … }}px` inside an inline `<style>` block.

| Section file | Templates | Element | Src line | Schema id : default | Current value (desktop / mobile) | Verdict |
|---|---|---|---|---|---|---|
| `sections/ss-header-1.liquid` | header-group | `.header-name` (h1 wrap) | 854 / 385 | `name_size: 30` | 28 / 18 (`header-group.json:182-183`) | close to global |
| `sections/ss-header-1.liquid` | header-group | nav links | 816 / 282 | `link_size: 16` | 14 / 12 | matches global |
| `sections/ss-hero-1.liquid` | index (homepage hero pair) | `.hero-title` (h1) | 343 / 218 | `title_size: 72` | live (`title_size` per instance, see `index.json`) | **much bigger than global** |
| `sections/ss-hero-1.liquid` | index | subtitle (h2/p) | 353 / 231 | `subtitle_size: 16` | template-specific | matches global |
| `sections/ss-slider-5.liquid` | index, PDP, spotwear-PDP | swiper heading (h2) | 313 / 140 | `heading_size: 14` | 14 / 14 | matches global |
| `sections/ss-image-split-row.liquid` | PDP | feature heading (h2) | 235 / 107 | `heading_size: 52` | ~36-52 (defaults) | **much bigger than global** |
| `sections/ss-image-with-text.liquid` | index (2x), PDP, our-story, impact, sustainability | block heading (h2/h3) | 544 / 528 | `heading_size: 32` | 28-36 / 22-28 | bigger than global |
| `sections/ss-image-with-text-14.liquid` | impact | block heading | 327 / 313 | `heading_size: 36` | 32 / 22 (`page.impact.json:343-344`) | bigger than global |
| `sections/ss-image-with-text-15.liquid` | index, PDP, our-story, impact | pill heading (h2) | 268 / 177 | `heading_size: 36` | 30-36 / 12-28 | bigger than global |
| `sections/ss-image-with-text-15.liquid` | ↑ | toggle text | 286 / 212 | `toggle_text_size: 26` | 26 / 20 | bigger than global |
| `sections/ss-featured-collection-13.liquid` | index, PDP | tile tag | 544 / 223 | `tag_size: 40` | 40 / — | **much bigger than global** |
| `sections/ss-featured-collection-13.liquid` | ↑ | title (h3) | 566 / 320 | `title_size: 18` | 16 / 12 | matches global |
| `sections/ss-featured-collection-6.liquid` | our-story, sustainability | section heading | 459 / 238 | `heading_size: 40` | — | **much bigger than global** |
| `sections/ss-featured-collection-6.liquid` | ↑ | tile title | 463 / 260 | `title_size: 18` | 16 / 12 | matches global |
| `sections/ss-featured-collection-6-new.liquid` | index | section heading | 459 / 238 | `heading_size: 40` | 32 / 22 | bigger than global |
| `sections/ss-featured-products-4.liquid` | PDP | step title | 571 / 258 | `title_size: 40+` | 34 / 22 (`product.rhode-product-page.json:986-987`) | bigger than global |
| `sections/ss-featured-products-4.liquid` | ↑ | mobile-track step title | (rhode-pdp.css:976) | hardcoded | `clamp(1.375rem, 5.6vw, 1.75rem)` → 22-28 | bigger than global |
| `sections/ss-targetting-animation.liquid` | PDP | display text | 253 / 363 | `text_size_desktop: 76` | 68 / 40 (`product.rhode-product-page.json:871-872`) | **much bigger than global** |
| `sections/ss-targetting-animation.liquid` | ↑ | eyebrow (top_heading) | 208 / 340 | `top_heading_size_desktop: 16` | 20 / 16 | matches global |
| `sections/ss-packaging.liquid` | PDP | heading (h2) | 401 / 488 | `heading_size: 64` | schema default; JSON not set here | **much bigger than global** |
| `sections/ss-whats-inside.liquid` | PDP | side title | 198 / 122 | `side_title_size: 28` | 32 / 16 (`product.rhode-product-page.json:1762-1763`) | bigger than global |
| `sections/ss-whats-inside.liquid` | ↑ | heading (h3) | 211 / 162 | `heading_size: 32` | 20 / 17 | matches global |
| `sections/ss-footer-7.liquid` | footer-group | column headings | 470 / 328 | `column_heading_size: —` | 14 / 12 (`footer-group.json:95-96`) | matches global |
| `sections/ss-footer-7.liquid` | ↑ | `<h2>section.store</h2>` block (`text_size`) | 683 / 665 | `text_size: —` | 108 / 36 (`footer-group.json:26-27`) | **much bigger than global** |
| `sections/pill-navigation.liquid` | collection | pills | 106 | `font_size: 18` | 16 / 12 (`collection.json`) | matches global |
| `sections/rhode-hero.liquid` | PDP hero (fallback) | `.rh-title` (h1) | 135 / 314 | `title_size_desktop: 58` | `clamp(40px, 5vw, 58px)` → 40 / 40 | **much bigger than global** |
| `sections/rhode-faq.liquid` | faq | `.rhode-faq__title` (h2) | `assets/rhode-faq.css:45,232` | hardcoded | 34 / 22 | bigger than global |
| `sections/rhode-clinical-results.liquid` | PDP | heading (h2) | 42 / 232 | hardcoded | `3rem` = 48 / `2rem` = 32 | **much bigger than global** |
| `sections/rhode-clinical-results.liquid` | ↑ | claim number/label | 182 | hardcoded | `2.3rem` = 36.8 | much bigger than global |
| `sections/rhode-prep-toggle.liquid` | PDP | step title (h2) | 129 / 218 | hardcoded | `2.5rem` = 40 / `2rem` = 32 | **much bigger than global** |
| `sections/rhode-pdp-on-the-go.liquid` | PDP | `.rh-otg__title` (h2) | 162 | hardcoded | 32 (desktop) / 23 (`rhode-pdp.css:826`) mobile | bigger than global |
| `sections/rhode-pdp-on-the-go.liquid` | ↑ | tab label | 298 | hardcoded | 40 | **much bigger than global** |
| `sections/rhode-pdp-tagline.liquid` | (available) | display heading | 31 | hardcoded | `clamp(30px, 4.5vw, 64px)` | **much bigger than global** |
| `sections/rhode-pdp-ingredients.liquid` | (available) | heading | 64 | hardcoded | `clamp(36px, 5vw, 72px)` | **much bigger than global** |
| `sections/rhode-pdp-animated-words.liquid` | (available) | display | 70 / 106 | hardcoded | `clamp(48px, 5.2vw, 78px)` / `clamp(38px, 9vw, 58px)` | **much bigger than global** |
| `sections/rhode-pdp-claims.liquid` | (available) | display | 84 | hardcoded | `clamp(36px, 4.5vw, 64px)` | **much bigger than global** |
| `sections/rhode-pdp-results.liquid` | (available) | display number | 52 | hardcoded | `clamp(52px, 6.5vw, 88px)` | **much bigger than global** |
| `sections/rhode-pdp-sustainability.liquid` | (available) | h2 | 75 | hardcoded | `clamp(28px, 4vw, 56px)` | **much bigger than global** |
| `sections/rhode-pdp-application.liquid` | (available) | title | 92 / 101 | hardcoded | `clamp(28px, 3.5vw, 48px)` | **much bigger than global** |
| `sections/rhode-pdp-selector.liquid` | (available) | price / title | 73 | hardcoded | `clamp(16px, 1.8vw, 22px)` | matches / slightly bigger |
| `assets/rhode-pdp.css:484` | PDP (feature slider) | title override | 484 | hardcoded `!important` | 26 (desktop) / — | bigger than global |
| `assets/rhode-pdp.css:739-770` | PDP | product-info h1 (mobile) | 740 | hardcoded `!important` | 30px mobile | **much bigger than global** |
| `assets/rhode-pdp.css:835-839` | PDP (hydrocolloid) | h1/h2/h3 (mobile) | 836 | hardcoded `!important` | 22 mobile | matches |
| `assets/rhode-collection-cards.css:60` | collection | brand wordmark | 60 | hardcoded | `clamp(28px, 3.4vw, 52px)` | **much bigger than global** |
| `assets/rhode-collection-cards.css:130,140` | collection | card title / price | 130 / 140 | hardcoded | `clamp(15px, 1.2vw, 20px)` | matches global |
| `assets/rhode-collection-cards.css:251` | collection (mobile) | brand wordmark | 251 | hardcoded | `clamp(22px, 8vw, 34px)` | much bigger than global |
| `assets/rhode-faq.css:45,232` | faq | `.rhode-faq__title` | 45 / 232 | hardcoded | 34 / 22 | bigger than global |
| `sections/hero.liquid` (Horizon native) | index, collection, faq, impact, our-story, sustainability | pill text | 651 / 676 | hardcoded | 14 / 13 | matches global |

Notes:
- `sections/main-collection.liquid` and `sections/main-page.liquid` contain NO `font-size` rules — every heading inside them inherits the global h1..h6 tokens or the child section's override.
- `assets/isoua-button-overrides.css:223-232` shrinks `body.page-terms-of-service h1` and `body.page-contact-us h1` to **24px mobile** — a targeted `!important` that only fires <=749px.

## 3 — The inconsistency map

Bucketing every heading rendered on the store:

**Bucket A — Display (>= 48px)**
- `ss-hero-1.title_size` default 72 (homepage hero).
- `ss-targetting-animation.text_size_desktop` 68 (PDP "smaller/flatter/less red").
- `ss-packaging.heading_size` 64 default (PDP).
- `rhode-hero.title_size_desktop` 40-58 (PDP hero fallback).
- `rhode-clinical-results` 48 (PDP).
- `rhode-pdp-ingredients` 36-72, `rhode-pdp-animated-words` 48-78, `rhode-pdp-results` 52-88, `rhode-pdp-claims` 36-64, `rhode-pdp-tagline` 30-64, `rhode-pdp-sustainability` 28-56, `rhode-pdp-application` 28-48.
- `rhode-collection-cards` `.isoa-rc-brand` 28-52.
- `ss-footer-7 text_size` for `<h2>section.store</h2>` = 108.

**Bucket B — Large (28-47px)**
- `ss-image-split-row.heading_size` 52 default.
- `ss-image-with-text-14`, `ss-image-with-text`, `ss-image-with-text-15.heading_size` 32-36 default.
- `ss-featured-collection-6`, `ss-featured-collection-6-new`, `ss-featured-collection-13.tag_size` 40 default.
- `ss-featured-products-4.title_size` 34.
- `rhode-pdp-on-the-go.title` 32 desktop, `.rh-otg__tab` 40.
- `rhode-prep-toggle` step title 40 / 32.
- `ss-whats-inside.side_title_size` 32 / 16.
- `page.impact.json` and `templates/index.json` mostly set 28-36 for headings.
- `sections/hero.liquid` (Horizon) render.

**Bucket C — Medium / global-scale (16-24px)**
- Global `h1: 22`, `h2: 18` (from `settings_data.json`).
- `ss-featured-collection-*.title_size` 16-18.
- `pill-navigation.font_size` 16 desktop / 12 mobile.
- `ss-header-1.name_size` 28 (already too big for this bucket) / 18 mobile — mobile is here.
- `rhode-pdp-selector` 16-22.
- `assets/rhode-pdp.css:836` hydrocolloid mobile 22.

**Bucket D — Small (10-15px)**
- Global `h3-h6: 13-16`, paragraph 14.
- Almost every `text_size` / eyebrow (11-14).
- `.rhode-faq` question 14, `.isoa-rc-title` 13 on mobile, PDP eyebrows 10-13.

So the store currently spans FOUR heading buckets (48+ / 28-47 / 16-24 / 10-15). The globals fit **C+D**. **A and B are the buckets to collapse.** ~15 sections need to move down from A→B or A→C, and about the same number from B→C.

Rhode reference (from `RHODE-COLLECTION-AUDIT.md:19,33` and `PDP-REFERENCE-AUDIT.md` cross-checks): Rhode's own headings live in the 22-34px band on mobile and 32-52px band on desktop for display, 16-18px for card titles, 11-13px for eyebrows. So even Rhode is not as tight as ISOUA's global (22/18/16). A slightly larger scale than the current globals is fine for display sections.

## 4 — Recommended normalized scale

**80% of the fix is already in place.** The global h1..h6 tokens ARE the small scale you want. The remaining work is (a) unifying the per-section overrides to a tight ladder, (b) using CSS variables so a single knob controls all "SS-section heading" instances.

Proposed 5-step display ladder (adds on top of the global tokens, does not replace them):

| Role | Desktop | Mobile | Where it applies |
|---|---|---|---|
| `display-xl` | 44px | 30px | one true hero heading per page (homepage hero, PDP hero) |
| `display-lg` | 32px | 24px | major section headings (image-with-text, image-split-row, featured-collection, packaging, on-the-go, prep-toggle, clinical-results) |
| `display-md` | 24px | 20px | secondary section headings (whats-inside side title, featured-products step title, faq h2, footer store wordmark) |
| Global h1..h6 | 22 / 18 / 16 / 15 / 13 / 13 | same | body & UI copy — already correct |
| Eyebrow | 11px | 11px | all eyebrows / labels (`.rh-eyebrow`, `text_size` in animation/claims/etc.) |

Why 44/32/24 instead of 22/18/16 for section headings: at 22px a `<h2>Clinically-proven PATCHES…</h2>` inside a full-width pill card reads as body copy — the pill loses its "section" affordance. Rhode uses ~32px display for the same slot (`RHODE-COLLECTION-AUDIT.md` audit; PDP audit confirms 32-40 across their PDP). 44px keeps hero anchors visually dominant on the homepage where there is genuinely only one h1 per fold.

Line-heights: `display-tight 1.1` for `display-xl`, `heading-normal 1.25` for the rest. Weights: 400 (Inter regular is what CLAUDE.md says the design brief calls for — `.rh-otg__title` at `font-weight: 400` in `rhode-pdp-on-the-go.liquid:162` is the reference). Letter-spacing: `-0.02em` on display, `0` on medium.

## 5 — Application plan

Prefer the fewest edits with the biggest reach. Order matters: 1 first (no code change; ~50% of the visible shrink), then 2, then 3, then 4.

**Step 1 — Push the JSON defaults down (no CSS touch).** In each template JSON, edit the `settings.heading_size` / `title_size` / `text_size_desktop` / `top_heading_size_desktop` values to match the ladder above. Locations to hit:
- `templates/index.json:163,796,905,1061,1197` — homepage `heading_size` fields.
- `templates/product.rhode-product-page.json:669,805,871,986,1128,1187,1606,1762,1924` — PDP.
- `templates/page.impact.json:143,343,402,465` — impact page.
- `templates/page.our-story.json`, `templates/page.sustainability.json`, `templates/page.faq.json`, `templates/collection.json` — similar rows.
- `sections/header-group.json:182` — `name_size` 28 → 22.
- `sections/footer-group.json:26` — `text_size` 108 → 44.

No `!important`. No CSS. Just numbers. This will resolve every "much bigger than global" row in the table.

**Step 2 — Introduce three brand tokens** in `assets/isoua-button-overrides.css:26` (already the site-wide sheet) under `:root, body`:
```
--isoa-display-xl: 44px; --isoa-display-xl-m: 30px;
--isoa-display-lg: 32px; --isoa-display-lg-m: 24px;
--isoa-display-md: 24px; --isoa-display-md-m: 20px;
```
Non-`!important`. Then future edits set `font-size: var(--isoa-display-lg)` and a single knob controls all display headings. Do NOT touch Horizon's `--font-h*--size` vars — they drive the global tokens which are already right.

**Step 3 — Replace hardcoded sizes in `sections/rhode-*.liquid` and `assets/rhode-*.css`** with the tokens from step 2. Specific edits (each is a single line):
- `sections/rhode-clinical-results.liquid:42` `3rem` → `var(--isoa-display-lg)`; `232` `2rem` → `var(--isoa-display-lg-m)`.
- `sections/rhode-prep-toggle.liquid:129` `2.5rem` → `var(--isoa-display-lg)`; `218` `2rem` → `var(--isoa-display-lg-m)`.
- `sections/rhode-pdp-on-the-go.liquid:162` `32px` → `var(--isoa-display-lg)`; `298` `40px` → `var(--isoa-display-md)`; `assets/rhode-pdp.css:826` `23px` → `var(--isoa-display-lg-m)`.
- `sections/rhode-pdp-*.liquid` (tagline/ingredients/animated-words/claims/results/sustainability/application): swap every `clamp(...)` on a heading for the appropriate `var(--isoa-display-*)` token. Delete the `clamp`. These sections aren't referenced in any current template, so this is future-proofing; feel free to defer.
- `sections/rhode-hero.liquid:135,314` — `clamp(40px, 5vw, 58px)` → `var(--isoa-display-xl)`; `40px !important` → `var(--isoa-display-xl-m)`.
- `sections/rhode-faq.liquid` heading rendered from `assets/rhode-faq.css:45,232` — 34 → `var(--isoa-display-lg)`, 22 → `var(--isoa-display-lg-m)`.
- `assets/rhode-collection-cards.css:60` `clamp(28px, 3.4vw, 52px)` → `var(--isoa-display-xl)`; `:251` mobile → `var(--isoa-display-xl-m)`.
- `assets/rhode-pdp.css:484` `26px !important` → `var(--isoa-display-md) !important` (keep the important; adjacent Horizon rule uses `!important`).
- `assets/rhode-pdp.css:740` mobile product h1 `30px !important` → `var(--isoa-display-lg-m) !important`.

**Step 4 — Where a section's schema is itself the source of the number** (SS sections read `range` and inject px directly), lower the schema **default** in the `.liquid` schema block so future re-creations of the section start at the small size. Files: `ss-hero-1.liquid:794` (title_size default `72` → `44`), `ss-image-split-row.liquid:626` (`52` → `32`), `ss-image-with-text*.liquid` (`32/36` → `32`), `ss-featured-collection-*.liquid` (`heading_size 40` → `32`, `tag_size 40` → `24`), `ss-packaging.liquid:216` (`64` → `32`), `ss-featured-products-4.liquid:1720` (default → `24`), `ss-whats-inside.liquid` `side_title_size` (`28` → `24`), `ss-targetting-animation.liquid` `text_size_desktop` (`76` → `44`). These are default-only edits, they don't retroactively change live values (step 1 handled those); they just prevent new sections from spawning oversized.

Do NOT create `assets/typography.css` or duplicate any Horizon-owned rule. Do NOT change `assets/isoua-button-overrides.css:245-257` (kills italic — leave it). Do NOT edit the `--font-h*--size` variables — the global scale is already what you want; touching them would break `.rte h1/h2` heading rendering in FAQ + policy pages.

## Summary

The store's global heading tokens are already dialled to a small scale (h1 22, h2 18, h3 16); the visual inconsistency is caused by **~15 vendor "SS-" and rhode-* sections that hardcode `font-size: {{ setting }}px` in inline `<style>` and default those settings to 28-72px** — plus a handful of `.css` files with `clamp()` display sizes. The fastest normalization is a two-part fix: (1) push the current `heading_size`/`title_size` values in `templates/*.json` and `header-group.json`/`footer-group.json` down to the proposed 44/32/24/22/13 ladder (pure JSON, no CSS), then (2) add three `--isoa-display-*` CSS vars in `assets/isoua-button-overrides.css` and swap the ~10 hardcoded `clamp(...)` / `2.5rem`-style rules in `rhode-*.liquid` and `rhode-*.css` to consume them, so all future tuning is a single-knob change.
