/* Desktop PDP gallery: a one-second eased slide between images, as on
   rhodeskin.com. Horizon's slideshow scrolls its track with the browser's
   native smooth scroll (~150 ms, reads as a jump), so on this one element we
   swap scrollTo for a timed animation. Snap is lifted while it runs, or the
   browser would re-snap after every frame. Phones keep native swiping. */
(function () {
  var DURATION = 1000;
  var desktop = window.matchMedia('(min-width: 750px)');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  // CSS `ease`, cubic-bezier(0.25, 0.1, 0.25, 1), solved for y at time t.
  function ease(t) {
    var x1 = 0.25, y1 = 0.1, x2 = 0.25, y2 = 1;
    var cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    var cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    var u = t;
    for (var i = 0; i < 6; i++) {
      var x = ((ax * u + bx) * u + cx) * u - t;
      var dx = (3 * ax * u + 2 * bx) * u + cx;
      if (Math.abs(x) < 1e-5 || dx === 0) break;
      u -= x / dx;
    }
    return ((ay * u + by) * u + cy) * u;
  }

  function enhance(track) {
    if (track.dataset.isoaSlide) return;
    track.dataset.isoaSlide = 'true';
    var nativeScrollTo = track.scrollTo.bind(track);
    var frame = 0;

    track.scrollTo = function (options) {
      var smooth = options && typeof options === 'object' && options.behavior === 'smooth';
      if (!smooth || !desktop.matches || reduced.matches || options.left == null) {
        return nativeScrollTo.apply(track, arguments);
      }
      cancelAnimationFrame(frame);
      var from = track.scrollLeft;
      var to = options.left;
      var start = performance.now();
      track.style.scrollSnapType = 'none';
      (function step(now) {
        var t = Math.min(1, (now - start) / DURATION);
        track.scrollLeft = from + (to - from) * ease(t);
        if (t < 1) {
          frame = requestAnimationFrame(step);
        } else {
          track.style.scrollSnapType = '';
        }
      })(start);
    };
  }

  function init() {
    document
      .querySelectorAll('.product-information__media slideshow-slides')
      .forEach(enhance);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  // Horizon re-renders the product section on variant change; re-check for a
  // fresh track at most once per frame.
  var queued = false;
  new MutationObserver(function () {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      init();
    });
  }).observe(document.querySelector('main') || document.body, { childList: true, subtree: true });
})();
