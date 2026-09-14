/* ============================================================================
   ISOUA — Auto-attach subtle scroll zoom to every image on the site.
   ----------------------------------------------------------------------------
   Pairs with assets/isoa-image-zoom.css. Change the animation values there,
   not here. This file only handles WHEN each image toggles state.

   State model (one attribute controls everything):
     data-isoa-zoom="entering"  →  below viewport, zoomed-in resting state
     data-isoa-zoom="visible"   →  in viewport, zoomed-out
     data-isoa-zoom="leaving"   →  above viewport (scrolled past), zoomed-in

   Scroll reversibility is automatic: IntersectionObserver fires as the image
   crosses the viewport in either direction, the state flips, and the CSS
   transition handles the reverse animation with the same easing.

   Skip rules — do NOT animate:
     - <img> inside header / navigation / sticky UI (small icons, logos)
     - Anything with [data-no-zoom] on the element or an ancestor
     - Anything smaller than 80x80 (icons, sprites)
   ========================================================================= */

(function () {
  'use strict';

  // Do nothing for reduced-motion users — CSS also enforces this.
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  const SKIP_ANCESTOR_SELECTORS = [
    'header',
    'nav',
    '[class*="header"]',
    '[class*="Header"]',
    '[class*="nav-"]',
    '[class*="menu-"]',
    '[class*="sticky"]',
    '.wsp-whatsapp',
    'aside[class*="rhode-satc"]', // sticky add-to-cart bar
    '[data-no-zoom]',
    'button', // icon buttons
    '.cart-icon',
  ];

  function shouldSkip(el) {
    if (!el || !el.matches) return true;
    // Explicit opt-in overrides all skip gates. Use `data-isoa-zoom-target`
    // for elements that MUST animate (e.g. the big footer logo that's
    // lazy-loaded — its size is 0 during the initial scan, which would
    // otherwise hit the size gate below).
    if (el.hasAttribute('data-isoa-zoom-target')) return false;
    // Size gate — ignore tiny icons/sprites
    const r = el.getBoundingClientRect();
    if (r.width < 80 || r.height < 80) return true;
    // Ancestor gate
    for (const sel of SKIP_ANCESTOR_SELECTORS) {
      try { if (el.closest(sel)) return true; } catch (e) {}
    }
    return false;
  }

  // Single observer instance shared across all images — cheap and lets the
  // browser batch callbacks. threshold 0 fires when the top edge crosses in
  // or out of the viewport.
  const io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      const el = entry.target;
      if (entry.isIntersecting) {
        el.setAttribute('data-isoa-zoom', 'visible');
      } else {
        // Not intersecting — did it exit the top or is it still below?
        const rect = entry.boundingClientRect;
        el.setAttribute(
          'data-isoa-zoom',
          rect.top < 0 ? 'leaving' : 'entering'
        );
      }
    });
  }, {
    // Fire slightly before the image fully enters so the zoom-in reads as it
    // sweeps in, not after. rootMargin negative on bottom means "consider it
    // 'visible' only when it's ~10% inside the viewport."
    rootMargin: '0px 0px -10% 0px',
    threshold: 0
  });

  function attach(el) {
    if (!el || el.dataset.isoaZoomAttached === '1') return;
    if (shouldSkip(el)) return;
    el.dataset.isoaZoomAttached = '1';
    // Initial state — assume below viewport until observer says otherwise.
    // (If it's already above, first callback will correct to "leaving".)
    el.setAttribute('data-isoa-zoom', 'entering');
    io.observe(el);
  }

  function scan(root) {
    (root || document).querySelectorAll(
      'img, [data-isoa-zoom-target]'
    ).forEach(attach);
  }

  // Initial pass — DOM might not be ready if script loaded early.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { scan(); });
  } else {
    scan();
  }

  // Also run after full load, then again after 1s — catches images inserted
  // late by section JS (product-recommendations, slideshow, etc.).
  window.addEventListener('load', function () {
    scan();
    setTimeout(scan, 1000);
  });

  // Watch for dynamically added images (slider clones, ajax swaps, etc.).
  const mo = new MutationObserver(function (muts) {
    muts.forEach(function (m) {
      m.addedNodes.forEach(function (n) {
        if (n.nodeType !== 1) return;
        if (n.tagName === 'IMG' || (n.matches && n.matches('[data-isoa-zoom-target]'))) {
          attach(n);
        }
        if (n.querySelectorAll) {
          n.querySelectorAll('img, [data-isoa-zoom-target]').forEach(attach);
        }
      });
    });
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();
