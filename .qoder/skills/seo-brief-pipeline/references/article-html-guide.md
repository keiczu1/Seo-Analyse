# HTML Article Generation Guide

Правила генерации HTML-статьи из брифа (Stage 4 pipeline).

---

## Базовая структура

```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><!-- из секции 8 брифа --></title>
  <meta name="description" content="<!-- из секции 8 брифа -->">

  <!-- Schema.org JSON-LD -->
  <script type="application/ld+json"><!-- Article schema --></script>
  <script type="application/ld+json"><!-- Типовой schema: HowTo/FAQPage/etc --></script>

  <style>/* inline CSS */</style>
</head>
<body>
  <nav class="breadcrumbs"><!-- хлебные крошки --></nav>
  <nav class="toc"><!-- sticky навигация по секциям --></nav>
  <div class="meta"><!-- дата, время чтения --></div>
  <h1><!-- из секции 8 --></h1>
  <!-- первый экран из секции 8 -->
  <!-- секции H2 из контент-плана -->
  <!-- FAQ accordion -->
  <!-- дисклеймер (для YMYL) -->
</body>
</html>
```

---

## Канонический UI kit

Для этого проекта `Gemini/article-ui-kit.html` — источник правды для оформления HTML-статей. Все новые статьи должны использовать его семантику, классы, порядок блоков и визуальные паттерны.

Правила:
- Перед сборкой HTML открыть `Gemini/article-ui-kit.html` и сверить нужные компоненты
- Не создавать одноразовые классы, если в UI kit уже есть подходящий блок
- Если нужен новый повторяемый паттерн, сначала добавить его в UI kit и только потом использовать в статье
- Не переносить в публичную статью служебные элементы UI kit: `.kit-*`, демо-подписи, таблицы правил, пояснения для разработчика
- Публичная статья использует реальные компоненты из UI kit: `.meta`, `.summary-card`, `.choice-cards`, `.callout-*`, `.risk-table`, `.court-practice`, `.steps`, `.checklist`, `.doc-template`, `.doc-download-block`, `.faq-item`, `.law-base`, `.auth-v9-author-card`, `.auth-v9-reviewer-card`, `.relink-block`, `.relink-card`, `.disclaimer`

### Карта компонентов UI kit

| Задача статьи | Компонент UI kit | Когда использовать |
|---|---|---|
| Верхняя мета | `.meta` | Всегда: `Обновлено` + `Время чтения` |
| Ключевые параметры | `.summary-card` | Сроки, стоимость, подсудность, результат |
| Развилка сценариев | `.choice-cards` | Есть разные пути действий |
| Важное предупреждение | `.callout.callout-important` | Риск, ограничение, критичная норма |
| Практический совет | `.callout.callout-tip` | Рекомендация или быстрый next step |
| Резюме | `.callout.callout-summary` | Всегда в конце основной части |
| Сравнение или риски | `table`, `.risk-table` | Варианты, сроки, риски, документы |
| Судебная практика | `.court-practice` | Конфликтные юридические темы |
| Пошаговый порядок | `.steps` | Инструкция или процедура |
| Чек-лист | `.checklist` | Подготовка документов или действий |
| Образец документа | `.doc-template` | Иск, заявление, жалоба, претензия, договор |
| Файл образца | `.doc-download-block` | Один реальный файл, DOCX по умолчанию |
| FAQ | `.faq-item` / `<details>` | Вопросы, которые дополняют body |
| Правовая база | `.law-base` | Все использованные нормы с точными ссылками |
| Доверие | `.auth-v9-author-card`, `.auth-v9-reviewer-card`, `.disclaimer` | Автор, проверка, ограничение ответственности |
| Перелинковка | `.relink-block`, `.relink-card` | Следующие связанные статьи |

---

## Метаданные статьи

В верхнем блоке `.meta` показываем только пользовательские метаданные статьи:

```html
<div class="meta">
  <time datetime="YYYY-MM-DD">Обновлено: 4 июня 2026</time>
  <span>Время чтения: ~10 мин</span>
</div>
```

