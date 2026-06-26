window.GeminiComponents?.initChecklistToggle?.();
window.GeminiComponents?.initTocScrollSpy?.();
window.GeminiComponents?.initMobileNav?.();


  // Filters & Search & Sorter Engine
  const filterButtons = document.querySelectorAll('.filter-btn');
  const tagCloudTags = document.querySelectorAll('#tagCloud .sidebar-tag');
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  const articleGrid = document.getElementById('articleGrid');
  const loadMoreBtn = document.getElementById('loadMoreBtn');

  let currentFilter = 'all';
  let searchQuery = '';
  let sortBy = 'popular';

  // Apply filters, search and sort
  function updateGrid() {
    const cards = Array.from(articleGrid.querySelectorAll('.relink-card'));

    let visibleCount = 0;

    cards.forEach(card => {
      const cardTags = card.getAttribute('data-tags') ? card.getAttribute('data-tags').split(' ') : [];
      const titleText = card.querySelector('.relink-card-title').textContent.toLowerCase();
      const descText = card.querySelector('p').textContent.toLowerCase();

      const matchesFilter = (currentFilter === 'all' || cardTags.includes(currentFilter));
      const matchesSearch = (searchQuery === '' || titleText.includes(searchQuery) || descText.includes(searchQuery));

      if (matchesFilter && matchesSearch) {
        card.classList.remove('hidden-card');
        visibleCount++;
      } else {
        card.classList.add('hidden-card');
      }
    });

    // Sort visible cards in the DOM
    const sortedCards = cards.sort((a, b) => {
      if (sortBy === 'popular') {
        const popA = parseInt(a.getAttribute('data-popular') || '0', 10);
        const popB = parseInt(b.getAttribute('data-popular') || '0', 10);
        return popB - popA; // Descending
      } else {
        const dateA = new Date(a.getAttribute('data-date') || '2000-01-01');
        const dateB = new Date(b.getAttribute('data-date') || '2000-01-01');
        return dateB - dateA; // Descending (newest first)
      }
    });

    // Re-append sorted cards
    sortedCards.forEach(card => articleGrid.appendChild(card));

    // Update count labels
    document.getElementById('materialsCount').textContent = `Всего материалов: 50+ (отфильтровано ${visibleCount})`;

    // Synchronize filters in tab bar and tags
    filterButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-filter') === currentFilter);
    });
    tagCloudTags.forEach(tag => {
      tag.classList.toggle('active', tag.getAttribute('data-tag') === currentFilter);
    });
  }

  // Bind Filter Buttons (Tabs)
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      currentFilter = btn.getAttribute('data-filter');
      updateGrid();
    });
  });

  // Bind Sidebar Tag Cloud
  tagCloudTags.forEach(tag => {
    tag.addEventListener('click', () => {
      currentFilter = tag.getAttribute('data-tag');
      updateGrid();
    });
  });

  // Bind Search Input
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    updateGrid();
  });

  // Bind Sort Dropdown
  sortSelect.addEventListener('change', (e) => {
    sortBy = e.target.value;
    updateGrid();
  });

  // Simulated Additional Cards Database (to append when clicking 'Load More')
  const simulatedDB = [
    {
      title: "Как расторгнуть брак, если супруг находится за границей",
      desc: "Особенности развода в РФ при нахождении ответчика в другой стране. Дистанционное ведение дел, доверенности, апостили и легализация.",
      tags: "court",
      date: "2026-04-25",
      popular: 55,
      readTime: "~9 мин"
    },
    {
      title: "Раздел долгов и кредитов супругов при разводе",
      desc: "Как суд распределяет совместные долговые обязательства, потребительские кредиты и ипотеку. Доказательство траты средств на нужды семьи.",
      tags: "property",
      date: "2026-04-20",
      popular: 50,
      readTime: "~11 мин"
    },
    {
      title: "Соглашение о выплате алиментов: как оформить у нотариуса",
      desc: "Преимущества и порядок заключения соглашения об уплате алиментов. Минимальные размеры платежей, индексация и юридическая сила договора.",
      tags: "children",
      date: "2026-04-15",
      popular: 48,
      readTime: "~8 мин"
    },
    {
      title: "Развод через МФЦ: в каких случаях это возможно в 2026 году",
      desc: "Взаимодействие центров Мои Документы с органами ЗАГС. Пошаговые действия для подачи совместного заявления и выдачи свидетельства.",
      tags: "zags",
      date: "2026-04-10",
      popular: 45,
      readTime: "~6 мин"
    },
    {
      title: "Признание брака недействительным: основания и последствия",
      desc: "Чем недействительность брака отличается от развода. Фиктивный брак, сокрытие болезней, двоеженство и последствия признания брака ничтожным.",
      tags: "court",
      date: "2026-04-05",
      popular: 40,
      readTime: "~12 мин"
    },
    {
      title: "Как оспорить решение суда о разводе: сроки и подача жалобы",
      desc: "Апелляционный порядок обжалования решений мировых и районных судов. Сроки подачи, госпошлины и порядок рассмотрения дела.",
      tags: "court",
      date: "2026-03-28",
      popular: 35,
      readTime: "~10 мин"
    }
  ];

  // Bind Load More Button (Simulates loading more materials from a pool of 50)
  loadMoreBtn.addEventListener('click', () => {
    loadMoreBtn.classList.add('is-loading');
    loadMoreBtn.disabled = true;

    // Simulate ajax call (600ms delay)
    setTimeout(() => {
      simulatedDB.forEach(item => {
        const cardHTML = `
          <a href="#" class="relink-card is-appearing" data-tags="${item.tags}" data-date="${item.date}" data-popular="${item.popular}">
            <div class="relink-content">
              <div class="relink-header">
                <span class="relink-bullet"></span>
                <span class="relink-tag">${item.tags === 'court' ? 'Через суд' : item.tags === 'zags' ? 'Через ЗАГС' : item.tags === 'children' ? 'Алименты · Дети' : 'Раздел имущества'}</span>
              </div>
              <h3 class="relink-card-title">${item.title}</h3>
              <p class="category-article-desc">${item.desc}</p>
              <div class="article-meta-info">
                <span>Обновлено: ${item.date.split('-').reverse().join('.')}</span>
                <span class="article-read-time">
                  <svg class="article-read-time-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  ${item.readTime}
                </span>
              </div>
            </div>
          </a>
        `;

        // Append card
        articleGrid.insertAdjacentHTML('beforeend', cardHTML);
      });

      // Animate append
      const newCards = articleGrid.querySelectorAll('.relink-card.is-appearing');
      newCards.forEach((c, idx) => {
        setTimeout(() => {
          c.classList.remove('is-appearing');
          c.classList.add('is-visible');
        }, idx * 80);
      });

      // Update counters & UI
      loadMoreBtn.classList.remove('is-loading');
      loadMoreBtn.classList.add('is-loaded');
      loadMoreBtn.querySelector('span').textContent = 'Все 50+ материалов загружены';
      loadMoreBtn.disabled = true;

      updateGrid();
    }, 600);
  });

  // Initial render setup
  updateGrid();
