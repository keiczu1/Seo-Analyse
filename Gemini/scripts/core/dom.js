(function() {
  'use strict';

  window.GeminiCore = window.GeminiCore || {};

  window.GeminiCore.qs = function(selector, root) {
    return (root || document).querySelector(selector);
  };

  window.GeminiCore.qsa = function(selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  };
})();
