(() => {
  const banner = document.querySelector('[data-isoa-cookie-banner]');
  if (!banner || !window.Shopify?.loadFeatures) return;

  window.Shopify.loadFeatures([{ name: 'consent-tracking-api', version: '0.1' }], (error) => {
    const privacy = window.Shopify?.customerPrivacy;
    if (error || !privacy) return;

    // The merchant's Shopify banner owns regions where it is configured.
    // This compact theme banner covers visitors outside those regions.
    if (privacy.shouldShowBanner()) return;

    const consent = privacy.currentVisitorConsent();
    if (!['analytics', 'marketing', 'preferences'].some((purpose) => consent[purpose] === '')) return;

    banner.hidden = false;

    function saveConsent(allowed) {
      const buttons = banner.querySelectorAll('button');
      buttons.forEach((button) => { button.disabled = true; });
      privacy.setTrackingConsent({ analytics: allowed, marketing: allowed, preferences: allowed }, () => {
        banner.hidden = true;
        buttons.forEach((button) => { button.disabled = false; });
      });
    }

    banner.querySelector('[data-isoa-cookie-accept]')?.addEventListener('click', () => saveConsent(true));
    banner.querySelector('[data-isoa-cookie-reject]')?.addEventListener('click', () => saveConsent(false));
  });
})();