Правила:
- Не использовать служебные подписи вроде `Собрано`, `Источник`, `сгенерировано`, `HTML-статья`
- Дата в `datetime`, видимая дата и `Article.dateModified` должны совпадать
- Время чтения указывать отдельным `<span>` в формате `Время чтения: ~N мин`

---

## CSS-система

### Переменные

```css
:root {
  --text: #1a1a1a;
  --muted: #555;
  --bg: #fff;
  --surface: #f7f8fa;
  --border: #e0e3e8;
  --accent: #2563eb;
  --warn-bg: #fef3cd;
  --warn-border: #f0ad4e;
  --tip-bg: #d1ecf1;
  --tip-border: #17a2b8;
  --important-bg: #fde8e8;
  --important-border: #dc2626;
  --summary-bg: #ecfdf5;
  --summary-border: #10b981;
}
```

> Цвета можно переопределить под бренд. Минимум: `--accent`, `--surface`, `--border`.

### Базовые стили

```css
body { max-width: 1100px; margin: 0 auto; padding: 24px 20px 80px; font-size: 17px; line-height: 1.7; }

/* Tablet */
@media (max-width: 900px) and (min-width: 601px) {
  body { max-width: 100%; padding: 24px 32px 80px; }
}

/* Mobile */
@media (max-width: 600px) {
  body { font-size: 16px; padding: 16px 14px 60px; }
  h1 { font-size: 23px; }
  h2 { font-size: 19px; }
}
```

---

## Обязательные компоненты

### 1. Breadcrumbs

```html
<nav class="breadcrumbs" aria-label="Хлебные крошки">
  <a href="/">Главная</a><span>›</span>
  <a href="/category">Категория</a><span>›</span>
  Текущая страница
</nav>
```

### 2. Sidebar TOC (sticky справа)

Навигация размещается как правый sidebar, а не горизонтальная полоса. Это устраняет горизонтальный скролл.

Layout: body = CSS Grid `1fr 220px`. Breadcrumbs — `grid-column: 1 / -1`. Контент — в `.main` (левая колонка). TOC — во второй колонке.

```html
<body>
  <nav class="breadcrumbs" style="grid-column: 1 / -1;">...</nav>
  <div class="main">
    <!-- весь контент статьи -->
  </div>
  <nav class="toc">
    <div class="toc-title">Содержание</div>
    <a href="#section1">Секция 1</a>
    ...
  </nav>
</body>
```

CSS:
```css
body { display: grid; grid-template-columns: 1fr 220px; gap: 32px; max-width: 1100px; }
.toc { position: sticky; top: 24px; border-left: 2px solid var(--border); }
.toc a { display: block; padding: 5px 0 5px 14px; border-left: 2px solid transparent; }
.toc a.active { color: var(--accent); border-left-color: var(--accent); }
```

Mobile (≤600px): grid → 1 колонка, TOC становится горизонтальной pill-полосой сверху.
Tablet (601–900px): `grid-template-columns: 1fr 180px`.

Scroll-spy JS: при скролле подсвечивать активный .toc a.

### 3. Summary Card

Для страниц с ключевыми параметрами:

```html
<div class="summary-card">
  <div class="item">
    <span class="label">Стоимость</span>
    <span class="value">от 5 000 ₽</span>
  </div>
  <!-- ... -->
</div>
```

CSS Grid: `grid-template-columns: repeat(auto-fit, minmax(180px, 1fr))`.

### 4. Callout-блоки

```html
<!-- Предупреждение -->
<div class="callout callout-important">
  <div class="callout-header">
    <svg class="callout-icon-svg" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
    <span class="callout-title">Важно!</span>
  </div>
  <p class="callout-text">текст предупреждения</p>
</div>

<!-- Рекомендация -->
<div class="callout callout-tip">
  <div class="callout-header">
    <svg class="callout-icon-svg" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12z" />
    </svg>
    <span class="callout-title">Совет</span>
  </div>
  <p class="callout-text">текст совета</p>
</div>
```

### 5. Нумерованные шаги

```html
<ol class="steps">
  <li>
    <strong>Название шага</strong>
    Описание шага
  </li>
</ol>
```

CSS: `counter-reset: step;` + круглые номера через `::before`.

### 6. Timeline

Для сроков и этапов:

