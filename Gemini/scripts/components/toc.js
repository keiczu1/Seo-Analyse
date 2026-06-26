(function() {
  'use strict';

  window.GeminiComponents = window.GeminiComponents || {};

  function scrollActiveTocLinkIntoView(link) {
    const toc = link.closest('.toc');

    if (!toc) {
      return;
    }

    const tocRect = toc.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    const edgePadding = 12;

    if (toc.scrollHeight > toc.clientHeight + 1) {
      if (linkRect.top < tocRect.top + edgePadding) {
        toc.scrollTop += linkRect.top - tocRect.top - Math.max(edgePadding, (toc.clientHeight - linkRect.height) / 2);
      } else if (linkRect.bottom > tocRect.bottom - edgePadding) {
        toc.scrollTop += linkRect.top - tocRect.top - Math.max(edgePadding, (toc.clientHeight - linkRect.height) / 2);
      }
    }

    if (toc.scrollWidth > toc.clientWidth + 1) {
      if (linkRect.left < tocRect.left + edgePadding) {
        toc.scrollLeft += linkRect.left - tocRect.left - Math.max(edgePadding, (toc.clientWidth - linkRect.width) / 2);
      } else if (linkRect.right > tocRect.right - edgePadding) {
        toc.scrollLeft += linkRect.left - tocRect.left - Math.max(edgePadding, (toc.clientWidth - linkRect.width) / 2);
      }
    }
  }

  window.GeminiComponents.initTocScrollSpy = function() {
    const qsa = window.GeminiCore?.qsa || ((selector, root) => Array.from((root || document).querySelectorAll(selector)));
    const tocLinks = qsa('.toc a');
    if (tocLinks.length === 0) {
      return;
    }

    const sections = tocLinks.map(link => {
      const selector = link.getAttribute('href');
      if (!selector || !selector.startsWith('#')) {
        return null;
      }
      return document.querySelector(selector);
    }).filter(Boolean);

    if (sections.length === 0) {
      return;
    }

    let activeIndexCurrent = -1;

    function updateActiveToc() {
      let activeIndex = -1;
      const scrollPos = window.scrollY + 120;

      for (let i = 0; i < sections.length; i++) {
        if (scrollPos >= sections[i].offsetTop) {
          activeIndex = i;
        } else {
          break;
        }
      }

      tocLinks.forEach((link, index) => {
        link.classList.toggle('active', index === activeIndex);
      });

      if (activeIndex !== activeIndexCurrent) {
        activeIndexCurrent = activeIndex;
        const activeLink = tocLinks[activeIndex];

        if (activeLink) {
          scrollActiveTocLinkIntoView(activeLink);
        }
      }
    }

    window.addEventListener('scroll', updateActiveToc);
    updateActiveToc();
  };
})();
