# Rhode collection page — full audit

Reference: `https://www.rhodeskin.com/collections/shop`
Captured: 2026-07-30 via Playwright (headless Chromium, iPhone 13 UA for mobile).
Screenshots live at `/tmp/rhodev3-*.png`. Raw metric dump at `/tmp/rhode-audit-v3.json`.

Purpose: everything we need to bring the ISOA collection page (`templates/collection.json` + `sections/pill-navigation.liquid` + `sections/main-collection.liquid`) up to Rhode's proportions, hover behaviour, and mobile grid.

---

## 1 · Pill navigation (already ~matched on desktop)

Rhode's pill row is the horizontal filter chips above the grid. Labels: **Featured · Skin · Lip+Cheek · Sets · On The Go · Award Winners · Shop All**.

### Desktop (1440)
| Property | Value |
|---|---|
| padding | 10px 20px |
| font-size | 17.7px (≈1.1rem) |
| line-height | 21.24px (1.2) |
| border-radius | 80px (full) |
| border | 1px solid `#67645e` |
| background | transparent |
| color | `#67645e` |
| text-transform | uppercase |
| letter-spacing | 0.354px |
| height | 43.2px |

### Mobile (375)
| Property | Value |
|---|---|
| padding | **8px 15px** |
| font-size | **12px** |
| line-height | 14.4px (1.2) |
| border-radius | 80px |
| letter-spacing | 0.24px |
| height | **32.4px** |
| container padding | 0 (edge-swipe row, `flexWrap: nowrap`, hidden scrollbar) |

**Active state**: computed CSS shows same transparent bg + `#67645e` border/color as inactive — the visual "active" cue is either a subtle underline on the swiper-slide-active or is rendered via a pseudo-element the audit didn't pick up. Rhode's mobile also shows a **dark filled** pill for "SHOP ALL" in the swipe row — so an active pill IS `background: #67645e` + `color: #fff` on this variant. Treat active = filled dark, inactive = outlined.