```html
<div class="timeline">
  <div class="event">
    <div class="time">~1 месяц</div>
    <div>Описание этапа</div>
  </div>
</div>
```

CSS: вертикальная линия через `::before` на контейнере + точки на событиях.

### 7. Чек-лист

```html
<ul class="checklist">
  <li>Пункт чек-листа</li>
</ul>
```

CSS: `☐` через `::before` на `li`.

### 8. FAQ Accordion

**Правило:** FAQ НЕ дублирует контент статьи. Каждый ответ добавляет новую информацию: нюанс, практический совет, edge-case, или уточнение, которое не вошло в основную секцию H2. Если ответ повторяет body-контент — переформулируй вопрос или замени его.

```html
<details class="faq-item">
  <summary>Вопрос?</summary>
  <div class="faq-answer">
    <p>Полный ответ со ссылками на источники.</p>
  </div>
</details>
```

CSS: `summary { cursor: pointer; }` + иконка `+`/`−`.

### 9. Таблицы

```html
<table>
  <thead>
    <tr><th>Критерий</th><th>Вариант 1</th><th>Вариант 2</th></tr>
  </thead>
  <tbody>
    <tr><td>Строка</td><td>Значение</td><td>Значение</td></tr>
  </tbody>
</table>
```

### 10. Сценарная развилка

**НЕ использовать моноширинные ASCII-деревья.** Вместо них — две кликабельные карточки:

```html
<div class="choice-cards">
  <div class="question-text">Вопрос?</div>
  <div class="cards">
    <a href="#yes" class="card">
      <div class="card-icon yes-icon">✓</div>
      <div class="card-title">Да, ...</div>
      <div class="card-desc">Описание <strong>результат</strong></div>
      <span class="card-link">→ Ссылка</span>
    </a>
    <a href="#no" class="card">
      <div class="card-icon no-icon">—</div>
      <div class="card-title">Нет, ...</div>
      <div class="card-desc">Описание <strong>результат</strong></div>
      <span class="card-link">→ Ссылка</span>
    </a>
  </div>
</div>
```

