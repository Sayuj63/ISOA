# ISOA · Rhode PDP clone — session context

> Read this before touching anything. Skimming will make you repeat mistakes we've already paid for.

## What this project is

Cloning `https://www.rhodeskin.com/products/spotwear-daisy` into the ISOUA store's PDP. The target design is in `tmp/pdfs/7b48829d-*.png` (5 pages). We're building the clone on the **`product.rhode-product-page`** template (NOT v2 — see below).

## Store + theme

- **Store**: `isoua-2.myshopify.com` (Anthropic-internal short id `bh0tnw-wh` shows up in some Admin URLs — same store).
- **Primary domain**: `www.isoua.com` (redirects from `isoua-2.myshopify.com`).
- **Theme**: `ISOA/main`, id `163261120741`, currently **live** (as of 2026-08-10). The previous live theme `VAMSHI` #161130643685 is now **unpublished** — verified via `shopify theme list`. All the PDP + collection work now targets `ISOA/main`.
- **Store is password-protected** ("Launching Soon" splash on both the myshopify domain and the primary domain).
- **Shopify CLI 4.6.1** is installed at `/opt/homebrew/bin/shopify`.

### Push a file
```
shopify theme push --store=isoua-2.myshopify.com --theme=163261120741 \
  --only=path/to/file --nodelete --allow-live
```
`--allow-live` is required because we're pushing to the live theme. Push is non-interactive-friendly with `--allow-live`.

### Bypass the "Launching Soon" gate for verification
```
nohup shopify theme dev --store=isoua-2.myshopify.com --theme=163261120741 \
  --host=127.0.0.1 --port=9292 > /tmp/shopify-dev.log 2>&1 &
```
Then hit `http://127.0.0.1:9292/products/spotwear?view=rhode-product-page`. The dev server serves the live theme's files with password auto-bypass. `disown` the process; kill with `pkill -f "shopify theme dev"` or `lsof -ti:9292 | xargs kill -9`.

## Verification workflow — do this every push

Never claim "shipped" without visual confirmation. Playwright is at `/tmp` (installed via `npm i @playwright/test`), headless Chromium is downloaded.

Standard inspection script pattern:
```js
import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://127.0.0.1:9292/products/spotwear?view=rhode-product-page',
             { waitUntil: 'load' });        // don't use networkidle — theme dev never quiets
await p.waitForTimeout(3000);
// ... .evaluate for computed styles / bounding rects
// ... .screenshot({ clip: {...} }) for visual
```

Screenshots saved to `tmp/verify/*.png`. Use `python3 -c "from PIL import Image; …"` to crop / annotate.

## The template — `templates/product.rhode-product-page.json`

Loads `assets/rhode-pdp.css` via `layout/theme.liquid:44-45` (gated on `template == 'product.rhode-product-page'`).

**Never work on `product.rhode-pdp-v2.json`.** That was an earlier attempt that layered `!important` CSS on top of the wrong assumptions — it's kept in the repo for reference only. Its stylesheet `assets/rhode-pdp-v2.css` still contains conflicting rules (see line 481-556) — do not copy from it.

### Section order (top → bottom)

| # | JSON id | Type | Purpose | Status |
|---|---|---|---|---|
| 1 | `main` | `product-information` (OS 2.0) | Hero: image + details card | Pill-aligned, height locked ✓ |
| 2 | `ss_slider_5_m7VKpN` | `ss-slider-5` | "spotted on you" grey pill w/ tiles | ✓ |
| 3 | `ss_image_split_row_TniKMq` | `ss-image-split-row` | "Clinically-proven PATCHES…" two cards | ✓ |
| 4 | `ss_targetting_animation_Wqer7m` | `ss-targetting-animation` | "smaller / flatter / less red" wave-clip | ✓ |
| 5 | `ss_featured_products_4_ycPmw7` | `ss-featured-products-4` | Application slider | Structure ✓, needs images uploaded |
| 6 | `ss_image_with_text_15_rAQEaq` | `ss-image-with-text-15` | "what's inside" toggle | ✓ (reference for pattern) |
| 7 | `ss_image_with_text_9EpeQg` | `ss-image-with-text` | Consumer study section | Layout ✓, copy still theme-default "Image with text #1" |
| 8 | `section_WUmYw7` | `section` (Horizon) | Hydrocolloid "how it works / why we love it" | ✓ |
| 9 | `ss_image_with_text_4PncMc` | `ss-image-with-text` | (disabled — replaced by rhode_pdp_on_the_go) | disabled, stays in `order` (Shopify requires it) |
| 10 | `rhode_pdp_on_the_go` | `rhode-pdp-on-the-go` | "Take your rhode ON THE GO" 5-tab slider | ✓ built + hover-activation + big circles |
| 11 | `ss_featured_collection_13_RrkUFQ` | `ss-featured-collection-13` | Spot selector 01-05 | ✓ |
| 12 | `ss_packaging_cUBeaP` | `ss-packaging` | "ready-to-wear skincare" packaging card | ✓ |
| 13 | `section_store_featured_collection_6_hnPVwp` | `section-store-featured-collection-6` | Cross-sell prep/mist/tint | Layout ✓, styling of Zen Dots labels pending |
| 14 | `ss_whats_inside_8w8VfA` | `ss-whats-inside` | Ingredient grid | ✓ |
| 15 | `rhode_sticky_atc` | `rhode-sticky-atc` | Sticky bottom-of-viewport ATC bar — appears after hero scrolls out | ✓ (position:fixed, out of flow → exempt from the section-gap rules in `rhode-pdp.css:521-554`) |

