(function() {
  'use strict';

  window.GeminiComponents = window.GeminiComponents || {};

  window.GeminiComponents.initChecklistToggle = function() {
    const qsa = window.GeminiCore?.qsa || ((selector, root) => Array.from((root || document).querySelectorAll(selector)));

    qsa('.checklist li').forEach(item => {
      if (item.dataset.checklistBound) {
        return;
      }
      item.dataset.checklistBound = 'true';
      item.addEventListener('click', () => {
        item.classList.toggle('completed');
      });
    });
  };
})();
