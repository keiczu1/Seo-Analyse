(function() {
  'use strict';

  window.GeminiMedia = window.GeminiMedia || {};

  window.GeminiMedia.breakpoints = {
    mobileNav: 1024,
    tablet: 768,
    phone: 576,
    narrow: 390
  };

  window.GeminiMedia.isMobileNav = function() {
    return window.innerWidth <= window.GeminiMedia.breakpoints.mobileNav;
  };
})();