CSS: grid 2 колонки (1fr 1fr, gap 14px).
Card: surface bg, border 1px, radius 12px, hover → accent border + тень.
Icon: 36×36 круг. «Да» = amber (#fef3c7/#b45309), «Нет» = green (#d1fae5/#047857).
Mobile: grid-template-columns: 1fr (стек в колонку).

### 11. Блок «Правовая база» (для юридической ниши)

**Важно:** все ссылки на законы должны вести на **конкретную статью**, а не на общий документ кодекса. Используй URL с хешем статьи (например, `consultant.ru/document/cons_doc_LAW_8982/<hash>/` для ст. 22 СК РФ), а не `consultant.ru/document/cons_doc_LAW_8982/` (весь кодекс). Пользователь должен сразу увидеть нужную норму.

```html
<div class="law-base">
  <h2>Правовая база</h2>
  <ul>
    <li><a href="https://www.consultant.ru/document/cons_doc_LAW_8982/<hash>/">Ст. XX СК РФ</a> — пояснение простыми словами</li>
  </ul>
</div>
```

CSS: surface bg, border, radius 10px. Список без маркеров, каждый li с border-bottom.

### 12. Блок «Резюме» (всегда)

```html
<h2 id="summary">Коротко: что запомнить</h2>
<div class="callout callout-summary">
  <ol>
    <li><strong>Глагол:</strong> суть пункта.</li>
  </ol>
</div>
```

3–5 пунктов. Формат: глагол + суть. В зелёном callout-блоке.

### Стиль текста (юридическая ниша)

**Цитаты из законов — курсивом:**
```html
<p>Согласно <em>ст. 22 СК РФ</em>, суд может назначить примирительный срок до 3 месяцев.</p>
```

**Термины при первом упоминании — жирным + пояснение:**
```html
<p><strong>Досудебная претензия</strong> — это официальное письменное требование…</p>
```

**Активный залог:**
- ✅ «Вам нужно подать иск в суд»
- ❌ «Иск должен быть подан в суд»

### 13. Блок «Образец документа» (если тема предполагает составление документа)

**Когда нужен:** статья о подаче иска, заявления, жалобы, претензии, составлении договора — любой теме, где пользователь должен составить документ.

```html
<div class="doc-template">
  <div class="doc-header">
    <div class="doc-header-left">
      <h3>Образец искового заявления</h3>
      <span class="doc-badge">Шаблон</span>
    </div>
    <a href="isk-razvod.docx" class="card-action-btn docx-btn" title="Скачать в формате DOCX" download>
      <svg class="button-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Скачать DOCX
    </a>
  </div>
  <div class="doc-body">
    <div class="doc-meta-header">
      В <span class="placeholder">[наименование суда/органа]</span><br>
      <strong>Истец:</strong> <span class="placeholder">[Ваше Ф.И.О.]</span><br>
      <strong>Ответчик:</strong> <span class="placeholder">[Ф.И.О. ответчика]</span>
    </div>
    <div class="doc-title-main">Исковое заявление<br>о <span class="placeholder">[предмет иска]</span></div>
    <div class="doc-content-text">
      <p><span class="placeholder">[Основная часть: описание обстоятельств и обоснование требований]</span></p>
    </div>
    <div class="doc-title-request">Прошу:</div>
    <div class="doc-content-text">
      <p>1. <span class="placeholder">[Требование 1]</span></p>
      <p>2. <span class="placeholder">[Требование 2]</span></p>
    </div>
    <div class="doc-signature">
      <span>Истец: ___________</span>
      <span><span class="placeholder">[Дата]</span></span>
    </div>
  </div>
  <div class="doc-footer">Образец носит информационный характер и не гарантирует положительное решение. Перед использованием рекомендуем проконсультироваться с юристом.</div>
</div>

<div class="doc-download-block">
  <div class="download-card docx-card">
    <div class="card-header-info">
      <div class="card-icon-container">
        <svg class="file-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      </div>
      <div class="card-meta">
        <span class="card-title">Исковое заявление о разводе</span>
        <span class="card-desc">Формат DOCX · редактируемый шаблон</span>
      </div>
    </div>
    <a href="isk-razvod.docx" class="card-action-btn" title="Скачать в формате DOCX" download>
      <svg class="button-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Скачать DOCX
    </a>
  </div>
</div>
```

CSS:
```css
.doc-template { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; margin: 20px 0; overflow: hidden; }
.doc-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 18px; border-bottom: 1px solid var(--border); }
.doc-header h3 { margin: 0; font-size: 16px; }
.doc-badge { font-size: 11px; font-weight: 700; text-transform: uppercase; background: var(--accent); color: #fff; padding: 2px 8px; border-radius: 4px; }
.doc-body { margin: 0; padding: 18px; background: #fff; font-size: 14px; line-height: 1.8; overflow-x: auto; }
.doc-meta-header { margin-bottom: 18px; }
.doc-title-main { text-align: center; font-weight: 700; text-transform: uppercase; margin: 18px 0; }
.doc-content-text p { margin: 0 0 10px; }
.doc-title-request { margin: 16px 0 8px; font-weight: 700; }
.doc-signature { display: flex; justify-content: space-between; gap: 16px; margin-top: 24px; }
.doc-body .placeholder { background: #fef3c7; padding: 1px 4px; border-radius: 3px; font-style: italic; }
.doc-footer { padding: 10px 18px; border-top: 1px solid var(--border); font-size: 13px; color: var(--muted); }
.doc-download-block { display: grid; grid-template-columns: 1fr; gap: 12px; margin: 18px 0; }
.download-card { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px; border: 1px solid var(--border); border-radius: 10px; }
```

**Правила:**
- Все поля для заполнения — в `<span class="placeholder">[Описание]</span>`
- Оформление образца не менять произвольно: использовать `.doc-template`, `.doc-header`, `.doc-body`, `.doc-footer`, `.doc-download-block`, `.download-card`, `.card-action-btn` и иконки скачивания как в UI kit `Gemini/article-ui-kit.html`
- В заголовке образца обязательно указать тип документа (`Образец искового заявления`, `Образец жалобы`) и бейдж `Образец` или `Шаблон`
- Тело образца должно выглядеть как документ: адресат, заявитель, название документа, фактическая часть, просьба/требования, приложения, дата, подпись
- Все пользовательские данные и переменные поля оставлять только как плейсхолдеры в квадратных скобках: `[Ваше Ф.И.О.]`, `[Дата]`, `[Наименование суда]`; не выдумывать имена, адреса, номера дел, телефоны
- Дисклеймер в футере обязателен: образец носит информационный характер, не гарантирует результат и не заменяет консультацию юриста/специалиста
- Для каждого образца обязательно сгенерировать и подключить один реальный файл для скачивания. По умолчанию использовать `.docx`, потому что пользователь должен легко отредактировать шаблон
- `.pdf` использовать только вместо `.docx`, если тема требует печатную/нередактируемую форму. Не показывать DOCX и PDF одновременно без отдельной причины в брифе
- Отсутствующий файл для скачивания — это незавершенная генерация, а не допустимое состояние UI. Не оставлять disabled-кнопки и не ставить `href="#"`
- Текстовый образец на странице и скачиваемый файл должны совпадать по смыслу; нельзя давать на странице один документ, а в файле другой
- Для YMYL: добавить «Рекомендуем проконсультироваться с юристом/специалистом»

### 14. Блок «Судебная практика» (для конфликтных юридических тем)

**Когда нужен:** спорные темы (развод с несогласным супругом, раздел имущества, оспаривание). НЕ нужен для процедурных тем (как оплатить госпошлину, как подать заявление).

**Чек:** тема конфликтная? → Добавь H2 «Судебная практика» с 2–3 анонимными примерами.

```html
<div class="court-practice">
  <h3>Пример из практики</h3>
  <div class="practice-case">
    <div class="case-situation"><strong>Ситуация:</strong> описание</div>
    <div class="case-decision"><strong>Решение суда:</strong> что решил суд</div>
    <div class="case-reason"><strong>Почему:</strong> мотивировка</div>
  </div>
</div>
```

CSS:
```css
.court-practice { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 18px 22px; margin: 20px 0; }
.practice-case { padding: 12px 0; border-bottom: 1px solid var(--border); }
.practice-case:last-child { border-bottom: none; }
.case-situation, .case-decision, .case-reason { margin-bottom: 4px; font-size: 15px; }
```

Анонимность: «в одном из дел», «Верховный суд указал, что…». НЕ указывать имена/города.

### 15. Таблица рисков (для сложных споров)

**Когда нужна:** сложные споры с несколькими рисками (раздел имущества, опека над детьми). НЕ нужна для простых процедур.

```html
<table class="risk-table">
  <thead><tr><th>Риск</th><th>Вероятность</th><th>Как избежать</th></tr></thead>
  <tbody>
    <tr><td>Описание риска</td><td>Высокая/Средняя/Низкая</td><td>Конкретное действие</td></tr>
  </tbody>
</table>
```

CSS: стандартные table-стили + цветная вероятность (red/amber/green через `background`).

---

## Анимации (опционально, GSAP + ScrollTrigger)

Если пользователь предпочитает анимации — добавь:

```css
/* Scroll-triggered fade-in / slide-up */
.animate-in { opacity: 0; transform: translateY(24px); transition: opacity 0.6s ease, transform 0.6s ease; }
.animate-in.visible { opacity: 1; transform: translateY(0); }
```

JS (подключается перед `</body>`):
```js
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.15 });
document.querySelectorAll('.animate-in').forEach(el => observer.observe(el));
```

**Что анимировать:**
- H2-секции: fade-in + slide-up при скролле
- Summary card: stagger-анимация ячеек
- Choice cards: stagger при появлении
- Callout-блоки: fade-in
- FAQ accordion: плавное раскрытие (CSS transition)

**Что НЕ анимировать:** текст параграфов, таблицы, ссылки, breadcrumbs.

---

## Schema.org JSON-LD

### Article (всегда)

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "<H1 страницы>",
  "description": "<meta description>",
  "datePublished": "YYYY-MM-DD",
  "dateModified": "YYYY-MM-DD",
  "inLanguage": "ru-RU"
}
```

### HowTo (для how_to_guide)

```json
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "<название процесса>",
  "step": [
    { "@type": "HowToStep", "name": "<шаг>", "text": "<описание>" }
  ]
}
```

### FAQPage (если есть FAQ)

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "<вопрос>",
      "acceptedAnswer": { "@type": "Answer", "text": "<ответ>" }
    }
  ]
}
```

