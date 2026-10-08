/**
 * Rhode-style desktop mega menu for the SS Header #1 section.
 *
 * Everything is scoped to a single [data-rhode-mm] root (the nav <li> that owns
 * the panel), so the file stays section-agnostic and can be re-initialised from
 * the theme editor without knowing the section id.
 *
 * Open/close is JS-driven rather than pure CSS :hover so the panel can keep a
 * short close delay (moving the pointer across the gap between the nav item and
 * the panel shouldn't dismiss it), and so Escape / focus leaving can close it.
 */
(function () {
  'use strict';

  var DESKTOP_QUERY = '(min-width: 1024px)';
  var CLOSE_DELAY = 150;
  var RESIZE_DEBOUNCE = 150;

  function isDesktop() {
    return window.matchMedia(DESKTOP_QUERY).matches;
  }

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function currentIndex(tabs) {
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].getAttribute('aria-selected') === 'true') return i;
    }
    return 0;
  }

  function moveIndicator(indicator, tab) {
    if (!indicator || !tab) return;
    indicator.style.left = tab.offsetLeft + 'px';
    indicator.style.width = tab.offsetWidth + 'px';
  }

  function rowOf(panelEl) {
    return panelEl ? panelEl.querySelector('[data-rhode-mm-row]') : null;
  }

  function activePanelEl(panel) {
    return panel.querySelector('[data-rhode-mm-tabpanel].is-current');
  }

  function updateArrow(panel) {
    var next = panel.querySelector('[data-rhode-mm-next]');
    var row = rowOf(activePanelEl(panel));
    if (!next) return;
    if (!row) {
      next.hidden = true;
      return;
    }
    var maxScroll = row.scrollWidth - row.clientWidth;
    next.hidden = maxScroll <= 1;
    next.classList.toggle('is-at-end', row.scrollLeft >= maxScroll - 1);
  }

  function initRoot(root) {
    if (root.dataset.rhodeMmReady === 'true') return;

    var panel = root.querySelector('[data-rhode-mm-panel]');
    var trigger = root.querySelector('[data-rhode-mm-trigger]');
    if (!panel || !trigger) return;

    root.dataset.rhodeMmReady = 'true';

    var headerClass = root.getAttribute('data-rhode-mm-header-class');
    var headerRoot = headerClass ? root.closest('.' + headerClass) : null;

    var tabs = Array.prototype.slice.call(panel.querySelectorAll('[data-rhode-mm-tab]'));
    var tabPanels = Array.prototype.slice.call(panel.querySelectorAll('[data-rhode-mm-tabpanel]'));
    var track = panel.querySelector('[data-rhode-mm-track]');
    var indicator = panel.querySelector('[data-rhode-mm-indicator]');
    var next = panel.querySelector('[data-rhode-mm-next]');
    var closeTimer = null;
    var index = currentIndex(tabs);

    function syncHeaderOpen() {
      if (!headerRoot) return;
      // The header marks itself "open" while a menu is showing so, on a
      // transparent header, the nav text/logo swap back to their solid colours
      // against the now-opaque panel. Another nav item's own mega menu keeps it
      // open too, so don't steal the flag from it.
      var parentHovered = !!headerRoot.querySelector('[class*="header-menu-item-parent"]:hover');
      headerRoot.classList.toggle(
        'open',
        panel.classList.contains('is-open') || parentHovered
      );
    }

    function select(newIndex, focusTab) {
      if (!tabs.length) return;
      index = Math.max(0, Math.min(newIndex, tabs.length - 1));

      tabs.forEach(function (tab, i) {
        var on = i === index;
        tab.classList.toggle('is-current', on);
        tab.setAttribute('aria-selected', on ? 'true' : 'false');
        tab.tabIndex = on ? 0 : -1;
      });

      tabPanels.forEach(function (tabPanel, i) {
        var on = i === index;
        tabPanel.classList.toggle('is-current', on);
        tabPanel.setAttribute('aria-hidden', on ? 'false' : 'true');
        if (on) {
          tabPanel.removeAttribute('inert');
        } else {
          tabPanel.setAttribute('inert', '');
        }
      });

      if (track) track.style.transform = 'translate3d(-' + index * 100 + '%, 0, 0)';
      moveIndicator(indicator, tabs[index]);
      updateArrow(panel);
      if (focusTab && tabs[index]) tabs[index].focus();
    }

    /**
     * @param {boolean} [instant] Skip the CSS hover-intent delay. Passed for
     *   keyboard opens only; a pointer hover wants the sheet to wait, which the
     *   CSS does via --rhode-mm-delay.
     */
    function open(instant) {
      if (!isDesktop()) return;
      window.clearTimeout(closeTimer);
      select(index, false);
      panel.classList.toggle('is-open--instant', instant === true);
      panel.classList.add('is-open');
      panel.setAttribute('aria-hidden', 'false');
      trigger.setAttribute('aria-expanded', 'true');
      syncHeaderOpen();
    }

    function close() {
      window.clearTimeout(closeTimer);
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
      trigger.setAttribute('aria-expanded', 'false');
      syncHeaderOpen();
    }

    function scheduleClose() {
      window.clearTimeout(closeTimer);
      closeTimer = window.setTimeout(close, CLOSE_DELAY);
    }

    // Hover. The panel is a DOM descendant of root, so re-entering it cancels
    // the close that the gap between the nav item and the panel would start.
    // Wrapped rather than passed directly because addEventListener would hand
    // open() the event object, which is truthy and would skip the delay.
    root.addEventListener('mouseenter', function () {
      open(false);
    });
    root.addEventListener('mouseleave', scheduleClose);

    // Keyboard: focusing the trigger (or anything in the panel) opens it, so the
    // panel's tabs are reachable with Tab alone. These opens skip the hover
    // delay — the pointer isn't resting anywhere, so there is nothing to debounce.
    root.addEventListener('focusin', function () {
      open(true);
    });
    root.addEventListener('focusout', function (event) {
      if (!root.contains(event.relatedTarget)) close();
    });

    trigger.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        open(true);
        select(index, true);
      }
    });

    // Escape is handled at document level (below) rather than here, so it also
    // works while the panel is open from a hover with focus outside it.

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () {
        select(i, false);
      });
      tab.addEventListener('mouseenter', function () {
        select(i, false);
      });
      tab.addEventListener('keydown', function (event) {
        var target = null;
        if (event.key === 'ArrowRight') target = (i + 1) % tabs.length;
        else if (event.key === 'ArrowLeft') target = (i - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') target = 0;
        else if (event.key === 'End') target = tabs.length - 1;
        if (target === null) return;
        event.preventDefault();
        select(target, true);
      });
    });

    if (next) {
      next.addEventListener('click', function () {
        var row = rowOf(activePanelEl(panel));
        if (!row) return;
        var card = row.firstElementChild;
        var gap = parseFloat(window.getComputedStyle(row).columnGap) || 0;
        var step = card ? card.getBoundingClientRect().width + gap : row.clientWidth;
        row.scrollBy({
          left: step,
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        });
      });
    }

    tabPanels.forEach(function (tabPanel) {
      var row = rowOf(tabPanel);
      if (row) row.addEventListener('scroll', function () { updateArrow(panel); }, { passive: true });
    });

    var resizeTimer;
    window.addEventListener('resize', function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        // The indicator is measured from live layout, so re-measure once the
        // new width has settled (and after the panel switches display at the
        // breakpoint).
        select(index, false);
      }, RESIZE_DEBOUNCE);
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        select(index, false);
      });
    }

    select(index, false);

    // Exposed so the document-level Escape handler can run this root's own
    // close (which also cancels a pending hover-close timer).
    root.rhodeMegaMenuClose = close;
  }

  function initAll(scope) {
    var roots = (scope || document).querySelectorAll('[data-rhode-mm]');
    Array.prototype.forEach.call(roots, initRoot);
  }

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    var openPanel = document.querySelector('[data-rhode-mm-panel].is-open');
    if (!openPanel) return;
    var root = openPanel.closest('[data-rhode-mm]');
    if (!root) return;

    if (typeof root.rhodeMegaMenuClose === 'function') {
      root.rhodeMegaMenuClose();
    } else {
      openPanel.classList.remove('is-open');
      openPanel.setAttribute('aria-hidden', 'true');
    }

    // Return focus to the nav item that owns the panel.
    var trigger = root.querySelector('[data-rhode-mm-trigger]');
    if (trigger) {
      trigger.setAttribute('aria-expanded', 'false');
      if (root.contains(document.activeElement)) trigger.focus();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(); });
  } else {
    initAll();
  }

  if (window.Shopify && window.Shopify.designMode) {
    document.addEventListener('shopify:section:load', function () { initAll(); });
  }
})();
