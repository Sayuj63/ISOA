import { DialogComponent, DialogCloseEvent, DialogOpenEvent } from '@theme/dialog';
import { morphSection } from '@theme/section-renderer';
import { debounce } from '@theme/utilities';

/** How long to wait for the shopper to stop typing before querying. */
const SEARCH_DEBOUNCE_MS = 250;

/** Rows to ask for. The reference shows roughly this many, then scrolls. */
const RESULTS_LIMIT = 10;

/** Placeholders the Liquid copy leaves for the count and the search term. */
const COUNT_TOKEN = '__count__';
const QUERY_TOKEN = '__query__';

/**
 * A custom element that manages the search drawer's predictive results.
 *
 * The idle list is server-rendered and stays on screen until the shopper
 * types; this only takes over from the first keystroke onwards.
 *
 * Results come back as Liquid through the Section Rendering API rather than as
 * JSON from /search/suggest, for two reasons:
 *
 *  - the rows are rendered by the same snippet as the idle list
 *    (snippets/isoa-search-drawer-product.liquid), so the two states cannot
 *    drift apart, and
 *  - nothing the shopper types is ever concatenated into markup. The term
 *    reaches the page only as a `q` query parameter, and comes back only
 *    through Liquid's own escaping, so there is no path from input to HTML.
 *
 * @extends {DialogComponent}
 */
class SearchDrawerComponent extends DialogComponent {
  /** @type {AbortController | null} */
  #abortController = null;

  /**
   * The idle list, captured just before it is first replaced so that clearing
   * the field can put it back with no round trip.
   * @type {string | null}
   */
  #idleResultsHTML = null;

  /**
   * Whatever opened the drawer, so focus can go back to it on close. Captured
   * on pointerdown: by the time `dialog:open` fires, showModal() has already
   * moved focus into the dialog, so the trigger is no longer activeElement.
   * @type {Element | null}
   */
  #trigger = null;

  #debouncedRender = debounce((term) => this.#render(term), SEARCH_DEBOUNCE_MS);

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener(DialogOpenEvent.eventName, this.#handleOpen);
    this.addEventListener(DialogCloseEvent.eventName, this.#handleClose);
    this.addEventListener('input', this.#handleInput);
    document.addEventListener('pointerdown', this.#rememberTrigger, true);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener(DialogOpenEvent.eventName, this.#handleOpen);
    this.removeEventListener(DialogCloseEvent.eventName, this.#handleClose);
    this.removeEventListener('input', this.#handleInput);
    document.removeEventListener('pointerdown', this.#rememberTrigger, true);
    this.#abortController?.abort();
  }

  /**
   * The native <dialog> already traps focus; this only puts the caret in the
   * field the drawer exists for.
   */
  #handleOpen = () => {
    this.refs.searchInput?.focus?.({ preventScroll: true });
  };

  /**
   * Reopens on the idle list rather than on the last search, so the drawer
   * always starts from the same place.
   */
  #handleClose = () => {
    this.#abortController?.abort();
    this.#abortController = null;

    const input = this.refs.searchInput;
    if (input) input.value = '';
    this.#showIdleResults();

    const trigger = this.#trigger;
    if (trigger instanceof HTMLElement && trigger.isConnected) {
      trigger.focus({ preventScroll: true });
    }
  };

  #rememberTrigger = (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const trigger = target.closest('a, button');
    // Ignore anything inside the drawer itself — the close button and the
    // product rows are not what should receive focus back.
    if (trigger && !this.contains(trigger)) this.#trigger = trigger;
  };

  #handleInput = (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input !== this.refs.searchInput) return;

    this.#debouncedRender(input.value.trim());
  };

  /**
   * Puts the captured idle list back. Safe to call when nothing was captured
   * yet, in which case the server-rendered list is already on screen.
   */
  #showIdleResults() {
    const results = this.refs.searchResults;
    if (!(results instanceof HTMLElement)) return;

    if (this.#idleResultsHTML !== null) results.innerHTML = this.#idleResultsHTML;

    this.#setBusy(false);
    this.#announce(0, '');
  }

  /**
   * @param {string} term
   */
  async #render(term) {
    const results = this.refs.searchResults;
    const sectionId = this.dataset.sectionId;
    if (!(results instanceof HTMLElement) || !sectionId) return;

    // Capture the idle list before the first query replaces it.
    if (this.#idleResultsHTML === null) this.#idleResultsHTML = results.innerHTML;

    this.#abortController?.abort();
    this.#abortController = null;

    if (!term) {
      this.#showIdleResults();
      return;
    }

    const abortController = new AbortController();
    this.#abortController = abortController;

    const url = new URL(Theme.routes.predictive_search_url, window.location.origin);
    url.searchParams.set('q', term);
    url.searchParams.set('resources[type]', 'product');
    url.searchParams.set('resources[limit]', String(RESULTS_LIMIT));
    url.searchParams.set('resources[options][unavailable_products]', 'last');
    url.searchParams.set('section_id', sectionId);

    this.#setBusy(true);

    try {
      const response = await fetch(url, {
        signal: abortController.signal,
        headers: { Accept: 'text/html' },
      });

      if (!response.ok) throw new Error(`Search request failed: ${response.status}`);

      const html = await response.text();

      // A newer keystroke landed while this was in flight. Dropping the
      // markup here is what stops stale results overwriting fresh ones — the
      // renderer below is the only writer, so the abort is the write guard.
      if (abortController.signal.aborted) return;

      await morphSection(sectionId, html, 'hydration');

      if (abortController.signal.aborted) return;

      this.#announce(results.querySelectorAll('[data-search-result]').length, term);
    } catch (error) {
      if (abortController.signal.aborted || error?.name === 'AbortError') return;
      console.error(error);
    } finally {
      // Only the newest request clears the spinner; a superseded one must not
      // report the drawer as settled while its replacement is still running.
      if (this.#abortController === abortController) {
        this.#abortController = null;
        this.#setBusy(false);
      }
    }
  }

  /**
   * @param {boolean} busy
   */
  #setBusy(busy) {
    const results = this.refs.searchResults;
    if (!(results instanceof HTMLElement)) return;

    results.setAttribute('aria-busy', String(busy));
  }

  /**
   * Announces the result count through the drawer's one stable live region.
   * The copy is Liquid's, so it stays translatable; the term is substituted
   * into a text node rather than into markup, so it is never parsed as HTML.
   *
   * @param {number} count
   * @param {string} term
   */
  #announce(count, term) {
    const status = this.refs.searchStatus;
    if (!(status instanceof HTMLElement)) return;

    if (!term) {
      status.textContent = '';
      return;
    }

    const template = count > 0 ? this.dataset.statusResults : this.dataset.statusEmpty;
    status.textContent = template
      ? template.replace(COUNT_TOKEN, String(count)).replace(QUERY_TOKEN, term)
      : '';
  }
}

if (!customElements.get('isoa-search-drawer-component')) {
  customElements.define('isoa-search-drawer-component', SearchDrawerComponent);
}
