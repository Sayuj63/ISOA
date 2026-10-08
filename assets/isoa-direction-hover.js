/* ============================================================================
   ISOUA — Direction-aware button hover
   ----------------------------------------------------------------------------
   Pairs with assets/isoa-direction-hover.css. Loaded as a plain (non-module)
   script via snippets/scripts.liquid.

   Detects which edge of a button the cursor crossed and sets --dh-tx / --dh-ty
   CSS custom properties so the ::after fill parks fully off-canvas on that
   edge. Then toggles .dh-active to animate the fill in. On mouseout the exit
   edge drives the vars so the fill slides OUT toward the exit edge.

   Delegates at document.body so dynamically-rendered buttons (quick-add,
   AJAX cart, section rerender, drawer updates) work without re-binding.
   A MutationObserver tags newly-added nodes with .direction-hover.
   ============================================================================ */
(function () {
  'use strict';

  // --- Short-circuit on envs that don't want / can't do the effect --------
  // On touch-first viewports (hover: none) the directional animation adds no
  // value — the simple color flip in isoua-button-overrides.css covers tap
  // feedback. If the user prefers reduced motion, honor that too.
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // --- Whitelist ----------------------------------------------------------
  // Mirrors isoua-button-overrides.css line 228-242. These are the primary
  // pill CTAs already unified by the theme — menus, drawer close, qty +/-,
  // slider arrows, etc. are deliberately NOT in this list (they'd break).
  //
  // '.direction-hover' is also a self-opt-in: adding the class to any
  // element in Liquid or markup picks up the behavior.
  //
  // '.no-direction-hover' is the opt-OUT escape hatch; if a parent or the
  // button itself carries it we skip tagging.
  var SELECTOR = [
    '.shopify-section .hero a.button',
    '.shopify-section .hero a.button-secondary',
    '.shopify-section a[class*="image-with-button-"]',
    '.shopify-section a[class*="image-text-button-"]',
    '.shopify-section [class*="collection-button-"]',
    '.shopify-section [class*="featured-product-button-"]',
    '.shopify-section a[class*="featured-button-"]',
    '.shopify-section [class*="slider-button-"]',
    '.shopify-section .isoua-pill-button',
    '.shopify-section [class*="ai-contact-form-submit-"]',
    '.shopify-section .rh-cta',
    '.shopify-section .rs-cta',
    '.shopify-section .shopify-payment-button__button',
    '.shopify-section .shopify-payment-button__button--unbranded',
    '.shopify-section .product-information .add-to-cart-button',
    // Product card BUY pill — homepage featured collection, PDP cross-sell,
    // collection grid. Always visible on mobile; desktop fades it in on card
    // hover, after which the directional fill triggers on the pill itself.
    '.isoa-rc-cta',
    // Quick-add "Add" / "Choose" buttons on product grid cards.
    '.quick-add__button',
    // PDP sticky add-to-cart bar's ATC button (separate from the
    // product-information ATC and from .rs-cta which is already covered).
    '.sticky-add-to-cart__button',
    '.direction-hover'
  ].join(',');

  var CLS_MARK   = 'direction-hover';
  var CLS_ACTIVE = 'dh-active';
  var OPT_OUT    = 'no-direction-hover';

  // Off-canvas translate for each edge. 101% (not 100%) hides any 1px seam
  // caused by sub-pixel rounding when the layer is parked at the border.
  var EDGE = {
    left:   { tx: '-101%', ty: '0%'    },
    right:  { tx: '101%',  ty: '0%'    },
    top:    { tx: '0%',    ty: '-101%' },
    bottom: { tx: '0%',    ty: '101%'  }
  };

  // --- Direction detection -----------------------------------------------
  // Compute the cursor's distance to each of the four edges of the button
  // rect; the smallest distance is the edge the cursor must have crossed.
  // This is purely geometric — never a function of where the button sits
  // on the page, so a button in the right rail still fires `left` fill
  // when entered from its own left edge.
  function nearestEdge(ev, el) {
    var r = el.getBoundingClientRect();
    var x = ev.clientX - r.left;
    var y = ev.clientY - r.top;
    var d = { left: x, right: r.width - x, top: y, bottom: r.height - y };
    var min = 'left';
    for (var k in d) if (d[k] < d[min]) min = k;
    return min;
  }

  function setEdgeVars(el, edge) {
    var e = EDGE[edge];
    el.style.setProperty('--dh-tx', e.tx);
    el.style.setProperty('--dh-ty', e.ty);
  }

  // --- Enter / leave handlers --------------------------------------------
  function onEnter(ev, btn) {
    var edge = nearestEdge(ev, btn);
    // 1. Freeze transition for one frame so the var update parks the fill
    //    instantly on the entry edge instead of animating across the
    //    button from wherever it last was (left over from a prior exit).
    btn.style.setProperty('--dh-transition', 'none');
    setEdgeVars(btn, edge);
    // 2. Force a layout flush so the parked transform is applied without
    //    a transition before we hand control back to the normal animation.
    void btn.offsetWidth;
    // 3. Clear the transition override and flip on .dh-active in the same
    //    tick. The browser batches these into one style resolution, sees
    //    transition: 0.42s + a new transform target of translate(0, 0), and
    //    animates from the just-parked edge inward.
    btn.style.removeProperty('--dh-transition');
    btn.classList.add(CLS_ACTIVE);
  }

  function onLeave(ev, btn) {
    var edge = nearestEdge(ev, btn);
    // Set the exit-edge off-canvas vars first. .dh-active is still on, so
    // the transform target is still (0, 0) at this instant. Removing the
    // class next flips the target to the new off-canvas position, and the
    // transition animates from (0, 0) outward toward the exit edge.
    setEdgeVars(btn, edge);
    btn.classList.remove(CLS_ACTIVE);
  }

  // --- Delegation --------------------------------------------------------
  // pointerenter/pointerleave do NOT bubble, so delegate with mouseover /
  // mouseout (which do). The relatedTarget check prevents re-firing when
  // the cursor crosses between child elements of the same button.
  document.addEventListener('mouseover', function (ev) {
    var btn = ev.target.closest('.' + CLS_MARK);
    if (!btn) return;
    if (ev.relatedTarget && btn.contains(ev.relatedTarget)) return;
    onEnter(ev, btn);
  });

  document.addEventListener('mouseout', function (ev) {
    var btn = ev.target.closest('.' + CLS_MARK);
    if (!btn) return;
    if (ev.relatedTarget && btn.contains(ev.relatedTarget)) return;
    onLeave(ev, btn);
  });

  // --- Proxy: product card CTAs ------------------------------------------
  // .isoa-rc-cta is a decorative visual pill with pointer-events: none at
  // rest AND on hover (the whole card is one anchor — see rhode-collection-
  // cards.css:218). It never receives its own mouseover events, so route
  // the parent card's mouseover/mouseout to it. nearestEdge projects the
  // cursor coords onto the CTA's rect, so direction stays per-pill accurate
  // (cursor entering the card from the left still fires `left` on the CTA).
  var CARD_SEL = '.isoa-rc-link, .isoa-rc-card';
  document.addEventListener('mouseover', function (ev) {
    var card = ev.target.closest(CARD_SEL);
    if (!card) return;
    if (ev.relatedTarget && card.contains(ev.relatedTarget)) return;
    var cta = card.querySelector('.isoa-rc-cta.' + CLS_MARK);
    if (cta) onEnter(ev, cta);
  });
  document.addEventListener('mouseout', function (ev) {
    var card = ev.target.closest(CARD_SEL);
    if (!card) return;
    if (ev.relatedTarget && card.contains(ev.relatedTarget)) return;
    var cta = card.querySelector('.isoa-rc-cta.' + CLS_MARK);
    if (cta) onLeave(ev, cta);
  });

  // --- Discovery ---------------------------------------------------------
  function tag(root) {
    var scope = root || document;
    if (!scope.querySelectorAll) return;
    var nodes;
    try { nodes = scope.querySelectorAll(SELECTOR); }
    catch (e) { return; } // bad selector in a dynamic insert shouldn't throw
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.classList.contains(CLS_MARK)) continue;
      if (el.classList.contains(OPT_OUT))  continue;
      if (el.closest('.' + OPT_OUT))       continue;
      el.classList.add(CLS_MARK);
    }
  }

  // Initial sweep.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { tag(); });
  } else {
    tag();
  }

  // Live watch for dynamically-inserted buttons (quick-add, AJAX cart,
  // section rerender via Shopify's section-renderer). Scoped to body so
  // we don't react to <head> changes.
  if (window.MutationObserver && document.body) {
    new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var added = mutations[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var n = added[j];
          if (n.nodeType !== 1) continue; // skip text / comment nodes
          // Tag the node itself if it matches, plus any matching descendants.
          if (n.matches && n.matches(SELECTOR) && !n.classList.contains(OPT_OUT)) {
            n.classList.add(CLS_MARK);
          }
          tag(n);
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
  }
})();