### ItemList (для comparison_page)

```json
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "<элемент>" }
  ]
}
```

---

## Ссылки

### Правила:

1. **Только проверенные URL.** Если не уверен — используй base-URL документа.
   **Юридическая ниша:**
   - СК РФ: `https://www.consultant.ru/document/cons_doc_LAW_8982/`
   - ГПК РФ: `https://www.consultant.ru/document/cons_doc_LAW_39570/`
   - НК РФ: `https://www.consultant.ru/document/cons_doc_LAW_28165/`
   **Другие ниши:** подставь base-URL соответствующих официальных источников.

2. **Атрибуты:**
   ```html
   <a href="url" target="_blank" rel="noopener">текст ссылки</a>
   ```

3. **Не фабрикуют хеш-фрагменты вручную.** Хеши, полученные из WebSearch или браузера — допустимы. Если хеш недоступен — используй base-URL документа с пометкой `[URL требует уточнения]`.

---

## YMYL-дополнения

### Дисклеймер

```html
<div class="disclaimer">
  <strong>Дисклеймер.</strong> Информация носит общий характер и не является
  <юридической/медицинской/финансовой> консультацией. Для вашей конкретной
  ситуации рекомендуем консультацию специалиста.
</div>
```

### Дата актуальности

Для числовых данных (суммы, сроки, ставки):
```html
<time datetime="YYYY-MM-DD">Обновлено: дата</time>
```

