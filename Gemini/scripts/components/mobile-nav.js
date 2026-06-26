(function() {
  'use strict';

  window.GeminiComponents = window.GeminiComponents || {};

  window.GeminiComponents.initMobileNav = function() {
    const qsa = window.GeminiCore?.qsa || ((selector, root) => Array.from((root || document).querySelectorAll(selector)));
    const mobileToggle = document.getElementById('mobileToggle');
    const headerNavRow = document.getElementById('headerNavRow');

    if (mobileToggle && headerNavRow && !mobileToggle.dataset.mobileNavBound) {
      mobileToggle.dataset.mobileNavBound = 'true';
      mobileToggle.addEventListener('click', () => {
        mobileToggle.classList.toggle('active');
        headerNavRow.classList.toggle('active');
      });
    }

    const parentMenuItems = qsa('.menu-item-has-children');
    parentMenuItems.forEach(item => {
      if (item.dataset.mobileDropdownBound) {
        return;
      }
      item.dataset.mobileDropdownBound = 'true';

      const link = item.querySelector('a');
      const arrow = item.querySelector('.arrow');

      const toggleSubmenu = event => {
        const isMobileNav = window.GeminiMedia?.isMobileNav ? window.GeminiMedia.isMobileNav() : window.innerWidth <= 1024;
        if (!isMobileNav) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        const isActive = item.classList.contains('active-dropdown');
        parentMenuItems.forEach(otherItem => {
          otherItem.classList.remove('active-dropdown');
        });

        if (!isActive) {
          item.classList.add('active-dropdown');
        }
      };

      if (arrow) {
        arrow.addEventListener('click', toggleSubmenu);
      }

      if (link && link.getAttribute('href') === '#') {
        link.addEventListener('click', toggleSubmenu);
      }
    });
  };
})();
