(() => {
  const initChecklist = () => {
    document.querySelectorAll('.checklist li').forEach(item => {
      item.addEventListener('click', () => {
        item.classList.toggle('completed');
      });
    });
  };

  const initActiveToc = () => {
    const tocLinks = Array.from(document.querySelectorAll('.toc a'));
    const sections = tocLinks
      .map(link => document.querySelector(link.getAttribute('href')))
      .filter(Boolean);

    if (!tocLinks.length || !sections.length) {
      return;
    }

    const updateActiveToc = () => {
      let activeIndex = -1;
      const scrollPos = window.scrollY + 120;

      for (let i = 0; i < sections.length; i += 1) {
        if (scrollPos >= sections[i].offsetTop) {
          activeIndex = i;
        } else {
          break;
        }
      }

      tocLinks.forEach((link, index) => {
        link.classList.toggle('active', index === activeIndex);
      });
    };

    window.addEventListener('scroll', updateActiveToc, { passive: true });
    updateActiveToc();
  };

  const initMobileHeader = () => {
    const mobileToggle = document.getElementById('mobileToggle');
    const headerNavRow = document.getElementById('headerNavRow');

    if (!mobileToggle || !headerNavRow) {
      return;
    }

    mobileToggle.addEventListener('click', () => {
      mobileToggle.classList.toggle('active');
      headerNavRow.classList.toggle('active');
    });
  };

  const initMobileDropdowns = () => {
    const parentMenuItems = Array.from(document.querySelectorAll('.menu-item-has-children'));

    parentMenuItems.forEach(item => {
      const link = item.querySelector('a');
      const arrow = item.querySelector('.arrow');

      const toggleSubmenu = event => {
        if (window.innerWidth > 1024) {
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

  document.addEventListener('DOMContentLoaded', () => {
    initChecklist();
    initActiveToc();
    initMobileHeader();
    initMobileDropdowns();
  });
})();
