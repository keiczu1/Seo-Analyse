(function() {
  'use strict';

  window.GeminiComponents?.initMobileNav?.();

  const mobileToggle = document.getElementById('mobileToggle');
  const headerNavRow = document.getElementById('headerNavRow');

  // ── Dynamic Phone Schedule (Card B) ──
  const updateCardBSchedule = () => {
    const scheduleTextEl = document.querySelector('#cardBSchedule .hp-schedule-text');
    if (scheduleTextEl) {
      const now = new Date();
      const hours = now.getHours();
      if (hours >= 8 && hours < 21) {
        scheduleTextEl.textContent = 'Прием заявок 24/7. Обработка до 21:00';
      } else {
        scheduleTextEl.textContent = 'Прием заявок 24/7. Обработка начнется в 08:00';
      }
    }
  };
  updateCardBSchedule();

  // ── GeoIP City Detection with Fallback ──
  const initGeoIP = () => {
    const kickerEl = document.querySelector('.hp-hero-kicker');
    if (!kickerEl) return;
    if (!/^https?:$/.test(window.location.protocol)) return;

    fetch('https://ipwho.is/?lang=ru')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.success !== false && data.country_code === 'RU' && data.city) {
          kickerEl.textContent = `Юридическая помощь в г. ${data.city}`;
        }
      })
      .catch(() => {
        // Keep the default federal kicker when GeoIP is unavailable.
      });
  };
  initGeoIP();

  // ── Lawyers Thematic Filtering ──
  const initCategoryFiltering = () => {
    const categoryCards = document.querySelectorAll('.hp-category-card');
    const lawyerCards = document.querySelectorAll('.hp-lawyer-card');

    categoryCards.forEach(card => {
      card.addEventListener('mouseenter', () => {
        const cat = card.getAttribute('data-category');
        if (!cat) return;
        lawyerCards.forEach(lawyer => {
          const categoriesStr = lawyer.getAttribute('data-categories') || '';
          const categories = categoriesStr.split(' ');
          if (categories.includes(cat)) {
            lawyer.classList.remove('faded');
            lawyer.classList.add('highlighted-match');
          } else {
            lawyer.classList.add('faded');
            lawyer.classList.remove('highlighted-match');
          }
        });
      });

      card.addEventListener('mouseleave', () => {
        lawyerCards.forEach(lawyer => {
          lawyer.classList.remove('faded');
          lawyer.classList.remove('highlighted-match');
        });
      });
    });
  };
  initCategoryFiltering();

  // ── Interactive Checklist Generator ──
  const initInteractiveChecklist = () => {
    const dropdown = document.getElementById('prepCategoryDropdown');
    const container = document.getElementById('prepChecklistContainer');
    if (!dropdown || !container) return;

    const trigger = dropdown.querySelector('.hp-custom-select-trigger');
    const textSpan = dropdown.querySelector('.hp-custom-select-text');
    const optionsList = dropdown.querySelectorAll('.hp-custom-option');

    // Toggle dropdown open/close
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });

    // Close when clicking outside
    document.addEventListener('click', () => {
      dropdown.classList.remove('open');
    });

    const checklistsData = {
      general: [
        { title: "Сформулируйте основной вопрос", desc: "Четко определите, какого именно юридического результата или ответа вы хотите достичь." },
        { title: "Подготовьте хронологию и даты", desc: "Запишите последовательность ключевых событий, чтобы не упустить важные детали во время разговора." },
        { title: "Укажите ваш регион", desc: "В разных субъектах РФ законодательство и судебная практика могут иметь существенные различия." },
        { title: "Опишите предпринятые действия", desc: "Расскажите, направлялись ли претензии, жалобы, запросы в ведомства или судебные иски." },
        { title: "Подготовьте названия документов", desc: "Составьте список имеющихся договоров, соглашений, свидетельств или официальных отказов госорганов." }
      ],
      family: [
        { title: "Свидетельство о браке", desc: "Оригинал понадобится для подачи иска о разводе в суд." },
        { title: "Свидетельства о рождении детей", desc: "Копии для подтверждения наличия несовершеннолетних общих детей." },
        { title: "Справка о доходах (2-НДФЛ)", desc: "Нужна для расчета и взыскания алиментов с супруга." },
        { title: "Документы на ипотеку и имущество", desc: "Кредитный договор, выписки ЕГРН на совместно нажитую квартиру." },
        { title: "Адрес регистрации ответчика", desc: "Необходим для корректного указания территориальной подсудности иска." }
      ],
      debt: [
        { title: "Кредитные договоры", desc: "Договоры с банками, МФО, графики платежей и выписки по счетам." },
        { title: "Судебные приказы", desc: "Если вы получили приказ о взыскании, подготовьте его для отмены в 10-дневный срок." },
        { title: "Справки о доходах за 3 года", desc: "Понадобятся для оценки признаков неплатежеспособности при банкротстве." },
        { title: "Справка о наличии/отсутствии судимости", desc: "Часто запрашивается арбитражными управляющими." },
        { title: "Отказы или претензии кредиторов", desc: "Письменные требования от банков или коллекторских агентств." }
      ],
      auto: [
        { title: "Протокол или постановление ГИБДД", desc: "Официальный документ, фиксирующий обстоятельства дорожного происшествия." },
        { title: "Полис ОСАГО/КАСКО", desc: "Необходим для взаимодействия со страховой компанией." },
        { title: "Фото и видео с места ДТП", desc: "Съемка взаимного расположения машин, повреждений и дорожных знаков." },
        { title: "Акт осмотра ТС и калькуляция ущерба", desc: "Если проводилась независимая экспертиза стоимости ремонта." },
        { title: "Претензия в страховую компанию", desc: "Копия ранее направленного требования об осуществлении выплаты." }
      ],
      realty: [
        { title: "Выписка из ЕГРН", desc: "Подтверждает право собственности, площадь объекта и наличие обременений." },
        { title: "Договор-основание", desc: "Договор купли-продажи, дарения, приватизации или свидетельство о наследстве." },
        { title: "Технический паспорт объекта", desc: "План помещения, необходимый при спорах о перепланировках или границах." },
        { title: "Квитанции об оплате ЖКУ", desc: "Для подтверждения отсутствия долгов при сделках или спорах с УК." },
        { title: "Письменный отказ Росреестра", desc: "Если вам отказали в регистрации права собственности или сделки." }
      ]
    };

    // Progress bar elements
    const progressLabel = document.getElementById('prepProgressLabel');
    const progressPercent = document.getElementById('prepProgressPercent');
    const progressFill = document.getElementById('prepProgressFill');
    const completeBadge = document.getElementById('prepCompleteBadge');

    const updateProgressBar = () => {
      const checkboxes = container.querySelectorAll('.hp-prep-checkbox');
      const total = checkboxes.length;
      const checked = container.querySelectorAll('.hp-prep-checkbox:checked').length;
      const percent = total > 0 ? Math.round((checked / total) * 100) : 0;

      if (progressLabel) progressLabel.textContent = `${checked} из ${total} подготовлено`;
      if (progressPercent) progressPercent.textContent = `${percent}%`;
      if (progressFill) progressFill.style.width = `${percent}%`;
      if (completeBadge) {
        if (percent === 100) {
          completeBadge.classList.add('visible');
        } else {
          completeBadge.classList.remove('visible');
        }
      }
    };

    const renderChecklist = (categoryKey) => {
      const items = checklistsData[categoryKey] || checklistsData.general;
      container.innerHTML = '';

      items.forEach((item, index) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'hp-prep-step-item';

        itemEl.innerHTML = `
          <div class="hp-prep-checkbox-wrapper">
            <input type="checkbox" id="prep-item-${index}" class="hp-prep-checkbox">
          </div>
          <div class="hp-prep-step-content">
            <h3><label for="prep-item-${index}" class="hp-prep-step-label">${item.title}</label></h3>
            <p>${item.desc}</p>
          </div>
        `;

        const checkbox = itemEl.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', () => {
          if (checkbox.checked) {
            itemEl.classList.add('checked');
          } else {
            itemEl.classList.remove('checked');
          }
          updateProgressBar();
        });

        container.appendChild(itemEl);
      });

      // Reset progress bar on category change
      updateProgressBar();
    };

    // Render initially
    renderChecklist('general');

    // Handle option click selection
    optionsList.forEach(option => {
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        const value = option.getAttribute('data-value');
        const text = option.textContent;

        // Update active class
        optionsList.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');

        // Update trigger text
        textSpan.textContent = text;

        // Render checklist
        renderChecklist(value);

        // Close dropdown
        dropdown.classList.remove('open');
      });
    });
  };
  initInteractiveChecklist();

  // Helper for Russian plurals
  const getPluralForm = (number, one, two, five) => {
    let n = Math.abs(number);
    n %= 100;
    if (n >= 5 && n <= 20) {
      return five;
    }
    n %= 10;
    if (n === 1) {
      return one;
    }
    if (n >= 2 && n <= 4) {
      return two;
    }
    return five;
  };

  // ── Dynamic live metrics calculation ──
  const updateLiveMetrics = () => {
    const specialistsEl = document.getElementById('live-specialists-count');
    const timeEl = document.getElementById('live-response-time');
    const specialistsTextEl = document.getElementById('live-specialists-text');
    const timeTextEl = document.getElementById('live-time-text');
    if (!specialistsEl || !timeEl) return;

    const now = new Date();
    const hour = now.getHours();

    let baseSpecialists = 14;
    let baseTime = 8;

    if (hour >= 9 && hour < 18) {
      baseSpecialists = 16 + Math.floor(Math.sin((hour - 9) / 9 * Math.PI) * 6); // 16 to 22
      baseTime = 6 + Math.floor(Math.cos((hour - 9) / 9 * Math.PI) * 2); // 6 to 8 minutes
    } else if (hour >= 18 && hour < 23) {
      baseSpecialists = 10 + Math.floor(Math.sin((hour - 18) / 5 * Math.PI) * 4); // 10 to 14
      baseTime = 8 + Math.floor((hour - 18) * 1.5); // 8 to 15 minutes
    } else {
      baseSpecialists = 4 + Math.floor(Math.sin((hour < 9 ? hour + 1 : hour - 23) / 10 * Math.PI) * 3); // 4 to 7
      baseTime = 12 + Math.floor(Math.random() * 4); // 12 to 16 minutes
    }

    const randomFlippedSp = Math.floor(Math.random() * 3) - 1;
    const randomFlippedTime = Math.floor(Math.random() * 3) - 1;

    const finalSpecialists = Math.max(3, baseSpecialists + randomFlippedSp);
    const finalTime = Math.max(3, baseTime + randomFlippedTime);

    specialistsEl.textContent = finalSpecialists;
    timeEl.textContent = finalTime;

    if (specialistsTextEl) {
      specialistsTextEl.textContent = getPluralForm(finalSpecialists, 'юрист', 'юриста', 'юристов');
    }
    if (timeTextEl) {
      timeTextEl.textContent = getPluralForm(finalTime, 'минута', 'минуты', 'минут');
    }
  };
  updateLiveMetrics();
  setInterval(updateLiveMetrics, 30000);

  // ── Card B Preparation Checklist modal toggle ──
  const prepModal = document.getElementById('prepModal');
  const prepModalTrigger = document.getElementById('cardBPrepLink');
  const prepModalClose = document.getElementById('prepModalClose');

  if (prepModal && prepModalClose) {
    let lastPrepModalFocus = null;

    const closePrepModal = () => {
      prepModal.classList.remove('open');
      document.body.style.overflow = '';
      if (lastPrepModalFocus && typeof lastPrepModalFocus.focus === 'function') {
        lastPrepModalFocus.focus();
      }
    };

    if (prepModalTrigger) {
      prepModalTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        lastPrepModalFocus = document.activeElement;
        prepModal.classList.add('open');
        document.body.style.overflow = 'hidden';
        prepModalClose.focus();
      });
    }

    prepModalClose.addEventListener('click', closePrepModal);
    prepModal.addEventListener('click', (e) => {
      if (e.target === prepModal) {
        closePrepModal();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && prepModal.classList.contains('open')) {
        e.preventDefault();
        closePrepModal();
      }
    });
  }

  // ── Legal info modal toggle ──
  const legalTriggerBtn = document.getElementById('legalTriggerBtn');
  const legalModal = document.getElementById('legalModal');
  const legalModalClose = document.getElementById('legalModalClose');

  if (legalTriggerBtn && legalModal && legalModalClose) {
    legalTriggerBtn.addEventListener('click', (e) => {
      e.preventDefault();
      legalModal.classList.add('open');
      document.body.style.overflow = 'hidden';
    });

    const closeLegalModal = () => {
      legalModal.classList.remove('open');
      document.body.style.overflow = '';
    };

    legalModalClose.addEventListener('click', closeLegalModal);
    legalModal.addEventListener('click', (e) => {
      if (e.target === legalModal) {
        closeLegalModal();
      }
    });
  }

  // ── FAQ accordion (single-open) ──
  const faqItems = document.querySelectorAll('#faq-section .faq-item');
  faqItems.forEach(item => {
    const summary = item.querySelector('summary');
    if (summary) {
      summary.addEventListener('click', () => {
        if (!item.hasAttribute('open')) {
          faqItems.forEach(other => {
            if (other !== item) other.removeAttribute('open');
          });
        }
      });
    }
  });

  // ── Auto-highlight steps sequentially (once-off) ──
  const initStepsHighlight = () => {
    const steps = document.querySelectorAll('.hp-step-item');
    if (steps.length === 0) return;

    let currentIndex = 0;
    let intervalId = null;
    let hasCompletedCycle = false;

    const highlightStep = (index) => {
      steps.forEach((step, idx) => {
        if (idx === index) {
          step.classList.add('active');
        } else {
          step.classList.remove('active');
        }
      });
      currentIndex = index;
    };

    const startCycle = () => {
      if (hasCompletedCycle) return;
      if (intervalId) clearInterval(intervalId);

      intervalId = setInterval(() => {
        const nextIndex = currentIndex + 1;
        if (nextIndex < steps.length) {
          highlightStep(nextIndex);
        } else {
          clearInterval(intervalId);
          hasCompletedCycle = true;
        }
      }, 1000); // Shifting every 1 second
    };

    steps.forEach((step, idx) => {
      step.addEventListener('mouseenter', () => {
        clearInterval(intervalId);
        highlightStep(idx);
      });

      step.addEventListener('mouseleave', () => {
        if (!hasCompletedCycle) {
          startCycle();
        }
      });
    });

    highlightStep(0);
    startCycle();
  };
  initStepsHighlight();

  // Sequential scroll highlight is disabled because checklist is now interactive.

  // ── Intersection Observer: entrance animations ──
  const animElements = document.querySelectorAll('.hp-animate, .hp-reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -20px 0px' });

    animElements.forEach(el => observer.observe(el));
  } else {
    animElements.forEach(el => el.classList.add('visible'));
  }

  // ── Smooth scroll for anchor links ──
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      if (targetId === '#' || targetId.length <= 1) return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Close mobile menu if open
        if (headerNavRow && headerNavRow.classList.contains('active')) {
          if (mobileToggle) mobileToggle.classList.remove('active');
          headerNavRow.classList.remove('active');
        }
      }
    });
  });

  let activeDialogueSessionId = 0;
  const chatState = {
    family: { hasStarted: false, renderedHTML: '', currentMsgIndex: 0, isTyping: false },
    debt: { hasStarted: false, renderedHTML: '', currentMsgIndex: 0, isTyping: false },
    auto: { hasStarted: false, renderedHTML: '', currentMsgIndex: 0, isTyping: false },
    inheritance: { hasStarted: false, renderedHTML: '', currentMsgIndex: 0, isTyping: false }
  };

  // Расчет времени печати на основе количества слов.
  // Средняя скорость ввода человека — около 40 слов в минуту (WPM).
  // Симулируем скорость 160 WPM (в 4 раза быстрее средней, замедлено на 50% по сравнению с предыдущими 240 WPM).
  // 60 000 мс / 160 WPM = 375 мс на слово.
  function calculateTypingTime(text) {
    const wordsCount = text.trim().split(/\s+/).filter(Boolean).length;
    const msPerWord = 375;
    const calculated = wordsCount * msPerWord;
    return Math.max(750, Math.min(2250, calculated)); // Ограничиваем от 0.75 до 2.25 сек
  }



  // Handle Category/Lawyer Card Clicks
  document.querySelectorAll('.hp-category-card, .hp-lawyer-link-ask').forEach(el => {
    el.addEventListener('click', () => {
      const category = el.getAttribute('data-category');
      if (category) {
        sessionStorage.setItem('pendingQuestionCat', category);
      }
    });
  });

  // ── Categories: Collapsible Grid (show 8, hide last 4) ──
  const initCategoriesCollapse = () => {
    const grid = document.getElementById('categoriesGrid');
    const toggleWrap = document.getElementById('categoriesToggleWrap');
    const toggleBtn = document.getElementById('categoriesToggleBtn');
    if (!grid || !toggleBtn) return;

    const allCards = grid.querySelectorAll('.hp-category-card');
    // Hide cards 9-12 (index 8-11)
    allCards.forEach((card, i) => {
      if (i >= 8) card.classList.add('hp-cat-hidden');
    });

    toggleBtn.addEventListener('click', () => {
      const isExpanded = grid.classList.toggle('expanded');
      toggleBtn.classList.toggle('expanded', isExpanded);
      toggleBtn.querySelector('span').textContent = isExpanded
        ? 'Свернуть'
        : 'Показать все 12 направлений';
    });
  };
  initCategoriesCollapse();

  // ── Categories: Search Filter ──
  const initCategoriesSearch = () => {
    const searchInput = document.getElementById('categoriesSearchInput');
    const grid = document.getElementById('categoriesGrid');
    const toggleWrap = document.getElementById('categoriesToggleWrap');
    const toggleBtn = document.getElementById('categoriesToggleBtn');
    const toggleBtnLabel = toggleBtn ? toggleBtn.querySelector('span') : null;
    const collapsedToggleText = toggleBtnLabel ? toggleBtnLabel.textContent : '';
    if (!searchInput || !grid) return;

    const normalizeSearch = (value) => value
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[^a-zа-я0-9]+/gi, ' ')
      .trim();

    const stemSearchToken = (token) => {
      if (token.startsWith('алимент')) return 'алимент';
      if (token.startsWith('затоп')) return 'затоп';
      if (token.startsWith('квартир')) return 'квартир';
      if (token.startsWith('увол')) return 'увол';
      if (token.startsWith('развод')) return 'развод';
      if (token.startsWith('банкрот')) return 'банкрот';
      return token;
    };

    const getSearchTokens = (value) => normalizeSearch(value)
      .split(/\s+/)
      .filter(Boolean)
      .map(stemSearchToken)
      .filter(token => token.length >= 3);

    searchInput.addEventListener('input', () => {
      const query = normalizeSearch(searchInput.value);
      const queryTokens = getSearchTokens(searchInput.value);
      const cards = grid.querySelectorAll('.hp-category-card');

      if (!query) {
        cards.forEach(c => c.classList.remove('hp-cat-no-match'));
        grid.classList.remove('expanded');
        if (toggleWrap) toggleWrap.classList.remove('hidden');
        if (toggleBtn) toggleBtn.classList.remove('expanded');
        if (toggleBtnLabel && collapsedToggleText) toggleBtnLabel.textContent = collapsedToggleText;
        return;
      }

      // When searching, expand all + hide toggle
      grid.classList.add('expanded');
      if (toggleWrap) toggleWrap.classList.add('hidden');

      cards.forEach(card => {
        const text = normalizeSearch(`${card.textContent} ${card.dataset.search || ''}`);
        const textTokens = getSearchTokens(text);
        const isMatch = (query.length >= 3 && text.includes(query)) || (
          queryTokens.length > 0 && queryTokens.every(token =>
            textTokens.includes(token) || textTokens.some(textToken =>
              textToken.length >= 3 && textToken.includes(token)
            )
          )
        );

        if (isMatch) {
          card.classList.remove('hp-cat-no-match');
        } else {
          card.classList.add('hp-cat-no-match');
        }
      });
    });
  };
  initCategoriesSearch();

  // ── Chat Scenario Tabs ──
  // ── Chat Scenario Tabs ──
  const initChatScenarioTabs = () => {
    const tabsContainer = document.getElementById('chatScenarioTabs');
    if (!tabsContainer) return;

    const tabs = tabsContainer.querySelectorAll('.tg-scenario-tab');
    const chatHistory = document.getElementById('tgChatHistory');
    const lawyerNameEl = document.getElementById('tgChatLawyerName');
    const subtitleEl = document.getElementById('tgChatSubtitle');
    const avatarEl = document.querySelector('#hero-form .tg-chat-avatar');
    if (!chatHistory) return;

    // Helper to format timestamps like Telegram (HH:MM)
    function getFormattedTime() {
      const now = new Date();
      return String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    }

    const scenarios = {
      family: {
        lawyer: 'Елена Смирнова',
        subtitle: 'Дежурный юрист по семейному праву (онлайн)',
        avatar: 'assets/images/elena-smirnova.png',
        messages: [
          { from: 'client', text: 'Здравствуйте! Хочу развестись с мужем. Он категорически против. У нас двое детей и ипотечная квартира. С чего мне начать?' },
          { from: 'lawyer', text: 'Здравствуйте! Так как супруг против и есть общие дети, расторжение брака возможно только через суд (ст. 21 СК РФ). Также предстоит решить вопросы проживания детей, алиментов и раздела ипотечной квартиры.' },
          { from: 'client', text: 'А вы можете помочь в моей ситуации? И какая вероятность успешного исхода?' },
          { from: 'lawyer', text: 'Да, конечно, мы можем помочь. У нас большая практика по семейным спорам с ипотекой и детьми. Полностью возьмем на себя оформление документов и ведение дела в суде, чтобы минимизировать ваши контакты с супругом и банком. Вероятность успеха близка к 100%.' },
          { from: 'lawyer', text: 'Для полноценной консультации и составления пошагового плана действий оставьте ваш номер телефона. Оператор перезвонит вам, чтобы уточнить детали и соединить с юристом.' },
          { from: 'client', text: '+7 (999) 000-00-00' },
          { from: 'lawyer', text: 'Принято! Я передал ваш номер телефона дежурному специалисту по семейному праву.' },
          { from: 'lawyer', text: 'Юрист перезвонит вам в течение 10–15 минут. Пожалуйста, держите телефон под рукой. Консультация полностью бесплатная.' },
          { from: 'client', text: 'Спасибо, ожидаю.' }
        ]
      },
      debt: {
        lawyer: 'Алексей Петров',
        subtitle: 'Дежурный юрист по кредитным спорам (онлайн)',
        avatar: 'assets/images/aleksey-petrov.png',
        messages: [
          { from: 'client', text: 'Добрый день! У меня 3 кредита, общий долг около 900 тысяч. Платить нечем, коллекторы звонят каждый день. Что мне делать?' },
          { from: 'lawyer', text: 'Здравствуйте! В вашей ситуации возможно банкротство через МФЦ (внесудебное) — если общий долг от 50 тыс. до 500 тыс., или через суд при сумме свыше 500 тыс. (127-ФЗ).' },
          { from: 'client', text: 'А это правда можно сделать бесплатно через МФЦ?' },
          { from: 'lawyer', text: 'Да, внесудебное банкротство через МФЦ полностью бесплатно. Но для суммы 900 тыс. скорее всего потребуется судебная процедура. Оставьте номер — подробно разберём вашу ситуацию.' },
          { from: 'client', text: '+7 (999) 000-00-00' },
          { from: 'lawyer', text: 'Получено. Направляю ваши данные дежурному юристу по защите прав заемщиков.' },
          { from: 'lawyer', text: 'Специалист свяжется с вами в течение 15 минут для подробного разбора долгов и вариантов их списания. Звонок бесплатный.' },
          { from: 'client', text: 'Хорошо, буду ждать звонка.' }
        ]
      },
      auto: {
        lawyer: 'Дмитрий Носиков',
        subtitle: 'Дежурный юрист по ДТП и страховым спорам (онлайн)',
        avatar: 'assets/images/dmitry-nosikov.png',
        messages: [
          { from: 'client', text: 'Здравствуйте! Попал в ДТП, я не виноват. Страховая выплатила 45 тысяч, а ремонт стоит 180 тысяч. Что делать?' },
          { from: 'lawyer', text: 'Здравствуйте! Вам нужно заказать независимую экспертизу стоимости ремонта. Если разница с выплатой существенная, можно подать досудебную претензию в страховую по 40-ФЗ «Об ОСАГО».' },
          { from: 'client', text: 'А если страховая откажет в доплате?' },
          { from: 'lawyer', text: 'Тогда подаёте иск в суд. В 90% случаев суды встают на сторону пострадавших. Оставьте номер — юрист поможет с претензией и расскажет о перспективах дела.' },
          { from: 'client', text: '+7 (999) 000-00-00' },
          { from: 'lawyer', text: 'Контакты записал. Передаю информацию нашему автоюристу по страховым спорам.' },
          { from: 'lawyer', text: 'Он перезвонит вам через 5–10 минут, чтобы оценить реальный ущерб и рассказать, как получить доплату. Положите телефон рядом.' },
          { from: 'client', text: 'Договорились, на связи.' }
        ]
      },
      inheritance: {
        lawyer: 'Татьяна Козлова',
        subtitle: 'Дежурный юрист по наследственным делам (онлайн)',
        avatar: 'assets/images/tatiana-kozlova.png',
        messages: [
          { from: 'client', text: 'Здравствуйте! Бабушка умерла 4 месяца назад. Мы с братом — наследники, но он уже переоформил квартиру на себя. Законно ли это?' },
          { from: 'lawyer', text: 'Здравствуйте! Если вы не отказывались от наследства, вы имеете равные права с братом (ст. 1141 ГК РФ). Он не мог переоформить квартиру без вашего участия — обратитесь к нотариусу.' },
          { from: 'client', text: 'Но я ещё не подавала заявление нотариусу. Не поздно ли?' },
          { from: 'lawyer', text: 'У вас есть 6 месяцев со дня смерти наследодателя. 4 месяца — ещё есть время. Оставьте номер — юрист поможет с заявлением и защитит ваши права.' },
          { from: 'client', text: '+7 (999) 000-00-00' },
          { from: 'lawyer', text: 'Спасибо. Данные отправлены дежурному специалисту по наследственному правопреемству.' },
          { from: 'lawyer', text: 'Свяжемся с вами в течение 10–15 минут для анализа действий нотариуса и защиты ваших прав на наследство. Всего доброго.' },
          { from: 'client', text: 'Поняла, спасибо!' }
        ]
      }
    };

    const avatarClassByImage = {
      'assets/images/elena-smirnova.png': 'tg-bubble-avatar--elena',
      'assets/images/aleksey-petrov.png': 'tg-bubble-avatar--aleksey',
      'assets/images/dmitry-nosikov.png': 'tg-bubble-avatar--dmitry',
      'assets/images/tatiana-kozlova.png': 'tg-bubble-avatar--tatiana'
    };

    const getScenarioAvatarClass = (scenario) => avatarClassByImage[scenario?.avatar] || 'tg-bubble-avatar--aleksey';
    const setScenarioAvatarClass = (element, scenario) => {
      if (!element) return;
      element.classList.remove(...Object.values(avatarClassByImage));
      element.classList.add(getScenarioAvatarClass(scenario));
    };

    const getCompletedHTML = (key) => {
      const scenario = scenarios[key];
      if (!scenario) return '';
      const time = getFormattedTime();
      let html = '';
      scenario.messages.forEach(msg => {
        if (msg.from === 'lawyer') {
          const avatarClass = getScenarioAvatarClass(scenario);
          html += `<div class="tg-bubble-row lawyer"><div class="tg-bubble-avatar ${avatarClass}"></div><div class="tg-bubble">${msg.text}<span class="tg-bubble-time">${time}</span></div></div>`;
        } else {
          html += `<div class="tg-bubble-row client"><div class="tg-bubble">${msg.text}<span class="tg-bubble-time">${time}</span></div></div>`;
        }
      });
      return html;
    };

    function addMessage(key, from, text) {
      const scenario = scenarios[key];
      const row = document.createElement('div');
      row.className = 'tg-bubble-row ' + from;

      if (from === 'lawyer') {
        const avatar = document.createElement('div');
        avatar.className = `tg-bubble-avatar ${getScenarioAvatarClass(scenario)}`;
        row.appendChild(avatar);
      }

      const bubble = document.createElement('div');
      bubble.className = 'tg-bubble';
      bubble.innerHTML = text + '<span class="tg-bubble-time">' + getFormattedTime() + '</span>';
      row.appendChild(bubble);
      chatHistory.appendChild(row);
      chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    function showTyping(key, from) {
      const scenario = scenarios[key];
      const row = document.createElement('div');
      row.className = 'tg-bubble-row ' + from;
      row.id = 'typing-indicator';

      if (from === 'lawyer') {
        const avatar = document.createElement('div');
        avatar.className = `tg-bubble-avatar ${getScenarioAvatarClass(scenario)}`;
        row.appendChild(avatar);
      }

      const bubble = document.createElement('div');
      bubble.className = from === 'client' ? 'tg-typing-bubble client-typing' : 'tg-typing-bubble';
      bubble.innerHTML = '<span class="tg-typing-dot"></span><span class="tg-typing-dot"></span><span class="tg-typing-dot"></span>';
      row.appendChild(bubble);
      chatHistory.appendChild(row);
      chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    function removeTyping() {
      const el = document.getElementById('typing-indicator');
      if (el) el.remove();
    }

    const playScenario = async (key, startFromIndex = 0, resumeTyping = false) => {
      activeDialogueSessionId++;
      const currentSessionId = activeDialogueSessionId;

      const scenario = scenarios[key];
      if (!scenario) return;

      // Mark as started
      chatState[key].hasStarted = true;

      // Update header info
      if (lawyerNameEl) lawyerNameEl.textContent = scenario.lawyer;
      if (subtitleEl) {
        subtitleEl.textContent = scenario.subtitle;
        subtitleEl.style.color = '';
      }
      setScenarioAvatarClass(avatarEl, scenario);

      // If startFromIndex is 0, clear chat. Otherwise, restore cached HTML.
      if (startFromIndex === 0) {
        chatHistory.innerHTML = '';
      } else {
        chatHistory.innerHTML = chatState[key].renderedHTML || '';
      }
      chatHistory.scrollTop = chatHistory.scrollHeight;

      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      // Play messages starting from startFromIndex
      for (let i = startFromIndex; i < scenario.messages.length; i++) {
        if (currentSessionId !== activeDialogueSessionId) return;

        const msg = scenario.messages[i];

        // Save state before starting typing so if we switch away during delay, we can resume typing
        chatState[key].currentMsgIndex = i;
        chatState[key].renderedHTML = chatHistory.innerHTML;
        chatState[key].isTyping = true;

        // Delay before typing starts (except if we are starting a clean scenario)
        if (i > startFromIndex || resumeTyping) {
          await wait(600);
          if (currentSessionId !== activeDialogueSessionId) return;
        }

        // Show typing indicator
        showTyping(key, msg.from);
        if (msg.from === 'lawyer' && subtitleEl) {
          subtitleEl.textContent = 'печатает...';
          subtitleEl.style.color = '#9ab8db';
        }

        // Wait for typing duration
        const typingDelay = calculateTypingTime(msg.text);
        await wait(typingDelay);
        if (currentSessionId !== activeDialogueSessionId) return;

        // Remove typing and add message
        removeTyping();
        if (msg.from === 'lawyer' && subtitleEl) {
          subtitleEl.textContent = scenario.subtitle;
          subtitleEl.style.color = '';
        }
        addMessage(key, msg.from, msg.text);

        // Save state after message is added
        chatState[key].currentMsgIndex = i + 1;
        chatState[key].renderedHTML = chatHistory.innerHTML;
        chatState[key].isTyping = false;
      }
    };

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        if (tab.classList.contains('active')) return;

        const activeTab = tabsContainer.querySelector('.tg-scenario-tab.active');
        const prevKey = activeTab ? activeTab.dataset.scenario : null;

        // Save state of the tab we are leaving
        if (prevKey) {
          // If we are currently mid-animation or waiting, the state (currentMsgIndex, renderedHTML, isTyping)
          // was already saved inside the playScenario loop right before the action started.
          // However, to ensure perfect consistency, let's also capture the current HTML if the loop has exited or was stopped.
          const isMidAnimation = chatHistory.querySelector('#typing-indicator') ||
                                 chatHistory.querySelector('.tg-typing-bubble') ||
                                 (chatState[prevKey].currentMsgIndex < scenarios[prevKey].messages.length);

          if (!isMidAnimation) {
            // It has finished completely
            chatState[prevKey].currentMsgIndex = scenarios[prevKey].messages.length;
            chatState[prevKey].renderedHTML = chatHistory.innerHTML;
            chatState[prevKey].isTyping = false;
          }
          chatState[prevKey].hasStarted = true;
        }

        const newKey = tab.dataset.scenario;
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        if (chatState[newKey] && chatState[newKey].hasStarted) {
          const startIndex = chatState[newKey].currentMsgIndex;
          const resumeTyping = chatState[newKey].isTyping;
          playScenario(newKey, startIndex, resumeTyping);
        } else {
          playScenario(newKey, 0, false);
        }
      });
    });

    // Run using Intersection Observer when visible, or start immediately
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            playScenario('family', 0, false);
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });
      observer.observe(document.getElementById('hero-form'));
    } else {
      playScenario('family', 0, false);
    }
  };
  initChatScenarioTabs();

})();