**ISOA status right now (after the parallel agent's push):**
- Desktop match ±1px ✓
- Mobile stuck at 42px / 17px font because `sections/pill-navigation.liquid` only exposes one `font_size` setting and its inline mobile CSS caps at `max(13, font_size - 1)`.
- Follow-up (Task #2): let the section take a separate mobile `padding_h_mobile`, `padding_v_mobile`, `font_size_mobile`, `gap_mobile` — or override in `assets/isoua-button-overrides.css` with a media query targeting `.pill-navigation` on `template contains 'collection'`.

---

## 2 · Product grid

### Desktop (1440)
| Property | Value |
|---|---|
| display | grid |
| columns | `431.734px 431.734px 431.75px` (3 col, equal) |
| column-gap | **40px** |
| row-gap | **25px** |
| padding | 0 (grid itself is inset by ~32px via parent) |
| grid rect | left=32.4, right=1407.6, width=1375 |
| card count on page | 40 |

That's 3 columns of `(1375 - 40*2) / 3 = 431.66` — grid math checks out. Rhode's grid does NOT sit on the pill rail — it's ~8px offset from the pill (pill starts at 40, grid starts at 32.4). Close enough to feel unified. **Decision for ISOA: sit the grid at the pill rail (40 → 1400) for consistency with the rest of the site.**

### Mobile (375)
| Property | Value |
|---|---|
| columns | `167.5px 167.5px` (2 col) |
| column-gap | **8px** |
| row-gap | **8px** |
| grid rect | left=16, right=359, width=343 |
| card | 167.5 × 289 (aspect ratio matches desktop) |

Compared to our current ISOA mobile: cards are 155.5px wide with a wildly stretched `padding-inline-start: 14, padding-inline-end: 0` on `main`. Fix by setting `columns_gap_horizontal: 8, columns_gap_vertical: 8, padding-inline-*: 16` symmetric.

---

## 3 · Product card (**the important one**)

Rhode's card is not a stock Shopify `product-card`. Structure:

```html
<article class="Product-card">
  <a href="/products/highlight-milk-01">
    <div class="Product-card-initial">
      <!-- primary product image + category label overlay + "new" badge -->
    </div>
    <div class="u-hidden Product-card-alt">
      <!-- lifestyle/model image + BUY CTA pill -->
    </div>
    <div class="Product-card-info">
      <!-- star rating · title · subtitle · price -->
    </div>
  </a>
</article>
```

### Idle visuals (desktop)
- Card: `border-radius: 12px`, `overflow: hidden`, `padding: 0`, background transparent (the beige/grey comes from the image container inside).
- Image area: light beige/grey (`~#ebe7e2` — matches ISOA's `ss-image-split-row` content_bg).
- **Category label** ("highlight", "bronze", "brush", "soft glam"): large chunky slab-serif, lowercase, top-left, absolutely positioned INSIDE the image area at ~top: 24px, left: 24px. Looks like ~48–60px font size.
- **"new" badge**: filled dark pill top-right, small font, "new" lowercase.
- Product photo centered, occupying middle 60–70% of the tile.
- Aspect ratio of image container: `padding-bottom: 116.1616%` (i.e., 1 : 1.1616 ~ height/width). Natural asset is 1440 × 1673. So it's a portrait 5:5.808 crop.
- **Below the image**, INSIDE the card border-radius: rating stars + `(157)` review count · **HIGHLIGHT MILK** title (uppercase bold) · "Multipurpose luminizer" subtitle · `$28.00` right-aligned price.
- Card total height: 523px @ 431px width (image ~502px + info block ~21px).

### Hover state (desktop only — mobile has no hover)
Trigger: `mouseenter` on `.Product-card`.

1. `.Product-card-initial` transitions `opacity: 1 → 0` and `visibility: visible → hidden`.
2. Simultaneously `.Product-card-alt` fades in (previously had `u-hidden` / display none — now `display: block; opacity: 1`).
3. The alt content is a **completely different image** — a lifestyle / model shot (`highlight-milk-1-hover_1440x.jpg`), not the product.
4. The below-image info block ALSO swaps: rating + title + subtitle + price → replaced by a **single dark-filled BUY pill** reading `BUY [PRODUCT NAME] - $[PRICE]` (e.g., `BUY HIGHLIGHT MILK - $28.00`).
5. Category label + "new" badge stay in place.

**Transition:**
- Duration: **0.7s**
- Easing: **`cubic-bezier(0.76, 0, 0.24, 1)`** ← the same easing we're already using in `sections/ss-targetting-animation.liquid` for the pink text fill on the PDP.
- Property: `opacity` (with `visibility` deferred to the end).

**Implementation strategy for ISOA:**
- Fork Horizon's `_product-card` block into a custom `_product-card--rhode` (or a block-level override on the collection template).
- Two `<img>` layers stacked: default + hover. Default has `opacity: 1`, hover has `opacity: 0`. `.product-card:hover .default { opacity: 0 }`, `.product-card:hover .hover-img { opacity: 1 }`.
- Store the hover image in a metafield `product.metafields.custom.hover_image` OR use the product's 2nd media (`product.media[1]`).
- BUY pill CTA: same absolute-positioned pattern below the image; `opacity: 0` idle, `opacity: 1` on hover. When it appears, hide the rating + title + subtitle + price row.
- Same 0.7s cubic-bezier(.76,0,.24,1) transition to match the PDP language.

### Mobile card (no hover)
On mobile the card is condensed:
- Category label + "new" badge stay top of image.
- Below image: rating + `(157)` · `HIGHLIGHT MILK` · **BUY - $28.00** outlined pill (thin border, no fill).
- Subtitle "Multipurpose luminizer" is dropped.
- Card border-radius 12px, background beige/grey.

So mobile PERMANENTLY shows the BUY pill (outlined, not filled) because there's no hover affordance. Font sizes are considerably smaller.

**Fonts used** (desktop, from computed styles): body inherits Inter-like sans; the chunky category label uses what looks like Rhode's custom slab-serif (probably `PP Neue Machina` or similar) — we already have a similar slab feel on the PDP `ss-targetting-animation` heading. Reuse that font-family variable.

---

## 4 · Hero + surrounding sections

- Hero above the pill nav: single large photo, height ~500px on desktop / 300px on mobile. Overlay text "One of EVERYTHING really good." centered on mobile, right-aligned on desktop. Border-radius on hero image container (rounded corners).
- Below the hero: pill nav → **sort dropdown + product count** row (`Sort: featured` left, `36 products` + grid-density toggle right) → grid.
- No filter facets, no sidebar. Rhode uses **sort + pills** as the only filtering UI.
- Below the grid: footer stripe with newsletter capture.

**Missing on ISOA that we should add:**
- Sort dropdown ("featured" / "price low → high" / etc.) — Horizon `filters` block supports this via `enable_sorting: true` (already on).
- Product count text ("36 products") — Horizon likely renders this too when facets are visible; verify.
- Grid density toggle (2/3 col swap on desktop) — Horizon supports `enable_grid_density`.

---

## 5 · Concrete gap between ISOA and Rhode right now

| Item | ISOA now | Rhode | Fix |
|---|---|---|---|
| Grid cols (1440) | 2 (extra-large cards, 665px) | 3 (431px) | `product_card_size: large` (or explicit 3-col override) |
| Grid col gap desktop | 16 | 40 | `columns_gap_horizontal: 40` |
| Grid row gap desktop | 24 | 25 | keep 24 or bump to 25 |
| Grid cols (375) | 2 (155px, asymmetric padding) | 2 (167.5px, symmetric) | Fix `padding-inline-start: 14` → 0; `columns_gap_horizontal: 8` |
| Card border-radius | 15 (image) / 0 (card) | 12 (card) | Move radius from gallery block to card wrapper (`border_radius: 12` on `_product-card`) |
| Card overflow | (Horizon default) | hidden | Enforce `overflow: hidden` on card |
| Category label overlay | none | HUGE lowercase slab, top-left over image | Custom block or absolute-positioned `<h3>` inside gallery |
| "New" badge top-right | none | filled dark pill | New block on `_product-card-gallery` |
| Hover image swap | none | 0.7s cubic-bezier(.76,0,.24,1) opacity swap | Custom block + product.media[1] |
| Hover BUY pill CTA | none | replaces info row | Custom block |
| Info block (desktop idle) | title + price left | ⭐(157) · TITLE · subtitle · $price | Add rating snippet + subtitle from metafield |
| Info block (mobile) | title + `BUY - RS. 2,49…` (truncates) | ⭐(157) · TITLE · outlined BUY pill | Same structure, shrink font |
| Card background | transparent | beige image tile (~#ebe7e2) | Set `background-color: #ebe7e2` on the image container |

---

## 6 · Concrete action plan (recommended order)

1. **Fix mobile pill nav** (Task #2) — allow separate mobile settings so we hit 32px height / 12px font / 8×15 padding. ~15 min.
2. **Grid + card sizing** — set `product_card_size: large` (3-col at 1440), `columns_gap_horizontal: 40`, and symmetric padding. ~5 min in JSON.
3. **Card visual language** — add card `border-radius: 12`, image background `#ebe7e2`, `overflow: hidden`. New CSS file `assets/collection.css` gated on `template contains 'collection'`. ~20 min.
4. **Category label + "new" badge overlays** — need real product data (category taxonomy + `is_new` metafield). Fork the `_product-card-gallery` block or write a snippet that reads `product.metafields.custom.card_category` and `product.metafields.custom.is_new`. ~1h to wire cleanly.
5. **Hover swap + BUY pill** — the big one. Custom block that renders both the default and hover image, plus a hidden BUY CTA that shows on hover. Uses the 0.7s cubic-bezier(.76,0,.24,1) easing so it stays consistent with the PDP transition language. ~2h.
6. **Sort + product count row** — verify Horizon's `filters` block already renders this; if not, add a small header row above the grid. ~30 min.

---

## 7 · Reference screenshots (in /tmp)

Desktop 1440:
- `rhodev3-1440-top.png` — hero + pill nav + first row of cards
- `rhodev3-1440-full.png` — full page
- `rhodev3-1440-idle.png` — first card, idle
- `rhodev3-1440-hover-t350.png` — mid-transition (transform not visible, opacity mid-fade)
- `rhodev3-1440-hover-settled.png` — hover state fully settled (BUY pill visible)

Mobile 375:
- `rhodev3-375-top.png` — hero + pill row + first two cards
- `rhodev3-375-full.png` — full page
- `rhodev3-375-idle.png` — mobile card layout

Raw JSON: `/tmp/rhode-audit-v3.json`.

---

*Written 2026-07-30. Keep the "hover mechanics" section (§3) load-bearing — that's the single hardest thing to reverse-engineer from screenshots alone.*

---

## 8 · View-source (rhodeskin.com/collections/shop) — exact HTML skeleton

The Rhode Product-card DOM (extracted from live HTML):

```html
<article class="Product-card Section">
  <a href="/products/highlight-milk-01"
     aria-label="highlight highlight milk $28.00 Multipurpose luminizer">

    <!-- LAYER 1 · default image -->
    <div class="Product-card-initial">
      <span class="Image Image--desktop o-placeholder">
        <span style="padding-bottom: 116.16%"></span> <!-- aspect-ratio spacer -->
        <img src="…product-card_medium.jpg" srcset="…" />
      </span>
    </div>

    <!-- LAYER 2 · hover image (starts with u-hidden) -->
    <div class="u-hidden Product-card-alt">
      <span class="Image">
        <span style="padding-bottom: 116.16%"></span>
        <img src="…hover_medium.jpg" srcset="…" />
      </span>
    </div>
  </a>

  <!-- LAYER 3 · content (siblings of <a>, overlaid via CSS) -->
  <div class="Product-card-content Product-card__noStack"
       data-collection-card="highlight milk 01">

    <!-- top-left category label + top-right "new" badge -->
    <div class="Product-card-content-title-wrapper" style="color: #67645e">
      <h2 class="Product-card-content-title u-fontRektorat u-hSize--Medium u-noMargin">
        highlight
      </h2>
      <div class="Product-card-content-badges">
        <span class="ContentBadge u-fontRektorat"
              style="color:#fff; background-color:#67645e">New</span>
      </div>
    </div>

    <!-- bottom info block (rating + title + price + subtitle) -->
    <div class="Product-card-details js-product-details">
      <div data-oke-star-rating>★★★★½ (157)</div>
      <div class="Product-card-title">
        <p class="u-bold u-noMargin">highlight milk</p>
        <p class="u-bold u-noMargin js-currency-check">$28.00</p>
      </div>
      <p class="u-noMargin">Multipurpose luminizer</p>
    </div>
  </div>
</article>
```

### Class-name → responsibility

| Class | Role |
|---|---|
| `Product-card-initial` | default image container, `opacity: 1` idle → `0` hover |
| `Product-card-alt` | hover image container, starts `u-hidden` → `display: block; opacity: 1` on hover |
| `Product-card-content-title-wrapper` | absolutely positioned **top-left/top-right overlay** — category heading + badge |
| `u-fontRektorat` | the chunky slab-serif custom font (Rektorat) used for category labels AND badges. **We reuse the same slab-serif we're already loading for the PDP `ss-targetting-animation` heading.** |
| `Product-card-content-badges` | badge slot top-right of image |
| `Product-card-details` | bottom info row (rating / title / price / subtitle). On hover this gets overlaid by the BUY CTA pill. |
| `Product-card-title` | flex row: product name (left) + price (right) |
| `Product-card-cta`, `Product-card-cta__small` | BUY pill(s) — small variant used on hover state |
| `ContentBadge` | "new" / "only at rhode" pill — filled `background: #67645e`, white text |

### Hover mechanics (confirmed from HTML + earlier live measurement)

- On idle: `.Product-card-initial { opacity: 1 }`, `.Product-card-alt { opacity: 0; visibility: hidden }` (or `u-hidden` class).
- On `.Product-card:hover`:
  - `.Product-card-initial { opacity: 0; visibility: hidden; transition: 0.7s cubic-bezier(0.76, 0, 0.24, 1) }`
  - `.Product-card-alt` reveals with the same easing.
  - `.Product-card-details` (bottom info) fades out and the `.Product-card-cta` **BUY pill** fades in, positioned absolutely at the bottom of the image area, INSIDE the card border-radius.
- The BUY pill on the ISOA build will read **`BUY - $28.00`** (per your instruction — don't repeat the product name, keep it short so the pill fits at any card width).

---

## 9 · Your build requirements (from screenshots + notes)

1. **Idle card, z-index bottom→top**:
   1. Card background (beige `#ebe7e2`) + `border-radius: 12px`.
   2. Product image centered.
   3. Category label (huge slab lowercase) top-left as overlay.
   4. "new" badge top-right as overlay.
   5. Below-image info row: rating stars · **PRODUCT TITLE (larger than Rhode's — you said bigger)** · subtitle (single line) · price (right-aligned).
2. **Hover state (desktop only)**:
   - Second image fades in over the whole image area with 0.7s cubic-bezier(0.76, 0, 0.24, 1).
   - Info row (rating/title/subtitle/price) collapses; a white BUY pill fades in reading `BUY - $28.00` (no product name repetition).
   - Category label + "new" badge stay on top.
3. **Mobile UI**:
   - **2 cards visible in one 375-wide screen** (approx — card ~167px wide, so 2 fit with 8px gap).
   - **No hover**. The BUY pill sits below the info row PERMANENTLY (outlined variant, not filled).
   - Subtitle is dropped on mobile to save vertical space.
4. **Design language (matches rest of ISOA site)**:
   - Foreground color `#67645e`.
   - Rounded corners 12px on card, 80px on all pills (matches header pill + collection nav pills).
   - Slab-serif for category label + badge; body sans for title/subtitle/price.

### Card composition — final spec

Desktop card layout stack (bottom → top):

```
┌───────────────────────────────────── border-radius 12 ─┐
│ ⚪ image container (bg #ebe7e2, aspect ~1:1.16)         │
│   ├─ default image (layer 0, opacity 1 idle → 0 hover) │
│   └─ hover image  (layer 0, opacity 0 idle → 1 hover)  │
│   ├─ category label   ← top: 24, left: 24 (overlay)    │
│   └─ new badge        ← top: 24, right: 24 (overlay)   │
│   └─ BUY pill CTA     ← bottom: 24, opacity 0 → 1      │
│─────────────────────────────────────────────────────────│
│ info block (idle only; hides on hover)                 │
│   ⭐ ⭐ ⭐ ⭐ ½  (157)                                    │
│   PRODUCT TITLE (larger)                    $28.00     │
│   subtitle (single line)                                │
└─────────────────────────────────────────────────────────┘
```

Mobile card (same, minus hover):

```
┌── border-radius 12 ──┐
│ image + label + new  │
│─────────────────────│
│ ⭐ (157)             │
│ PRODUCT TITLE  $28   │
│ ( BUY - $28.00 )     │ ← outlined pill, always visible
└─────────────────────┘
```

---

## 10 · Implementation plan (what I'm about to build)

1. **New snippet** `snippets/isoa-collection-card.liquid` — full Rhode-style card markup, driven by `product` in context. Reads:
   - `product.featured_image` → default image.
   - `product.media[1] || product.metafields.custom.hover_image` → hover image (fallback to featured if no second media).
   - `product.metafields.custom.card_category` → category label text (falls back to `product.type` if empty, then `product.vendor`).
   - `product.metafields.custom.card_subtitle` → subtitle (falls back to `product.metafields.custom.subtitle`).
   - `product.tags contains 'new'` → renders "new" badge.
2. **New CSS** `assets/isoa-collection.css` — card layout, hover transitions, mobile responsive rules. Gated on `template contains 'collection'` via `layout/theme.liquid`.
3. **Modify** `sections/main-collection.liquid` — replace the `content_for 'block', type: '_product-card'` call with `{% render 'isoa-collection-card', product: product %}` (only when we want the Rhode-style; original block is kept as fallback via a section setting `use_isoa_card` defaulting to true).
4. **Update** `templates/collection.json` — tweak grid settings to 3-col desktop, symmetric padding, matching gaps.
5. **Push + Playwright verify** at 1440 and 375, capture idle + hover, measure card sizes.

Screenshots to compare against: `/tmp/rhodev3-1440-idle.png`, `/tmp/rhodev3-1440-hover-settled.png`, `/tmp/rhodev3-375-idle.png`.
