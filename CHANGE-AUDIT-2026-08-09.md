# ISOA · Rhode clone — change audit (2026-08-09)

Consolidated pending-work list across PDP and collection page, plus the drift between `CLAUDE.md` (dated 2026-07-30) and what's actually on disk today. Reads on top of, not instead of, the two existing audits:

- `PDP-REFERENCE-AUDIT.md` (2026-08-04) — reference spec + acceptance criteria for the four remaining PDP sections.
- `RHODE-COLLECTION-AUDIT.md` (2026-07-30) — HTML/CSS reference for the Rhode collection card.

Ground truth verified 2026-08-09 by reading the on-disk templates, sections, snippets, and CSS. **Nothing was pushed for this audit.**

---

## 0 · CLAUDE.md is stale — fix before next session picks it up

`CLAUDE.md` "Section order" table (lines ~58–75) has drifted from `templates/product.rhode-product-page.json`. On-disk order today:

| # | JSON id | Type | CLAUDE.md says |
|---|---|---|---|
| 1 | `main` | `product-information` | ✓ |
| **2** | **`rhode_prep_toggle_new`** | **`rhode-prep-toggle`** | **not in table** |
| 3 | `ss_slider_5_m7VKpN` | `ss-slider-5` | listed as #2 |
| 4 | `ss_image_split_row_TniKMq` | `ss-image-split-row` | #3 |
| 5 | `ss_targetting_animation_Wqer7m` | `ss-targetting-animation` | #4 |
| 6 | `ss_featured_products_4_ycPmw7` | `ss-featured-products-4` | #5 |
| 7 | `ss_image_with_text_15_rAQEaq` | `ss-image-with-text-15` | #6 |
| 8 | `ss_image_with_text_9EpeQg` | `ss-image-with-text` (disabled) | #7 |
| **9** | **`rhode_clinical_results_new`** | **`rhode-clinical-results`** | **not in table** |
| 10 | `section_WUmYw7` | `section` | #8 |
| 11 | `ss_image_with_text_4PncMc` | `ss-image-with-text` (disabled) | #9 |
| 12 | `ss_whats_inside_8w8VfA` | `ss-whats-inside` | listed at #14 |
| 13 | `rhode_pdp_on_the_go` | `rhode-pdp-on-the-go` | #10 |
| 14 | `ss_featured_collection_13_RrkUFQ` | `ss-featured-collection-13` | #11 |
| 15 | `ss_packaging_cUBeaP` | `ss-packaging` | #12 |
| 16 | `section_store_featured_collection_6_hnPVwp` | `section-store-featured-collection-6` | #13 |
| 17 | `rhode_sticky_atc` | `rhode-sticky-atc` | #15 |

Two new sections were shipped after CLAUDE.md was written (`rhode_prep_toggle_new`, `rhode_clinical_results_new`) but never got recorded there. `ss_whats_inside` also swapped position with the on-the-go slider. Update the table before the next session loads it.

Also worth adding to CLAUDE.md:
- `PDP-REFERENCE-AUDIT.md` flags `rhode_prep_toggle_new` at position #2 as **out of Rhode's actual flow** (Rhode goes hero → spotted on you, not hero → prep toggle). We haven't decided whether to move it, drop it, or repurpose it — note that unresolved decision in CLAUDE.md so we don't accidentally style it further.
- The card snippet is `snippets/isoa-rhode-card.liquid`, and it currently hardcodes `is_new = true` (see §2 P0-a below). That's a footgun for future edits — worth calling out.

---

## 1 · PDP — `product.rhode-product-page`

### P0 · Content / data still empty (blocks ship)

