/* ============================================================================
   Rhode-style "Complete Your Routine" PDP block — cart-aware
   ----------------------------------------------------------------------------
   Scoped to <rhode-cyr> custom elements. Each card has two possible states:

     NOT in cart  → checkbox visible. SELECT ITEMS counts checked boxes and
                    bulk-POSTs them to /cart/add.js.
     IN cart      → checkbox hidden, quantity stepper visible with the current
                    line quantity. +/− fire /cart/change.js and update the
                    stepper in place.

   State is hydrated from /cart.js on connect, and re-hydrated on every
   `cart:updated` event (dispatched after every add / change in this block,
   and anywhere else the theme updates the cart).
   ============================================================================ */
(function () {
  'use strict';

  if (customElements.get('rhode-cyr')) return;

  // Shared cart cache so multiple <rhode-cyr> instances (and quick re-renders
  // during section hot-reload) share one fetch and one source of truth.
  var cartState = { lines: new Map(), itemCount: 0, cart: null, ready: false, inflight: null };

  function fetchCart() {
    if (cartState.inflight) return cartState.inflight;
    cartState.inflight = fetch('/cart.js', { headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : { items: [], item_count: 0 }; })
      .then(function (cart) {
        cartState.lines.clear();
        (cart.items || []).forEach(function (it) {
          cartState.lines.set(String(it.variant_id), it.quantity);
        });
        cartState.cart = cart;
        cartState.itemCount = cart.item_count || 0;
        cartState.ready = true;
        cartState.inflight = null;
        document.dispatchEvent(new CustomEvent('rh-cyr:cart-synced'));
        return cart;
      })
      .catch(function () { cartState.inflight = null; });
    return cartState.inflight;
  }

  function qtyFor(variantId) {
    return cartState.lines.get(String(variantId)) || 0;
  }

  async function changeLine(variantId, newQty) {
    // Shopify's /cart/change.js supports update-by-variant-id via `id:` key.
    // Setting quantity: 0 removes the line.
    var resp = await fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ id: String(variantId), quantity: newQty })
    });
    if (!resp.ok) throw new Error('change failed: ' + resp.status);
    return resp.json();
  }

  async function bulkAdd(items) {
    var resp = await fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ items: items })
    });
    if (!resp.ok) throw new Error('add failed: ' + resp.status);
    return resp.json();
  }

  class RhodeCyr extends HTMLElement {
    connectedCallback() {
      this.addBtn = this.querySelector('[data-rh-cyr-add]');
      this.cards  = this.querySelectorAll('.rh-cyr__card');
      if (!this.addBtn) return;

      this._onCartSync = () => this.syncAllCards();
      document.addEventListener('rh-cyr:cart-synced', this._onCartSync);
      // Pick up cart changes made elsewhere (header cart drawer, product form,
      // native quick-add). Horizon's event name is 'cart:update'. Guard against
      // re-entrant loops: when WE dispatched the event (source='rhode-cyr'),
      // our cart cache is already fresh, so skip the extra fetch.
      this._onCartUpdated = (e) => {
        if (e && e.detail && e.detail.data && e.detail.data.source === 'rhode-cyr') return;
        fetchCart();
      };
      document.addEventListener('cart:update', this._onCartUpdated);

      this.addEventListener('change', (e) => {
        var t = e.target;
        if (!(t instanceof HTMLElement)) return;
        if (t.matches('[data-rh-cyr-variant]')) {
          // Variant switch: update the card's variant id, re-sync in case the
          // newly selected variant is (or isn't) already in cart.
          var card = t.closest('.rh-cyr__card');
          var check = card && card.querySelector('[data-rh-cyr-check]');
          if (check) check.dataset.variantId = t.value;
          this.syncCard(card);
        }
        if (t.matches('[data-rh-cyr-check]')) {
          this.refreshButtonState();
        }
      });

      // Delegate +/− clicks for every card in this element.
      this.addEventListener('click', (e) => {
        var inc = e.target.closest('[data-rh-cyr-inc]');
        var dec = e.target.closest('[data-rh-cyr-dec]');
        if (inc) return this.handleStep(inc.closest('.rh-cyr__card'), +1);
        if (dec) return this.handleStep(dec.closest('.rh-cyr__card'), -1);
      });

      this.addBtn.addEventListener('click', () => this.handleAdd());

      // Initial hydrate.
      if (cartState.ready) this.syncAllCards();
      else fetchCart();
      this.refreshButtonState();
    }

    disconnectedCallback() {
      document.removeEventListener('rh-cyr:cart-synced', this._onCartSync);
      document.removeEventListener('cart:update', this._onCartUpdated);
    }

    // --- card-level sync -------------------------------------------------
    syncCard(card) {
      if (!card) return;
      var check = card.querySelector('[data-rh-cyr-check]');
      if (!check) return;
      var vid = check.dataset.variantId;
      var qty = qtyFor(vid);
      var qtyBox = card.querySelector('[data-rh-cyr-qty]');
      var count  = card.querySelector('[data-rh-cyr-count]');
      var pill   = card.querySelector('[data-rh-cyr-pill]');
      if (qty > 0) {
        card.classList.add('in-cart');
        if (qtyBox) qtyBox.hidden = false;
        if (count)  count.textContent = String(qty);
        if (pill)   pill.hidden = false;
        // In-cart cards shouldn't contribute to SELECT ITEMS; uncheck them.
        if (check.checked) check.checked = false;
      } else {
        card.classList.remove('in-cart');
        if (qtyBox) qtyBox.hidden = true;
        if (pill)   pill.hidden = true;
      }
    }

    syncAllCards() {
      this.cards.forEach((c) => this.syncCard(c));
      this.refreshButtonState();
    }

    // --- SELECT ITEMS footer button --------------------------------------
    getCheckedItems() {
      // Only count cards NOT in cart; in-cart cards use the stepper instead.
      var out = [];
      this.querySelectorAll('.rh-cyr__card:not(.in-cart) [data-rh-cyr-check]:checked').forEach(function (el) {
        var id = parseInt(el.dataset.variantId, 10);
        if (id) out.push({ id: id, quantity: 1 });
      });
      return out;
    }

    refreshButtonState() {
      var items = this.getCheckedItems();
      var n = items.length;
      this.addBtn.disabled = n === 0;
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
        await bulkAdd(items);
        btn.classList.remove('is-adding');
        btn.classList.add('is-added');
        btn.textContent = 'ADDED ✓';
        // Clear checkboxes before re-sync; the newly-added items will swap
        // to the stepper via syncCard().
        this.querySelectorAll('[data-rh-cyr-check]:checked').forEach(function (el) { el.checked = false; });
        await fetchCart(); // re-hydrates and dispatches rh-cyr:cart-synced
        this.notifyCartChanged();
        setTimeout(() => {
          btn.classList.remove('is-added');
          this.refreshButtonState();
        }, 1400);
      } catch (err) {
        btn.classList.remove('is-adding');
        btn.textContent = 'ERROR — RETRY';
        btn.disabled = false;
        console.warn('[rhode-cyr] add failed:', err);
      }
    }

    // --- +/− stepper handler --------------------------------------------
    async handleStep(card, delta) {
      if (!card) return;
      var check = card.querySelector('[data-rh-cyr-check]');
      var count = card.querySelector('[data-rh-cyr-count]');
      if (!check || !count) return;
      var vid     = check.dataset.variantId;
      var current = qtyFor(vid);
      var next    = Math.max(0, current + delta);
      // Optimistic UI — the stepper updates immediately; a failed server call
      // re-syncs from the authoritative cart.js so the count snaps back.
      count.textContent = String(next);
      card.dataset.rhBusy = '1';
      try {
        await changeLine(vid, next);
        await fetchCart();
        this.notifyCartChanged();
      } catch (err) {
        console.warn('[rhode-cyr] change failed:', err);
        await fetchCart();
      } finally {
        delete card.dataset.rhBusy;
      }
    }

    notifyCartChanged() {
      // Horizon's cart-icon.js and cart-items-component.js both listen for
      // 'cart:update' (NOT 'cart:updated' which nothing listens for). The
      // event detail MUST carry { resource: cart, sourceId, data: { itemCount,
      // source } } — cart-icon.js reads itemCount, cart-items-component reads
      // sections[sectionId] (we omit sections so it falls through to a fresh
      // sectionRenderer.renderSection() call that re-fetches the drawer HTML).
      var cart = cartState.cart || { items: [], item_count: 0 };
      var drawerSectionId = document.querySelector('#isoa-cart-drawer cart-items-component')?.dataset?.sectionId
        || document.querySelector('cart-items-component')?.dataset?.sectionId
        || 'rhode-cyr';
      var evt = new CustomEvent('cart:update', {
        bubbles: true,
        detail: {
          resource: cart,
          sourceId: drawerSectionId,
          data: {
            itemCount: cart.item_count || 0,
            source: 'rhode-cyr'
          }
        }
      });
      document.dispatchEvent(evt);

      // Only auto-open the drawer on explicit adds, not on every +/−, so the
      // shopper can rapidly adjust quantity without the drawer slamming open.
      var drawer = document.querySelector('#isoa-cart-drawer');
      if (drawer && this.addBtn.classList.contains('is-added')) {
        drawer.classList.add('is-open');
        document.body.classList.add('isoa-cd-open');
      }
    }
  }

  customElements.define('rhode-cyr', RhodeCyr);
})();