---

## Маппинг бриф → HTML

| Секция брифа | HTML-блок |
|---|---|
| 8. Title | `<title>` |
| 8. H1 | `<h1>` |
| 8. Description | `<meta name="description">` |
| 8. Первый экран | summary-card + choice-cards (если есть развилка) |
| 9. H2 контент-план | `<section>` + `<h2>` |
| 9. Формат блока | table / ol.steps / timeline / callout / checklist / doc-template / court-practice / risk-table |
| 9. FAQ | `<details>` + FAQPage schema |
| 10. Sticky nav | `.toc` |
| 10. Сценарные развилки | `.choice-cards` |
| 11. Правовая база | `.law-base` (для юридической ниши) |
| 12. Резюме | `.callout-summary` с `<ol>` |
| 13. Образец документа | `.doc-template` (если тема предполагает) |
| 14. Судебная практика | `.court-practice` (для конфликтных тем) |
| 15. Таблица рисков | `.risk-table` (для сложных споров) |
| 15. Schema | JSON-LD в `<head>` |
| — | Дисклеймер | `.disclaimer` (для YMYL) |

---

## Чек-лист HTML

```
- [ ] Title/H1/Description из брифа (секция 8)
- [ ] Использованы компоненты из `Gemini/article-ui-kit.html`; новые одноразовые блоки не подменяют UI kit
- [ ] В публичную статью не попали `.kit-*`, демо-пояснения и служебные блоки UI kit
- [ ] Schema.org: Article + типовой schema
- [ ] Responsive CSS (media query ≤600px)
- [ ] Breadcrumbs + sticky TOC
- [ ] Каждый H2 = секция из контент-плана
- [ ] Таблицы для сравнения, timeline для сроков
- [ ] Callout-блоки для предупреждений и советов
- [ ] FAQ accordion — дополняет статью, НЕ дублирует body-контент
- [ ] Ссылки на законы — ведут на конкретную статью (URL с хешем), а не на общий документ
- [ ] YMYL-дисклеймер (если применимо)
- [ ] Образец документа (если тема предполагает составление)
- [ ] Судебная практика (для конфликтных юридических тем, 2-3 примера)
- [ ] Таблица рисков (для сложных споров)
- [ ] Цитаты из законов — курсивом `<em>` (для юридической ниши)
- [ ] Термины при первом упоминании — `<strong>` + пояснение
- [ ] lang="ru" в <html>
- [ ] Нет фабрикованных URL
```
