import { DialogComponent, DialogOpenEvent, DialogCloseEvent } from '@theme/dialog';
import { CartAddEvent, CartUpdateEvent } from '@theme/events';
import { fetchConfig, isMobileBreakpoint } from '@theme/utilities';
import { morphSection } from '@theme/section-renderer';

/**
 * A custom element that manages a cart drawer.
 *
 * @typedef {object} Refs
 * @property {HTMLDialogElement} dialog - The dialog element.
 * @property {HTMLElement} [liveRegion] - The live region for cart announcements when dialog is open.
 *
 * @extends {DialogComponent}
 */
class CartDrawerComponent extends DialogComponent {
  /** @type {number} */
  #summaryThreshold = 0.5;

  /** @type {AbortController | null} */
  #historyAbortController = null;

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener(CartAddEvent.eventName, this.#handleCartAdd);
    this.addEventListener(DialogOpenEvent.eventName, this.#updateStickyState);
    this.addEventListener(DialogOpenEvent.eventName, this.#handleHistoryOpen);
    this.addEventListener(DialogCloseEvent.eventName, this.#handleHistoryClose);
    // Delegated from the host rather than bound to the controls themselves:
    // every cart update re-renders the drawer body, so the select and button
    // are replaced nodes. The host survives.
    this.addEventListener('change', this.#handleUpsellVariantChange);
    this.addEventListener('submit', this.#handleUpsellSubmit);

    if (history.state?.cartDrawerOpen) {
      history.replaceState(null, '');
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener(CartAddEvent.eventName, this.#handleCartAdd);
    this.removeEventListener(DialogOpenEvent.eventName, this.#updateStickyState);
    this.removeEventListener(DialogOpenEvent.eventName, this.#handleHistoryOpen);
    this.removeEventListener(DialogCloseEvent.eventName, this.#handleHistoryClose);
    this.removeEventListener('change', this.#handleUpsellVariantChange);
    this.removeEventListener('submit', this.#handleUpsellSubmit);
    this.#historyAbortController?.abort();
  }

  /**
   * Repoints the ADD button at the newly selected upsell variant. Each option
   * carries its own pre-formatted price from Liquid (`| money`), so switching
   * is a text swap and no formatting rule is duplicated in JS.
   * @param {Event} event
   */
  #handleUpsellVariantChange = (event) => {
    const select = event.target;

    if (!(select instanceof HTMLSelectElement) || !select.hasAttribute('data-upsell-select')) return;

    const button = select.closest('.isoa-cd__upsell')?.querySelector('[data-upsell-add]');
    const price = select.selectedOptions[0]?.dataset.price;

    if (button && price) button.textContent = `${button.dataset.labelPrefix ?? ''}${price}`;
  };

  /**
   * Adds the upsell through the Cart AJAX API and re-renders the drawer in
   * place. Left alone, the form's native POST navigates to /cart — the page
   * reload the drawer exists to avoid.
   * @param {Event} event
   */
  #handleUpsellSubmit = async (event) => {
    const form = event.target;

    if (!(form instanceof HTMLFormElement) || !form.hasAttribute('data-upsell-form')) return;

    event.preventDefault();

    const sectionId = this.querySelector('cart-items-component')?.dataset.sectionId;
    const variantId = new FormData(form).get('id');
    const button = form.querySelector('[data-upsell-add]');

    if (!sectionId || !variantId || button?.disabled) return;

    if (button) button.disabled = true;

    try {
      const response = await fetch(
        Theme.routes.cart_add_url,
        fetchConfig('json', {
          body: JSON.stringify({
            items: [{ id: Number(variantId), quantity: 1 }],
            sections: sectionId,
            sections_url: window.location.pathname,
          }),
        })
      );
      const cart = await response.json();

      // /cart/add.js reports failures in the body rather than through the status.
      if (cart.status) throw new Error(cart.description ?? cart.message);

      const html = cart.sections?.[sectionId];
      if (html) await morphSection(sectionId, html, 'hydration', { injectStylesheet: true });

      // /cart/add.js answers with `{items, sections}` only — no cart object — so
      // the new count is read back off the markup the morph just installed, the
      // same hidden `cartItemCount` ref cart-items-component reads.
      const itemCount = Number(this.querySelector('[ref="cartItemCount"]')?.textContent ?? 0);

      // Dispatched from the items component so its own document-level
      // `cart:update` handler ignores it — it only acts on other sources —
      // while the header's cart count still picks the event up.
      this.querySelector('cart-items-component')?.dispatchEvent(
        new CartUpdateEvent(cart, sectionId, {
          itemCount,
          source: 'cart-drawer-upsell',
          sections: cart.sections,
        })
      );
    } catch (error) {
      console.error(error);
      if (button) button.disabled = false;
    }
  };

  #handleHistoryOpen = () => {
    if (!isMobileBreakpoint()) return;

    if (!history.state?.cartDrawerOpen) {
      history.pushState({ cartDrawerOpen: true }, '');
    }

    this.#historyAbortController = new AbortController();
    window.addEventListener('popstate', this.#handlePopState, { signal: this.#historyAbortController.signal });
  };

  #handleHistoryClose = () => {
    this.#historyAbortController?.abort();
    if (history.state?.cartDrawerOpen) {
      history.back();
    }
  };

  #handlePopState = async () => {
    if (this.refs.dialog?.open) {
      this.refs.dialog.style.setProperty('--dialog-drawer-closing-animation', 'none');
      await this.closeDialog();
      this.refs.dialog.style.removeProperty('--dialog-drawer-closing-animation');
    }
  };

  /**
   * Handles cart add events - opens drawer if auto-open and announces count when open.
   * @param {CustomEvent<{ resource?: { item_count?: number } }>} event
   */
  #handleCartAdd = (event) => {
    if (this.hasAttribute('auto-open')) {
      this.showDialog();
    }

    this.#announceCartCount(event.detail.resource?.item_count ?? event.detail.data?.itemCount);
  };

  /**
   * Announces cart count to screen readers when dialog is open.
   * @param {number | undefined} cartCount
   */
  #announceCartCount(cartCount) {
    const liveRegion = /** @type {HTMLElement | undefined} */ (this.refs.liveRegion);
    if (!this.refs.dialog?.open || !liveRegion || cartCount === undefined) return;

    liveRegion.textContent = `${Theme.translations.cart_count}: ${cartCount}`;
  }

  open() {
    this.showDialog();

    /**
     * Close cart drawer when installments CTA is clicked to avoid overlapping dialogs
     */
    customElements.whenDefined('shopify-payment-terms').then(() => {
      const installmentsContent = document.querySelector('shopify-payment-terms')?.shadowRoot;
      const cta = installmentsContent?.querySelector('#shopify-installments-cta');
      cta?.addEventListener('click', this.closeDialog, { once: true });
    });
  }

  close() {
    this.closeDialog();
  }

  #updateStickyState() {
    const { dialog } = /** @type {Refs} */ (this.refs);
    if (!dialog) return;

    // Refs do not cross nested `*-component` boundaries (e.g., `cart-items-component`), so we query within the dialog.
    const content = dialog.querySelector('.cart-drawer__content');
    const summary = dialog.querySelector('.cart-drawer__summary');

    if (!content || !summary) {
      // Ensure the dialog doesn't get stuck in "unsticky" mode when summary disappears (e.g., empty cart).
      dialog.setAttribute('cart-summary-sticky', 'false');
      return;
    }

    const drawerHeight = dialog.getBoundingClientRect().height;
    const summaryHeight = summary.getBoundingClientRect().height;
    const ratio = summaryHeight / drawerHeight;
    dialog.setAttribute('cart-summary-sticky', ratio > this.#summaryThreshold ? 'false' : 'true');
  }
}

if (!customElements.get('cart-drawer-component')) {
  customElements.define('cart-drawer-component', CartDrawerComponent);
}
