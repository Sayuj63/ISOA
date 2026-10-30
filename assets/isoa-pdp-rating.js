/* The product_rating metafield writes half stars as U+2BEA, which iOS has no
   glyph for (it draws a box of lines). Swap each one for a plain star that
   CSS paints half filled (.isoa-half-star in rhode-pdp.css). Dynamic sources
   in the template can't take filters with arguments, so this runs here. */
(function () {
  var HALF = '⯪';
  var root = document.querySelector('.product-details');
  if (!root) return;
  var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  var hits = [];
  while (walker.nextNode()) {
    if (walker.currentNode.nodeValue.indexOf(HALF) !== -1) hits.push(walker.currentNode);
  }
  hits.forEach(function (node) {
    var frag = document.createDocumentFragment();
    node.nodeValue.split(HALF).forEach(function (part, i) {
      if (i > 0) {
        var star = document.createElement('span');
        star.className = 'isoa-half-star';
        star.setAttribute('aria-hidden', 'true');
        star.textContent = '★';
        frag.appendChild(star);
      }
      if (part) frag.appendChild(document.createTextNode(part));
    });
    node.parentNode.replaceChild(frag, node);
  });
})();
