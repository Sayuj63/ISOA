import { QuantitySelectorComponent } from '@theme/component-quantity-selector';

/**
 * A custom element that allows the user to select a quantity in the cart.
 * Extends QuantitySelectorComponent but uses absolute max limits instead of effective max.
 * Semantics: "What should the total quantity BE in the cart" vs "How many to ADD to cart"
 *
 * @extends {QuantitySelectorComponent}
 */
class CartQuantitySelectorComponent extends QuantitySelectorComponent {
  /**
   * Gets the effective maximum value for cart quantity selector
   * Cart page: uses absolute max (how much can be in cart total)
   * @returns {number | null} The effective max, or null if no max
   */
  getEffectiveMax() {
    const { max } = this.getCurrentValues();
    return max; // Cart uses absolute max, not max minus cart quantity
  }

  /**
   * In the drawer, decrementing past 1 removes the line instead of clamping at
   * the rule minimum.
   *
   * The reference cart drawer has no separate remove control, so this is the
   * only way to delete an item from it. `cart-items-component` already treats a
   * dispatched quantity of 0 as a removal (component-cart-items.js:63) — it just
   * never receives one, because updateQuantity() clamps to `min`.
   *
   * Scoped to `cart-items-component[data-drawer]`: the cart page keeps its own
   * remove button and its clamping behaviour.
   *
   * @param {Event} event
   */
  decreaseQuantity(event) {
    if (!(event.target instanceof HTMLElement)) return;
    event.preventDefault();

    const { quantityInput } = this.refs;
    const { min, value } = this.getCurrentValues();

    if (this.closest('cart-items-component[data-drawer]') && value <= min) {
      quantityInput.value = '0';
      this.onQuantityChange();
      return;
    }

    super.decreaseQuantity(event);
  }

  /**
   * Updates button states based on current value and limits
   * Cart buttons are always managed client-side, never server-disabled
   */
  updateButtonStates() {
    const { minusButton, plusButton } = this.refs;
    const { min, value } = this.getCurrentValues();
    const effectiveMax = this.getEffectiveMax();

    // Cart buttons are always dynamically managed
    // In the drawer the minus stays live at the minimum, where it removes the
    // line (see decreaseQuantity above) rather than sitting disabled.
    minusButton.disabled =
      this.closest('cart-items-component[data-drawer]') ? false : value <= min;
    plusButton.disabled = effectiveMax !== null && value >= effectiveMax;
  }
}

if (!customElements.get('cart-quantity-selector-component')) {
  customElements.define('cart-quantity-selector-component', CartQuantitySelectorComponent);
}