**a. `ss_featured_products_4_ycPmw7` — Application slider imagery**
- All 5 slide `image` fields are blank in `templates/product.rhode-product-page.json`.
- All 3 mobile static image pickers (`mobile_thumb_1`, `mobile_thumb_2`, `mobile_main`) are blank on every slide.
- **Action:** merchant uploads 3 desktop step images (matching Rhode's 01/02/03 slides) via theme editor → SS - Featured products #4, plus the 3 mobile static images. No code change needed.
- **Acceptance:** `PDP-REFERENCE-AUDIT.md` §1 (three-step carousel, 16px gap, 10px radius, mobile static block above the eyebrow).

**b. `rhode_clinical_results_new` — real content, not placeholder**
- Portrait image_picker: blank. Right column renders as `#e5e3df` grey.
- Only 2 stat blocks exist today, both `bullet` type. Copy is generic (`CLINICALLY PROVEN TO MINIMIZE THE LOOK OF SPOTS` / `SWEATPROOF FOR UP TO 30 MINUTES AND WATERPROOF`). The reference (see `PDP-REFERENCE-AUDIT.md` §2) requires four stat blocks: `100%` / `100%` / `94%` / `90%`, each with the specific subject-agreement copy.
- Heading: has `"clinical results"` — reference opens with `AFTER 8 HOURS`. Decide whether to add an eyebrow above the current heading or replace it.
- Footnote already reads "31-subject clinical study after immediate and 8 hours" — correct.
- **Action:**
  1. Extend `sections/rhode-clinical-results.liquid` schema to support 4 stat blocks (may already — verify block max). Populate the 4 stat values + copy in the JSON preset/settings.
  2. Upload portrait image via theme editor.
  3. Consider adding an `AFTER 8 HOURS` eyebrow above the current heading.
- **Acceptance:** `PDP-REFERENCE-AUDIT.md` §2 acceptance criteria.

**c. `section_store_featured_collection_6_hnPVwp` — cross-sell references**
- All 4 slide blocks have blank `label` and blank `product_reference`.
- **Action:** map real ISOUA products (per PDP-REFERENCE-AUDIT §4: only ISOUA products, not Rhode names). Style labels in Zen Dots to match Rhode's card language.
- **Acceptance:** cross-sell renders real products with images/prices; labels use Zen Dots font; layout stays pill-flush (40 → 1400 at 1440).

### P1 · Missing sections (structural gaps vs Rhode)

**d. Reviews module + `SHOW MORE` pill**
- No reviews section exists in the template. `PDP-REFERENCE-AUDIT.md` §3 specifies the layout (grey pill container, rating summary, filter/sort, review rows with "how smaller did your spots look?" scale, centered outline SHOW MORE below the visible rows).
- **Blocker before build:** decide the review provider (Rhode uses Okendo — its content cannot be copied). Options: Judge.me, Loox, Okendo, Yotpo, or a native metaobject-based collector.
- **Action:** (1) merchant picks provider + installs; (2) new section `sections/rhode-reviews.liquid` positioned after `ss_packaging_cUBeaP` and before `section_store_featured_collection_6_hnPVwp`; (3) SHOW MORE reveals or loads real reviews only.
- **Acceptance:** `PDP-REFERENCE-AUDIT.md` §3 (real data, accessible controls, empty state, no fabrication).

**e. Oversized `rhode` wordmark treatment**
- Missing entirely. Reference shows a very large, edge-to-edge brand wordmark right before the global footer.
- **Blocker:** need the ISOUA wordmark asset (SVG) and a decision on whether it replaces "rhode" with "isoua" or renders both.
- **Action:** new final PDP section OR extend the footer wrapper. Wordmark must be aria-hidden / decorative so screen readers don't double-announce the brand.
- **Acceptance:** `PDP-REFERENCE-AUDIT.md` §4 (accessible presentational element, pill rail preserved, footer unchanged).

**f. Decide fate of `rhode_prep_toggle_new`**
- Currently at position #2 (immediately after hero). PDP-REFERENCE-AUDIT flags this as out of Rhode's actual sequence.
- **Action (choose one):**
  1. Move it later in the flow where a two-product toggle makes sense (e.g. after `ss_whats_inside`).
  2. Set `"disabled": true` if we don't have a second product to toggle to.
  3. Repurpose the same UI for a genuinely-Rhode moment (e.g. patch color/shape selector).
- **Do not add more CSS to it** until this decision is made.

### P2 · Polish

- `ss_image_with_text_9EpeQg` still holds default `"Image with text #1"` copy and is disabled. If we've committed to `rhode_clinical_results_new` as the replacement, delete this section from the template (Shopify requires it stays in `order` even when disabled — but removing it from `sections` entirely is cleaner). Verify no other template references it before deleting.
- `ss_image_with_text_4PncMc` — same story (disabled, superseded by `rhode_pdp_on_the_go`). Same cleanup question.

---

## 2 · Collection page — `templates/collection.json`

### P0 · Broken behaviour today

**a. All 7 pill nav links are empty strings**
- `templates/collection.json` `pill_navigation_qUQQgf`: every block has `"link": ""`. Nothing routes. Only "Shop All" has `"active": true` (hardcoded).
- **Action:** populate each block's `link` field with the correct handle:
  - Featured → `shopify://collections/featured` (or the store's canonical featured collection)
  - Skin → `shopify://collections/skin`
  - Lip + Cheek → `shopify://collections/lip-cheek`
  - Sets → `shopify://collections/sets`
  - On The Go → `shopify://collections/on-the-go`
  - Award Winners → `shopify://collections/award-winners`
  - Shop All → `shopify://collections/all`
- **Blocker before shipping:** the underlying collections must exist. Merchant confirms which collection handles are live; anything missing gets created OR the pill gets dropped.
- **Acceptance:** clicking each pill navigates to a real, non-404 collection page.

**b. "new" badge is hardcoded on every card**
- `snippets/isoa-rhode-card.liquid:52` reads `assign is_new = true` — every product renders the badge regardless of tags.
- **Action:** replace with `assign is_new = product.tags contains 'new' or product.tags contains 'New' or product.tags contains 'NEW'` (the pattern CLAUDE.md documents at line 236).
- **Acceptance:** only products tagged `new` show the badge.

**c. Mobile pill nav has no scroll cue**
- `sections/pill-navigation.liquid` mobile block (lines ~117–127) has correct sizing but no fade edge / arrow indicator that the rail scrolls. User can miss the fact that there are more pills off-screen.
- **Action:** add a right-side fade gradient overlay on the scroll row when `overflow-x` is active. Pure-CSS with `mask-image` or a positioned `::after` pseudo-element.
- **Acceptance:** on 375, a subtle white-to-transparent gradient signals horizontal scrollability without blocking taps.

### P1 · Missing data hooks (functional but empty)

**d. Card category metafields empty → falls back to "isoua" vendor**
- `snippets/isoa-rhode-card.liquid` reads `custom.card_category` → `product.type` → `product.vendor`. Seed products lack the first two, so the huge top-left overlay reads "isoua" on every card.
- **Action:** merchant populates `product.metafields.custom.card_category` with short lowercase words per product ("hydrocolloid", "spotwear", "prep", etc.). Alternatively populate `product.type` in Admin.
- **Acceptance:** each card's overlay label is meaningful, not the vendor.

**e. Hover images are wordmark shots**
- Snippet falls back to `product.media[1]` when `custom.hover_image` metafield is empty. Seed products' 2nd media is `AZAZ.png` (the store wordmark).
- **Action:** merchant either (1) uploads a lifestyle/model shot as the 2nd media on each product, or (2) sets `custom.hover_image` metafield per product.
- **Acceptance:** hover reveals a different, meaningful image — not the wordmark.

**f. Subtitle metafields empty**
- Rhode cards show a one-line subtitle under the title ("Multipurpose luminizer"). Our snippet reads `custom.card_subtitle` → `custom.subtitle`; both empty on seed products.
- **Action:** populate `custom.card_subtitle` per product.

### P2 · Polish

**g. URL-based active state for pill nav**
- Today `sections/pill-navigation.liquid` responds only to the per-block `active` boolean. "Shop All" is hardcoded active even when we're on `/collections/skin`.
- **Action:** in the Liquid, compare each block's `link` against `request.path` (or `collection.handle`) and set the active class dynamically. Keep the block-level `active` as a manual override for edge cases.
- **Acceptance:** navigating to `/collections/skin` visually highlights the "Skin" pill; the "Shop All" hardcoding can be removed from JSON.

**h. Filter facets row is empty**
- No products have filterable tags/metafields yet. Row renders empty. Either hide when `collection.products_count < 8` OR ship real product tags first.

**i. Marquee section**
- `marquee_4W7nyE` is `"disabled": true`. Decide: re-enable with real content ("Build for Breakouts"), or delete from `sections` entirely.

---

## 3 · Files to touch (rollup)

Grouped by what a single implementation pass would open:

**PDP content pass (no code):**
- `templates/product.rhode-product-page.json` — populate stat blocks, cross-sell references, portrait/application image handles via theme editor.

**PDP structural pass (code):**
- `sections/rhode-clinical-results.liquid` — schema: accept 4 stats not 2; add optional eyebrow.
- New `sections/rhode-reviews.liquid` — reviews module + SHOW MORE.
- New `sections/rhode-wordmark.liquid` (or extension in `sections/footer-group.json`) — oversized brand wordmark.
- `templates/product.rhode-product-page.json` — decide `rhode_prep_toggle_new` fate; insert reviews section between packaging and cross-sell; append wordmark section.

**Collection content pass (no code):**
- `templates/collection.json` — populate 7 pill `link` fields.
- Product metafields — `custom.card_category`, `custom.card_subtitle`, `custom.hover_image`, `new` tag per product.

**Collection code pass:**
- `snippets/isoa-rhode-card.liquid:52` — fix hardcoded `is_new`.
- `sections/pill-navigation.liquid` — URL-based active state + mobile scroll-cue gradient.

**Docs:**
- `CLAUDE.md` — update section order table (§0 above), add card `is_new` gotcha to the "Key files" section, note the `rhode_prep_toggle_new` sequencing decision as unresolved.

---

## 4 · Suggested execution order

1. **CLAUDE.md fix** — 5 min. Costs nothing to leave broken but wastes the next session.
2. **P0 code fixes** (small, surgical):
   - `is_new` hardcoding (1 line).
   - Pill nav URL-based active state (~15 min).
   - Mobile pill scroll-cue (~15 min).
3. **P0 content data (blocked on merchant):**
   - Confirm/create 7 collections + populate pill links.
   - Populate `card_category`, `card_subtitle`, `hover_image`, `new` tag per product.
   - Upload Application slider images (3 desktop + 3 mobile).
   - Upload clinical results portrait; populate 4 stat blocks.
   - Populate cross-sell products.
4. **P1 sections** (bigger, code):
   - Reviews module — largest item, blocked on provider decision.
   - Wordmark treatment — blocked on ISOUA asset.
   - `rhode_prep_toggle_new` sequencing decision.
5. **P2 polish** — Zen Dots on cross-sell labels, filter facet hide-when-empty, disable stale placeholder sections.

---

## 5 · Verification standard (unchanged from CLAUDE.md)

Every push:

```
shopify theme push --store=isoua-2.myshopify.com --theme=163261120741 \
  --only=path/to/file --nodelete --allow-live
```

```
nohup shopify theme dev --store=isoua-2.myshopify.com --theme=163261120741 \
  --host=127.0.0.1 --port=9292 > /tmp/shopify-dev.log 2>&1 &
```

Then Playwright at `127.0.0.1:9292/products/spotwear?view=rhode-product-page` (PDP) or `127.0.0.1:9292/collections/all` (collection). Measure against the header pill rail (40 → 1400 at 1440vw). Save screenshots under `tmp/verify/`.

Never claim "shipped" without visual confirmation. If it's alignment, run a `getBoundingClientRect()` script and compare to the pill.
