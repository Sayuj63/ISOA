/* ============================================================================
   Rhode PDP — mobile gallery progress bar
   ----------------------------------------------------------------------------
   Injects a 2px horizontal progress bar below the mobile product gallery
   and keeps its fill width in sync with the active slide index. Fires on
   Horizon's `slideshow:select` custom event (dispatched by assets/slideshow.js
   on every slide change, whether driven by swipe, click or arrow). Companion
   CSS lives in rhode-pdp.css under the @media (max-width: 749px) block.

   No-op above 749px — the desktop layout keeps the thumbnail column.
   ============================================================================ */
(function () {
  'use strict';

  var MOBILE_QUERY = '(max-width: 749px)';
  var mql = window.matchMedia(MOBILE_QUERY);

  function init() {
    // Only run on PDP (rhode-product-page template) and only on mobile.
    if (!mql.matches) return;
    var mediaWrap = document.querySelector('.product-information__media');
    if (!mediaWrap) return;
    var slideshow = mediaWrap.querySelector('slideshow-component, slideshow-container');
    if (!slideshow) return;

    // Avoid double-injecting if the script runs twice (section rerender, etc.).
    if (mediaWrap.querySelector('.rh-mob-progress')) return;

    // Count slides (slideshow-slide custom elements OR li descendants).
    var slides = slideshow.querySelectorAll('slideshow-slide, [slide-id]');
    var total = slides.length;
    if (total < 2) return; // no bar needed for a single slide

    var bar  = document.createElement('div');
    bar.className = 'rh-mob-progress';
    bar.setAttribute('aria-hidden', 'true');
    var fill = document.createElement('div');
    fill.className = 'rh-mob-progress__fill';
    bar.appendChild(fill);
    mediaWrap.appendChild(bar);

    // Determine active slide index: prefer the custom element's `current`
    // property; fall back to [aria-current] or 0.
    function activeIndex() {
      var sl = mediaWrap.querySelector('slideshow-component');
      if (sl && typeof sl.current === 'number') return sl.current;
      var active = mediaWrap.querySelector('slideshow-slide[aria-current="true"]');
      if (active) {
        return Array.prototype.indexOf.call(slides, active);
      }
      return 0;
    }

    function paint(idx) {
      // Fill = how many slides are "behind the playhead" / total, so the bar
      // reads 1/total on slide 0 (position in a set of N) and 100% on the last.
      var pct = ((idx + 1) / total) * 100;
      fill.style.width = pct + '%';
    }

    paint(activeIndex());

    // Horizon's slideshow fires `slideshow:select` on every change — swipe,
    // thumbnail click, next/prev button. The event bubbles, so a listener on
    // the slideshow element catches all of them.
    slideshow.addEventListener('slideshow:select', function (e) {
      var i = (e.detail && typeof e.detail.index === 'number') ? e.detail.index : activeIndex();
      paint(i);
    });

    // If the viewport crosses the mobile breakpoint, remove the bar so it
    // doesn't linger when the layout flips to desktop. (Re-created on next init.)
    mql.addEventListener && mql.addEventListener('change', function (ev) {
      if (!ev.matches && bar.parentNode) bar.parentNode.removeChild(bar);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  // Re-init on section hot-reload / Shopify's section-rendering API refresh.
  document.addEventListener('shopify:section:load', init);
})();
