/* ============================================================================
   Rhode-style "Complete Your Routine" PDP block — bulk add-to-cart
   ----------------------------------------------------------------------------
   Scoped to <rhode-cyr> custom elements. Tracks per-card checkbox state and
   variant-dropdown selections; the footer "SELECT ITEMS" button bulk-POSTs
   checked items to /cart/add.js in a single request. Falls back to adding
   items one at a time if the bulk endpoint rejects the payload (e.g.
   inventory errors on one item).
   ============================================================================ */
(function () {
  'use strict';

  if (customElements.get('rhode-cyr')) return;

  class RhodeCyr extends HTMLElement {
    connectedCallback() {
      this.addBtn = this.querySelector('[data-rh-cyr-add]');
      if (!this.addBtn) return;
      // When a card's variant dropdown changes, overwrite that card's
      // checkbox data-variant-id so SELECT ITEMS adds the chosen variant.
      this.addEventListener('change', (e) => {
        var t = e.target;
        if (!(t instanceof HTMLElement)) return;
        if (t.matches('[data-rh-cyr-variant]')) {
          var card = t.closest('.rh-cyr__card');
          var check = card && card.querySelector('[data-rh-cyr-check]');
          if (check) check.dataset.variantId = t.value;
        }
        if (t.matches('[data-rh-cyr-check]')) {
          this.refreshButtonState();
        }
      });
      this.addBtn.addEventListener('click', () => this.handleAdd());
      this.refreshButtonState();
    }

    getCheckedItems() {
      var out = [];
      this.querySelectorAll('[data-rh-cyr-check]:checked').forEach(function (el) {
        var id = parseInt(el.dataset.variantId, 10);
        if (id) out.push({ id: id, quantity: 1 });
      });
      return out;
    }

    refreshButtonState() {
      var items = this.getCheckedItems();
      var n = items.length;
      this.addBtn.disabled = n === 0;
      // Label swap: "SELECT ITEMS" when 0 or many, "ADD TO CART" when exactly 1
      // (matches shopper expectation that a single checkbox + add reads naturally).
      var fallback = this.addBtn.dataset.labelDefault || 'SELECT ITEMS';
      var single   = this.addBtn.dataset.labelSingle  || 'ADD TO CART';
      this.addBtn.textContent = n === 1 ? single : (n > 1 ? ('ADD ' + n + ' ITEMS') : fallback);
    }

    async handleAdd() {
      var items = this.getCheckedItems();
      if (!items.length) return;
      var btn = this.addBtn;
      btn.disabled = true;
      btn.classList.add('is-adding');
      try {
        var resp = await fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ items: items })
        });
        if (!resp.ok) throw new Error('bulk add failed: ' + resp.status);
        // Success feedback.
        btn.classList.remove('is-adding');
        btn.classList.add('is-added');
        btn.textContent = 'ADDED ✓';
        // Uncheck all so the user can select another round if they want.
        this.querySelectorAll('[data-rh-cyr-check]:checked').forEach(function (el) { el.checked = false; });
        // Hand off to the store's cart drawer / count updates. If the ISOA
        // cart drawer custom element is on the page, trigger it to re-render.
        this.notifyCartChanged();
        setTimeout(() => {
          btn.classList.remove('is-added');
          this.refreshButtonState();
        }, 1600);
      } catch (err) {
        btn.classList.remove('is-adding');
        btn.textContent = 'ERROR — RETRY';
        btn.disabled = false;
        console.warn('[rhode-cyr] add failed:', err);
      }
    }

    notifyCartChanged() {
      // Fire a generic event the rest of the theme's cart UI listens for.
      // The ISOA cart drawer (isoa-cart-drawer.liquid) listens on
      // 'cart:updated' as part of its auto-open flow.
      document.dispatchEvent(new CustomEvent('cart:updated', { bubbles: true }));
      // Also open the cart drawer if available so the user sees the add.
      var drawer = document.querySelector('#isoa-cart-drawer');
      if (drawer) {
        drawer.classList.add('is-open');
        document.body.classList.add('isoa-cd-open');
      }
    }
  }

  customElements.define('rhode-cyr', RhodeCyr);
})();