## The single most important concept — the pill rail

Every visible section is supposed to align on a shared rail matching the SS-header-1 grey pill. Measured live at 1440vw:

- **Header pill: `left=40, right=1400, width=1360`.**
- The rail formula: `min(calc(var(--page-width) - var(--page-margin) * 2), calc(100% - var(--page-margin) * 2))`.
- At runtime `--page-width` is `calc(150rem + 40px*2)` = **2480px**, `--page-margin` is **40px**. So `min(2400, 100% - 80)` — the second term wins whenever the parent is narrower than 2400.

## THE BUG WE KEPT REPEATING — the double inset

**Problem pattern:** every time a section looked "40px off", the cause was: the outer wrapper was ALREADY at the pill (40 → 1400) via Horizon's grid subgrid (`grid-column: 2`) OR via its own `padding-inline: 40px`, and my `.section-{id}-inner { max-width: min(page-width - 40*2, 100% - 40*2) }` was applying **a second 40px inset** on each side (rendering at 80 → 1360, width 1280 instead of 1360).

**How to know which case you're in:**

Run this in the browser console for the section you're debugging:
```js
const outer = document.querySelector('[the section root]');
const inner = document.querySelector('[the inner wrapper]');
console.log('outer', outer.getBoundingClientRect());
console.log('inner', inner.getBoundingClientRect());
console.log('outer grid-column', getComputedStyle(outer).gridColumn);
console.log('outer padding', getComputedStyle(outer).padding);
```

- If **outer** already reads `left=40, right=1400`: it's pill-flush. Inner should just be `max-width: 100%; margin-inline: 0` — **DO NOT apply the pill formula**.
- If **outer** reads `left=0, right=1440` (full-bleed) AND has no padding: apply the pill formula on the inner. This is what `ss-image-with-text-15` does (the reference pattern at lines 571-598 of that file).
- If **outer** reads `left=0, right=1440` AND has `padding-inline: 40px` (like `ss-packaging`): the outer's content-box IS already pill-width (1360). Inner just needs `width: 100%` — **DO NOT apply the pill formula**.

The three sections that use the pill formula correctly (outer is full-bleed, no padding): `ss-image-with-text-15`, `ss-slider-5`, `ss-featured-collection-13` (via native code in each `.liquid`).

The four sections where I mistakenly applied the pill formula and had to remove it:
- `ss-image-split-row` → now `.section-{id}-inner { max-width: 100% }`
- `rhode-pdp-on-the-go` → now `.rh-otg__pill { max-width: 100% }`
- `section.liquid` (hydrocolloid) → in `rhode-pdp.css` I still override `.section--page-width { grid-column: 1/-1; max-width: var(--rhode-pill) }` because Horizon's subgrid placement was 40→1400 already; the `grid-column: 1/-1` breaks the subgrid to allow the pill formula to work correctly.
- `ss-packaging` → removed my `.packaging-wrapper { max-width: var(--rhode-pill) }` override; the section's own `padding-inline: 40` already produces pill-flush content.

## The gap standard — 16px

