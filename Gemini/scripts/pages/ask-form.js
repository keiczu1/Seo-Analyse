(function() {
    'use strict';

    window.GeminiComponents?.initMobileNav?.();

    // Pre-populate form if sessionStorage has details
    const pendingCat = sessionStorage.getItem('pendingQuestionCat');
    const pendingText = sessionStorage.getItem('pendingQuestionText');

    const categoryEl = document.getElementById('step2Category');
    const textEl = document.getElementById('step2Text');

    if (pendingCat && categoryEl) {
      const options = Array.from(categoryEl.options);
      if (options.some(opt => opt.value === pendingCat)) {
        categoryEl.value = pendingCat;
      }
    }
    if (pendingText && textEl) {
      textEl.value = pendingText;
    }

    // Handle form submission
    const step2Form = document.getElementById('step2Form');
    const cardContainer = document.getElementById('step2Card');

    if (step2Form && cardContainer) {
      step2Form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Clear session data
        sessionStorage.removeItem('pendingQuestionCat');
        sessionStorage.removeItem('pendingQuestionText');

        cardContainer.innerHTML = `
          <div class="step2-success">
            <div class="step2-success-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="32" height="32">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h2>Обращение успешно отправлено!</h2>
            <p>Мы получили ваш вопрос. В течение нескольких часов профильный специалист рассмотрит его и подготовит подробный письменный ответ. Мы направим письменное уведомление на указанный вами Email.</p>
            <a href="index.html" class="ask-success-link">Вернуться на главную</a>
          </div>
        `;
      });
    }
  })();
