# Spotwear PDP — Rhode reference audit

**Scope:** research only. No PDP Liquid, JSON, CSS, or storefront settings were changed.

**Reference:** [Rhode — spotwear daisy](https://www.rhodeskin.com/products/spotwear-daisy), audited 2026-08-04. Visual reference captures used: `tmp/pdfs/7b48829d-91cf-4672-9ac5-82a392725f0e-{1..5}.png` (1020 × 1320 each).

**Local target:** `templates/product.rhode-product-page.json`, used for Spotwear with `?view=rhode-product-page`. This is the only PDP template in scope; `product.rhode-pdp-v2` is not a valid implementation target.

## Source-page structure

At desktop, Rhode uses a single 40px outer gutter and repeats a 16px two-column gap. The main visual vocabulary is: 10px rounded cards, warm light-grey (`#f1f0ed` family), warm dark-grey typography, thin grey rules, and occasional pink/yellow/orange product accents. The observed sequence is:

1. Header, then two-column product hero.
2. `spotted on you` user-generated-content carousel.
3. Split feature card: “Clinically-proven PATCHES for SPOT CARE on the go.” + basketball image.
4. Ingredients, then the interactive “smaller / flatter / less red” proof section.
5. Three-step Application carousel.
6. “what’s inside” split card.
7. Consumer-study / clinical-results card with portrait.
8. “Take your rhode ON THE GO” selector.
9. Packaging card.
10. Reviews, followed by a centred `SHOW MORE` outline pill.
11. Three-card cross-sell, then the oversized `rhode` wordmark/footer.

The live source currently lists 65 reviews and 4.5/5. These values are dynamic third-party review data: the UI can be cloned, but hard-coding its count or rating would immediately become stale.

## Local implementation map

| Reference area | Local section | Audit state |
| --- | --- | --- |
| Hero | `main` / `product-information` | Present. Content is product/metafield driven, so exact copy and variants depend on Shopify product data. |
| Spotted carousel | `ss_slider_5_m7VKpN` | Present. |
| Clinical feature split | `ss_image_split_row_TniKMq` | Present. |
| Ingredients + proof words | existing ingredients + `ss_targetting_animation_Wqer7m` | Present. |
| Application | `ss_featured_products_4_ycPmw7` | Structure and three source steps are present; source imagery is missing. |
| What’s inside | `section_WUmYw7` | Present. |
| Consumer/clinical results | `rhode_clinical_results_new` | Present structurally, but currently contains unrelated placeholder claims and no portrait image. |
| On-the-go selector | `rhode_pdp_on_the_go` | Present. |
| Packaging | `ss_packaging_cUBeaP` | Present and close in information architecture. |
| Reviews + Show more | none | Missing. |
| Cross-sell | `section_store_featured_collection_6_hnPVwp` | Present but its block content is not yet Rhode-equivalent. |
| Oversized rhode/footer | global footer only | The reference’s large wordmark treatment is missing. |

### Unexpected local section

`rhode_prep_toggle_new` appears directly after the hero. It is not in the corresponding place on Rhode’s reference flow, which proceeds from the hero to `spotted on you`. It should not be styled further until a product/content decision is made: it should either be removed, relocated, or intentionally repurposed. This is a sequencing issue, not a reason to add more CSS.

`ss_image_with_text_15_rAQEaq` is enabled but uses default placeholder content (`Heading 1`, generic store copy). `ss_image_with_text_9EpeQg` is disabled and also retains placeholder copy. Neither should be used as a source of truth for the Rhode results card.

## Recommended four-section implementation scope

These are the four edits with the largest remaining visual and functional fidelity gain. They are intentionally scoped as future work; none was performed for this audit.

### 1. Application — complete media and exact carousel treatment

**Local target:** `ss_featured_products_4_ycPmw7`.

**Reference behaviour:** a three-step carousel with `(01)`, `(02)`, `(03)`, a large image paired with each step, and source copy:

- `For best results, apply to a clean, dry spot.`
- `Wear for 6–8 hours before removing.`
- `rhode trick: Mix and match Spotwear shapes and colors to complement your outfit and glam.`

**Current gap:** all three local slides have correct core copy but blank descriptions and no per-slide imagery. The section was also designed with separate mobile static image settings; those are unpopulated.

**Acceptance criteria:** upload/select one desktop image per slide; upload the three dedicated mobile images; keep 16px column gaps and 10px corners; preserve keyboard-operable next/previous controls; verify that a mobile viewer sees the static media above the copy and no duplicate desktop slide media.

### 2. Consumer study / clinical results — replace the placeholder implementation

**Local target:** `rhode_clinical_results_new`.

**Reference layout:** a left grey card plus right portrait image, each with 10px radius and equal height. The left card begins with `AFTER 8 HOURS` and displays four pink-outline statistics, a study footnote, then two rule-separated disclosure rows.

**Required reference content:**

- `100%` — agreed the patch stayed on all day and felt comfortable to wear
- `100%` — agreed the patch helped absorb excess oil
- `94%` — agreed the patch helped minimize the look of their spot
- `90%` — agreed their spot looked smaller, flatter, and less red
- Consumer-study footnote: 31 subjects, after 8 hours of use
- `consumer study results` and `clinical results` disclosure rows
- Clinical claims: clinically proven to minimize the look of spots; sweatproof for up to 30 minutes and waterproof; 31-subject clinical study after immediate and 8 hours of use

**Current gap:** it instead says `PROVIDES ALL-DAY HYDRATION` and `REDUCES THE APPEARANCE OF REDNESS OVER TIME`, has generic tab bodies, a 53-subject/12-hour footnote, and no selected portrait. Its present pink outlined heading is also not how the source card begins.

**Acceptance criteria:** editable settings/blocks hold all four statistics and both disclosure contents; real portrait selected; collapsed rows support keyboard and maintain correct `aria-expanded`; reference wording and study qualifiers match exactly; no default/placeholder copy remains.

### 3. Reviews — add the full reviews module and `SHOW MORE` control

**Local target:** a new, isolated reviews section located after packaging and before cross-sell.

**Reference layout:** a full-width light-grey rounded pill with rating summary, average-rating label, review count, filter trigger, sort select, review rows, separators, and a centred outline `SHOW MORE` button below the visible rows. Review rows have metadata at left and rating/title/body/“How smaller did your spots look?” scale at right.

**Current gap:** no review section exists in the template. The site should use a Shopify-compatible review provider/data source; the reference is powered by Okendo, so its review content cannot be copied or represented as ISOUA reviews.

**Acceptance criteria:** live ISOUA review data only; no fabricated customer identities, scores, or claims; accessible filters/sort/controls; dynamic count/rating; `SHOW MORE` loads or reveals more actual reviews without a page jump; a graceful empty state.

### 4. End-of-page brand treatment — cross-sell cleanup plus rhode-style wordmark/footer

**Local targets:** `section_store_featured_collection_6_hnPVwp` followed by the global footer, or a dedicated final PDP section immediately before the footer.

**Reference layout:** after reviews, three clean product cards (`prep`, `mist`, `tint`) sit above a very large, edge-to-edge `rhode` wordmark within the footer card. The footer remains a separate information grid below it. The wordmark is a visual brand element, not body text.

**Current gap:** cross-sell exists but its local settings include generic labels (`Store`, `Slide 1`, `Slide 4`) and incomplete product assignment. There is no oversized wordmark treatment.

**Acceptance criteria:** map only real ISOUA products; use final approved product labels/prices/images rather than Rhode names if those products differ; retain the existing global footer’s navigation/legal behaviour; create the wordmark as an accessible decorative SVG/image or an aria-hidden presentation element with no duplicate brand announcement; preserve the shared 40px rail and rounded container.

## What should not be edited in this four-section pass

- The hero, selector, carousel rail, proof-word animation, on-the-go selector, and packaging structure are already represented in the local PDP and should remain out of scope unless a separate visual regression proves otherwise.
- Do not use `product.rhode-pdp-v2.json` or `assets/rhode-pdp-v2.css`.
- Do not “fix” alignment using stacked `!important` rules. The theme’s documented pill rail is 40px at 1440px desktop, with 16px split gaps and 10px card radii.
- Do not change live product facts, reviews, or substantiated clinical claims without the approved source material and legal/brand sign-off.

## Asset and data checklist before implementation

1. Three desktop Application images plus the three mobile static images.
2. One rights-cleared portrait for the results card.
3. Approved study copy/footnotes and legal confirmation for all efficacy claims.
4. Decision on the review provider and whether existing reviews are available.
5. Real ISOUA product mapping for cross-sell.
6. Approved ISOUA wordmark asset and footer content direction.
7. Decision for the out-of-sequence `rhode_prep_toggle_new` section.

## Verification plan for the later implementation

At 1440px: screenshot each of the four sections; measure both edges of every full-width card against the header pill (40px and 1400px); measure every split gap (16px); check 10px radii.

At 375px: confirm image order, no clipped review controls, touch targets at least 44px, and disclosure/filter/sort/Show More behaviour with keyboard and screen-reader semantics. Validate one empty-review state and one populated-review state.