Every image/text split on the PDP uses **16px** column gap. JSON settings updated to match:
- `ss_image_split_row.desktop_gap: 16`
- `ss_image_with_text_9EpeQg.layout_gap: 16` (was 32)
- `ss_image_with_text_4PncMc.layout_gap: 16` (was 32, but section is disabled anyway)
- `ss_featured_products_4.layout_gap: 16` (was 12)
- `ss_featured_collection_13.layout_gap: 16` (was 12)
- `ss_whats_inside.desktop_gap: 16` (was 12)
- `section_WUmYw7.gap: 16` (was 12)

## Key files + their gotchas

### `assets/rhode-pdp.css`
Loaded only on `template == 'product.rhode-product-page'`. Contains:
- Hero (product-information) sizing + internal-scroll fix (`min-height: 0` on `.product-details > .group-block`, `height: 100%`, `align-self: stretch`).
- Pill-width normalization for the sections that need it.
- 2-column grid override for `.section-content-wrapper.layout-panel-flex--row` (Horizon's flex row — needed for hydrocolloid section to enforce 50/50 columns because image aspect-ratio locks flex distribution).
- Rule that hides class-less empty `<div>` inside that flex row (Horizon renders an empty custom-liquid block as a class-less `<div>` that becomes a phantom flex child — hiding it removes a 16px ghost gap on the left).

### `sections/ss-image-with-text-15.liquid`
**This is the reference for the correct pill-width pattern.** Lines 571-598. Outer `.section-{id}` is full-bleed with all margins/padding/borders zeroed; inner `.section-{id}-settings` uses the pill formula with `margin-inline: auto`. Every other section's pattern should match THIS one if the outer is full-bleed.

### `sections/ss-image-with-text.liquid`
Has a legacy `-vamshi` block at lines 336-386 that forces the section into a single grey pill with `gap: 0` (for the homepage's "Image with text" section that uses this file). On the PDP we gate that with `{%- unless template == 'product.rhode-product-page' -%}` so the PDP gets separate cards with a 16px gap. Keep the gate intact.

### `sections/ss-targetting-animation.liquid`
The "smaller / flatter / less red" section.
- Two `<span>` layers per word: `.rh-text-inner--primary` (grey) and `.rh-text-inner--secondary` (pink, absolutely positioned overlay).
- Pink layer uses `clip-path: inset(0 100% 0 0) → inset(0 0 0 0)` with `transition: clip-path 1s cubic-bezier(.76,0,.24,1)`.
- **CRITICAL:** the `.rh-text-inner` selector matches BOTH primary and secondary. Never put `transition: none` on `.rh-text-inner` — it kills the pink transition. Scope reset to `.rh-text-inner--primary` only. This bug wasted a whole diagnostic loop.
- JS should NOT have an `isAnimating` guard. Every hover swaps `.is-active` immediately — the CSS transition handles smoothness. The `isAnimating` guard blocks rapid hovers and feels laggy.
- Image swap fires on the same tick (no `setTimeout(80)` lag).

### `sections/rhode-pdp-on-the-go.liquid`
Custom-built "Take your rhode ON THE GO" 5-tab slider. Circle nav is 88×88 with `mouseenter` handler on desktop (`matchMedia('(min-width: 750px)')`). Do not shrink the circles — user explicitly asked for 88px matching Rhode's reference.

### `assets/isoua-button-overrides.css`
**Loaded on every page** via `snippets/stylesheets.liquid:4`. Contains:
1. Site-wide button unification (already there when session started).
2. **Italic-heading kill** (added end of session): resets `--font-heading--style`, `--font-h1--style`, …, `--font-h6--style` to `normal` on `:root, body`, plus `h1-h6 { font-style: normal }` as belt-and-suspenders. Fixes Horizon's default Inter Italic 800 heading across the entire site (FAQ, About, product pages).

### `layout/theme.liquid:44-62`
Loads template-scoped stylesheets:
- `rhode-pdp.css` on `product.rhode-product-page`
- `rhode-pdp-v2.css` on `product.rhode-pdp-v2` (DO NOT WORK ON V2)
- `rhode-pdp.css` on `product.spotwear-pdp`

### `snippets/isoa-rhode-card.liquid` + `assets/rhode-collection-cards.css`
Shared "Rhode-style" product card used on the collection page, PDP cross-sell, and homepage featured collection. **Same DOM, two different visual layouts** — desktop vs. mobile — controlled entirely by CSS.

- **DOM order**: `.isoa-rc-frame` (image + brand label + "new" badge) → `.isoa-rc-info` (stars, review count, title, standalone price) → `.isoa-rc-cta` (BUY pill).
- **Desktop (>= 750px)**: `.isoa-rc-info` and `.isoa-rc-cta` are absolutely positioned over the image frame. Info is a 2-column grid (title left, price right). CTA is opacity:0 by default and fades in on hover with an image swap.
- **Mobile (< 750px)** — refactored 2026-08-10 to match `rhodeskin.com/collections/shop`: **image-only card, all UI overlaid on the image** (no in-flow content below the image). Info is `position: absolute; bottom: 44px; left:12px; right:12px; text-align: left`, so stars, review count and title are bottom-left overlays. CTA is `position: absolute; bottom: 10px` — an outlined transparent pill spanning the bottom of the image with **centered** text. Card height = frame height.
- **Frame aspect ratio** matches Rhode's reference on both breakpoints (verified with dev-tools measurements): desktop `441 / 534` (~0.826), mobile `211 / 289` (~0.730). Both are portrait — the extra headroom at the bottom of the image is where the info + CTA overlays sit, so they don't cover the product bottle. `.isoa-rc-promo__frame` uses the same ratios so promo tiles match product tiles in the grid.
- **CTA text is dual-rendered**: a `.isoa-rc-cta-desk` span (default `display: inline`) with `"BUY — Rs. 1,999"` for desktop, and a `.isoa-rc-cta-mob` span (default `display: none`) with `"BUY — ₹1,999"` for mobile. The mobile media query swaps their displays. The `.isoa-rc-cta-lead` span (`"BUY —"`) is 9px on mobile so the price reads bigger than the prefix.
- **`price_short_inr`**: in the snippet, `product.price | money_without_trailing_zeros | replace: 'Rs. ', '₹' | replace: 'Rs.', '₹' | replace: 'INR ', '₹'` — belt-and-suspenders for any of Shopify's INR formatting outputs.
- **Do not touch desktop styles when tweaking mobile.** All mobile-only rules live inside `@media (max-width: 749px)` at the bottom of the file.

## Mistakes we made — do not repeat

1. **Claiming "shipped" without verifying.** Multiple passes went by where I said something worked and it didn't. Always screenshot after push. If it's an alignment fix, always run a Playwright measurement script and compare rects to the header pill.

2. **Layering `!important` CSS on top of unknown existing rules.** The right approach is to READ the base rule + trace what's actually setting the property (browser dev tools or Playwright's `.getMatchedCSSRules()`), then modify the source rule in-place with a `{% if template == 'product.rhode-product-page' %}` Liquid conditional. Only fall back to `!important` when the source rule is in a file we can't touch. NEVER stack duplicate `!important` overrides for the same property in the same file — makes future debugging impossible.

3. **Assuming the outer wrapper is full-bleed.** Horizon's subgrid (`grid-column: 2`) or a section's `padding-inline: 40` can put the outer at pill-flush already. Apply the pill formula only when the outer is genuinely 100vw wide with no padding. See "THE BUG WE KEPT REPEATING" above.

4. **The `.rh-text-inner { transition: none }` trap.** Killed the pink layer's transition for a whole conversation before I realized the selector matched both primary AND secondary. Always scope resets to the SPECIFIC class variant.

5. **Setting `max-height` on grid items without `min-height: 0`.** Grid items get an implicit `min-height: auto` that grows with content, ignoring `max-height`. The fix is `min-height: 0` (allows shrink) + `height: 100%` (fills row) together.

6. **The empty custom-liquid `<div>` in Horizon's `section` blocks.** Horizon renders a class-less empty `<div>` for a `custom-liquid` block even when the setting is blank. It's a phantom flex child that eats a gap. Hide with `> div:not([class])`.

7. **Text edits in Liquid comments.** `{% ... %}` inside a `/* CSS comment */` in a `<style>` block still gets parsed by Shopify's Liquid parser. This threw a syntax error on ss-featured-collection-13 when I referenced `{% unless full_width %}` in a comment.

## Design specs that come up often

- **Pill formula width**: `min(2400px, 100% - 80px)` — at 1440vw resolves to 1360.
- **Column gap**: 16px between image + content columns.
- **Card border radius**: 10px on individual cards, 10px on the pill container.
- **Card background colors**:
  - Left content card (ss-image-split-row): `#ebe7e2` (beige, from JSON `content_bg`)
  - Right image card (ss-image-split-row, no image uploaded): `#f1f0ed` (matches header pill grey — subtle but visible)
  - Grey pill background (ss-targetting-animation, ss-image-with-text-15, rhode-pdp-on-the-go): `#f1f0ed`
  - Image column inside grey pill: `#e5e3df`
- **Pink accent color**: `#e29fc8` (active circle color, active pink text fill)
- **Brand foreground**: `#67645e` (all text, borders, buttons)
- **Section min-height (equal-column sections)**: 620px so image + content columns line up nicely at desktop.

## Multi-agent diagnostic pattern (what actually worked)

When a section was misaligned, the winning approach was to spawn two agents in parallel:

1. **Live-measurement agent (general-purpose, has Bash+Playwright)**: writes a Node script that visits `127.0.0.1:9292/products/spotwear?view=rhode-product-page`, walks the DOM ancestors of the misaligned element, prints each ancestor's `getBoundingClientRect()` + computed padding/margin/max-width. Identifies which ancestor is at pill-flush and where the misalignment is introduced.

2. **CSS-trace agent (Explore)**: greps `assets/*.css`, `sections/*.liquid`, `blocks/*.liquid`, `snippets/*.liquid` for every rule that could affect the element. Reports file paths and line numbers.

The pattern makes root cause finding fast: measurement pinpoints WHERE the misalignment is, CSS trace pinpoints WHICH rule causes it. Then a single surgical edit fixes it.

## What's still pending (as of session end)

- `ss_image_with_text_9EpeQg` (consumer study section) — layout is now correct (two cards, 16px gap, pill-flush) but the copy is still theme-default `"Image with text #1"` + `"Made with care and unconditionally loved…"`. Needs the real Rhode content: `AFTER 8 HOURS`, `100% / 100% / 94% / 90%` stats, "consumer study results", "clinical results" tabs, right-side portrait image. This might warrant a new section rather than trying to force ss-image-with-text into that layout.
- `ss_featured_products_4` (Application slider) — mechanically works but has NO images uploaded on the slide blocks. Need to upload the 3 application step images via theme editor.
- `ss_featured_products_4` **mobile layout** — added 3 SECTION-level image_picker settings (`mobile_thumb_1`, `mobile_thumb_2`, `mobile_main`). On mobile, Rhode's design shows a 2-thumb + 1-main-image block ABOVE the APPLICATION eyebrow + step swiper. Static images render via `.featured-mobile-static-{id}` and are hidden on desktop. Per-slide `.featured-slide-image-{id}` is hidden on mobile. **User needs to upload the 3 static images via the theme editor → SS - Featured products #4 → "Mobile static images" section.**
- The three Rhode PDP sections still missing entirely:
  - **Reviews UI** (4.6 ★ · 63 reviews · filters · per-review "how smaller did your spots look?" slider)
  - **`SHOW MORE` pill button** below reviews
  - **Massive "rhode" wordmark** banner near the bottom
- `section_store_featured_collection_6` — cross-sell prep/mist/tint labels should probably be in Zen Dots font (like Rhode) — currently theme default.

## What we've achieved

- All PDP sections snap to the SS-header-1 pill rail (verified with Playwright measurements — `left=40, right=1400`).
- Site-wide 16px column gap between image + text splits.
- Hero (product-information) locks image height = details height, with internal scroll on details when content overflows (no more bleeding into the next section).
- "Smaller/flatter/less red" hover animation works with L→R fill + R→L unfill in parallel + image crossfade with alternating slide direction.
- "Take your rhode ON THE GO" 5-tab slider fully built with big circles, hover-to-activate, pre-populated with real Rhode-style content.
- Italic headings killed site-wide via `--font-h*--style: normal` override.
- Consistent card colors, pill widths, gap sizes across all sections.

## Session tone / how the user works

- Prefers surgical fixes over `!important` layering. When something isn't working, always dig into WHY (Playwright inspection, DOM walk, computed style dump) before adding overrides.
- Wants verification screenshots after every push. Never say "shipped" without running Playwright + comparing to header pill rect.
- Uses `.claude/agents/interaction-auditor.md` for exhaustive interaction audits (needs Playwright MCP — not currently installed, but leave a note if we should suggest installing it).
- Fast to say "no ai slop" — keep CSS minimal, one source of truth per property, no duplicated rules. Comment WHY, not what.

---

*Written at session end so the next Claude picks up with full context. If any of the above turns out wrong, correct it here immediately — don't leave stale notes for the next session.*
