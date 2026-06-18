const RU_STOPWORDS = new Set([
  "как",
  "что",
  "это",
  "для",
  "или",
  "при",
  "над",
  "под",
  "без",
  "если",
  "есть",
  "где",
  "когда",
  "какой",
  "какая",
  "какие",
  "зачем",
  "почему",
  "можно",
  "нужно",
  "онлайн",
  "свой",
  "свои",
  "через",
  "после",
  "перед",
  "2026",
]);

const EN_STOPWORDS = new Set([
  "the",
  "and",
  "or",
  "for",
  "with",
  "without",
  "what",
  "how",
  "why",
  "when",
  "where",
  "which",
  "best",
  "top",
  "near",
  "from",
  "into",
  "your",
  "you",
  "are",
  "2026",
]);

const BOILERPLATE_HEADING_RE =
  /рассылк|подпиш|отзывы|публикации|продукты|предложения|задавайте|расскажите|другие калькуляторы|support|download|resources|templates|company|platform|try .*free|connect with|what users say|published in|written by|top \d+|best .*alternatives|alternatives|capacity planning|optimized scheduling|professional services|before we move on|маркетинг/i;

const ARCHETYPES = {
  hybrid_tool_guide: {
    intent: "calculate",
    userTask:
      "Получить расчет или результат прямо на странице и понять методику, ограничения и источники данных.",
    firstScreen:
      "Рабочий инструмент above the fold: поля ввода, результат, краткое пояснение и дата/источник данных.",
    requiredModules: [
      "interactive_tool",
      "result_block",
      "methodology",
      "worked_examples",
      "limitations",
      "source_date",
      "faq_if_visible",
    ],
    topics: [
      ["inputs", ["input", "field", "ввод", "поле", "параметр"]],
      ["result", ["result", "итог", "результат", "расчет", "payment"]],
      ["formula_method", ["formula", "method", "формула", "методика"]],
      ["examples", ["example", "пример"]],
      ["limitations", ["limitation", "disclaimer", "ограничение", "предварительный"]],
    ],
    outline: (query) => [
      ["H1", titleCaseQuery(query)],
      ["H2", "Инструмент расчета"],
      ["H2", "Что показывает результат"],
      ["H2", "Как считается результат"],
      ["H2", "Пример расчета"],
      ["H2", "Что влияет на итог"],
      ["H2", "Ограничения и источники данных"],
      ["H2", "Частые вопросы"],
    ],
    editorBrief: [
      "Начинать с действия пользователя, а не с длинного общего определения.",
      "Объяснить методику простым языком и показать пример с числами.",
      "Явно отделить предварительный расчет от официального решения или результата.",
    ],
    frontendBrief: [
      "SSR/prerender для оболочки инструмента и базового текста.",
      "Все поля ввода должны иметь label, ошибки и понятные состояния.",
      "Результат должен быть доступен текстом, не только графикой или canvas.",
    ],
    trust: ["источник данных", "дата обновления", "ограничения расчета"],
    schema: ["WebApplication если инструмент видим", "FAQPage только для видимых FAQ"],
  },
  interactive_converter: {
    intent: "convert",
    userTask:
      "Быстро получить актуальное преобразование значения и понять источник курса или справочных данных.",
    firstScreen:
      "Конвертер above the fold: два значения, направление обмена/перевода, источник и время обновления.",
    requiredModules: [
      "converter",
      "live_or_cached_source",
      "timestamp",
      "inverse_conversion",
      "historical_context_if_needed",
      "fallback_state",
    ],
    topics: [
      ["source", ["source", "источник", "rate", "курс"]],
      ["timestamp", ["updated", "обновлен", "date", "дата", "time"]],
      ["inverse", ["inverse", "обратный"]],
      ["accuracy", ["accuracy", "точность", "spread"]],
    ],
    outline: (query) => [
      ["H1", titleCaseQuery(query)],
      ["H2", "Конвертер"],
      ["H2", "Текущий источник данных"],
      ["H2", "Как читать результат"],
      ["H2", "Обратное преобразование"],
      ["H2", "Ограничения точности"],
      ["H2", "Связанные конвертеры"],
    ],
    editorBrief: [
      "Не писать вечнозеленый текст там, где пользователь пришел за текущим значением.",
      "Указать источник и время обновления данных.",
      "Добавить предупреждение о расхождении с банковскими или коммерческими курсами, если применимо.",
    ],
    frontendBrief: [
      "Показать состояние загрузки и состояние недоступности источника.",
      "Сделать поля ввода клавиатурно доступными.",
      "Не индексировать устаревшее динамическое значение как вечный факт.",
    ],
    trust: ["источник данных", "частота обновления", "fallback при недоступности API"],
    schema: ["WebApplication если конвертер видим"],
  },
  article_guide_definition: {
    intent: "learn",
    userTask:
      "Понять значение термина, базовую механику, примеры использования и связанные понятия.",
    firstScreen:
      "Короткое определение, простая аналогия и мини-схема или пример до углубления в детали.",
    requiredModules: [
      "quick_definition",
      "plain_language_example",
      "term_breakdown",
      "use_cases",
      "common_mistakes",
      "related_terms",
    ],
    topics: [
      ["definition", ["definition", "определение", "что такое"]],
      ["example", ["example", "пример"]],
      ["how_it_works", ["how it works", "как работает"]],
      ["types", ["types", "виды", "типы"]],
      ["mistakes", ["mistake", "ошибка", "путают"]],
    ],
    outline: (query) => [
      ["H1", titleCaseQuery(query)],
      ["H2", "Короткое определение"],
      ["H2", "Как это работает на примере"],
      ["H2", "Из чего состоит"],
      ["H2", "Где используется"],
      ["H2", "Чем отличается от похожих понятий"],
      ["H2", "Частые ошибки"],
      ["H2", "Что изучить дальше"],
    ],
    editorBrief: [
      "Сначала дать короткое определение, затем детали.",
      "Использовать бытовой пример и профессиональный пример.",
      "Не перегружать первый экран терминологией.",
    ],
    frontendBrief: [
      "Article layout с корректной иерархией H1-H3.",
      "Таблицы терминов делать текстовыми и доступными.",
      "Схемы дублировать текстовым пояснением.",
    ],
    trust: ["дата обновления для технических тем", "автор или редактор с релевантной компетенцией"],
    schema: ["Article или TechArticle", "FAQPage только при видимом FAQ"],
  },
  how_to_guide: {
    intent: "do",
    userTask:
      "Выполнить задачу по шагам, понять документы/условия, риски, сроки и точку, где нужен специалист.",
    firstScreen:
      "Короткий ответ, список шагов и предупреждение о важных ограничениях или актуальности.",
    requiredModules: [
      "quick_answer",
      "step_by_step",
      "requirements",
      "documents_or_tools",
      "risks",
      "when_to_get_help",
      "last_updated",
    ],
    topics: [
      ["steps", ["step", "шаг", "этап"]],
      ["requirements", ["requirement", "требование", "нужно"]],
      ["documents", ["document", "документ"]],
      ["risks", ["risk", "риск", "ошибка"]],
      ["date", ["updated", "актуально", "дата"]],
    ],
    outline: (query) => [
      ["H1", titleCaseQuery(query)],
      ["H2", "Короткий ответ"],
      ["H2", "Что нужно подготовить"],
      ["H2", "Пошаговая инструкция"],
      ["H2", "Сроки и расходы"],
      ["H2", "Типичные ошибки"],
      ["H2", "Когда нужен специалист"],
      ["H2", "Источники и дата обновления"],
    ],
    editorBrief: [
      "Писать в формате действий, а не общей лекции.",
      "Отделить обязательные шаги от дополнительных.",
      "Для юридических, финансовых и медицинских тем указывать ограничения.",
    ],
    frontendBrief: [
      "Использовать списки шагов с якорями.",
      "Выделить предупреждения и дату актуальности.",
      "Не прятать критические условия в FAQ.",
    ],
    trust: ["официальные источники", "дата обновления", "экспертная проверка для high-risk тем"],
    schema: ["HowTo только если шаги видимы и соответствуют правилам", "Article как базовый вариант"],
  },
  comparison_page: {
    intent: "compare",
    userTask:
      "Выбрать между вариантами по критериям, сценариям использования, цене, ограничениям и рискам.",
    firstScreen:
      "Quick verdict, chooser bullets and jump link to a comparison table.",
    requiredModules: [
      "quick_verdict",
      "comparison_table",
      "criteria",
      "use_cases",
      "pricing_or_feature_date",
      "methodology",
      "disclosure",
    ],
    topics: [
      ["pricing", ["pricing", "price", "стоимость", "цена"]],
      ["features", ["feature", "функция", "возможность"]],
      ["use_cases", ["use case", "scenario", "сценарий"]],
      ["pros_cons", ["pros", "cons", "плюсы", "минусы"]],
      ["methodology", ["methodology", "criteria", "критерии", "методика"]],
    ],
    outline: (query) => [
      ["H1", titleCaseQuery(query)],
      ["H2", "Quick verdict"],
      ["H2", "Key differences at a glance"],
      ["H2", "Choose the first option if"],
      ["H2", "Choose the second option if"],
      ["H2", "Feature-by-feature comparison"],
      ["H2", "Pricing, privacy and ownership"],
      ["H2", "Real user scenarios"],
      ["H2", "Methodology and sources"],
    ],
    editorBrief: [
      "Не делать универсального победителя без сценариев.",
      "Проверить цены и функции по официальным источникам перед публикацией.",
      "Раскрыть affiliate/brand bias, если он есть.",
    ],
    frontendBrief: [
      "Comparison table должна быть удобной на mobile и доступной screen reader.",
      "Добавить якоря к ключевым критериям.",
      "Disclosure block обязателен при партнерских ссылках.",
    ],
    trust: ["дата проверки цен/функций", "методология сравнения", "disclosure"],
    schema: ["Article", "SoftwareApplication только если данные точны и видимы"],
  },
  commercial_comparison_page: {
    intent: "commercial_investigation",
    userTask:
      "Сузить выбор продукта или сервиса по критериям покупки, ограничениям, цене и типу пользователя.",
    firstScreen:
      "Shortlist, selection criteria and transparent methodology before individual recommendations.",
    requiredModules: [
      "shortlist",
      "selection_criteria",
      "comparison_table",
      "best_for_labels",
      "pricing_date",
      "methodology",
      "disclosure",
    ],
    topics: [
      ["pricing", ["pricing", "price", "plan"]],
      ["features", ["feature", "capability"]],
      ["small_business", ["small business", "team", "agency"]],
      ["methodology", ["methodology", "criteria", "tested"]],
      ["alternatives", ["alternative", "competitor"]],
    ],
    outline: (query) => [
      ["H1", titleCaseQuery(query)],
      ["H2", "Best options at a glance"],
      ["H2", "How we chose"],
      ["H2", "Comparison table"],
      ["H2", "Best for small teams"],
      ["H2", "Best for budget"],
      ["H2", "Best for scale"],
      ["H2", "Pricing and limitations"],
      ["H2", "Methodology and disclosure"],
    ],
    editorBrief: [
      "Не создавать фальшивые рейтинги без методологии.",
      "Каждая рекомендация должна иметь критерий best for.",
      "Обновлять цены и условия перед публикацией.",
    ],
    frontendBrief: [
      "Таблица должна позволять сравнить ключевые критерии без горизонтальной боли на mobile.",
      "Показать disclosure рядом с коммерческими блоками.",
      "Не размечать Review/Rating без реальной методологии.",
    ],
    trust: ["методология", "дата проверки", "disclosure", "источники цен"],
    schema: ["Article", "ItemList допустим осторожно", "Review/Rating только при валидной методологии"],
  },
  reference_database: {
    intent: "reference",
    userTask:
      "Быстро найти справочное значение, единицы измерения, источник данных и связанные варианты.",
    firstScreen:
      "Справочное значение или таблица above the fold с единицами, источником и датой обновления.",
    requiredModules: ["reference_value", "units", "source", "table", "related_items", "last_updated"],
    topics: [
      ["value", ["value", "значение", "калории", "calories"]],
      ["units", ["unit", "единица", "грамм", "mg", "kcal"]],
      ["source", ["source", "источник"]],
      ["table", ["table", "таблица"]],
    ],
    outline: (query) => [
      ["H1", titleCaseQuery(query)],
      ["H2", "Короткий ответ"],
      ["H2", "Таблица значений"],
      ["H2", "Единицы измерения"],
      ["H2", "Источник данных"],
      ["H2", "Похожие значения"],
      ["H2", "Дата обновления"],
    ],
    editorBrief: [
      "Дать справочное значение сразу.",
      "Показывать единицы измерения и источник.",
      "Не растягивать ответ общими вводными.",
    ],
    frontendBrief: [
      "Таблица должна быть crawlable HTML.",
      "Значение и источник должны быть видны без JS.",
      "Добавить внутренние ссылки на связанные справочные страницы.",
    ],
    trust: ["источник данных", "дата обновления", "единицы измерения"],
    schema: ["Article", "Dataset только при реальном наборе данных"],
  },
  local_service_page: {
    intent: "local",
    userTask:
      "Найти услугу рядом, понять зону обслуживания, цену/условия, доверие и способ связаться.",
    firstScreen:
      "Локальное предложение, город/район, контакт, CTA и базовые доказательства доверия.",
    requiredModules: ["service_area", "contacts", "pricing_or_estimate", "reviews", "trust_proofs", "faq"],
    topics: [
      ["location", ["near", "рядом", "район", "город"]],
      ["price", ["price", "стоимость", "цена"]],
      ["contacts", ["phone", "телефон", "контакт"]],
      ["trust", ["review", "отзыв", "гарантия"]],
    ],
    outline: (query) => [
      ["H1", titleCaseQuery(query)],
      ["H2", "Услуга рядом"],
      ["H2", "Зона обслуживания"],
      ["H2", "Цены и условия"],
      ["H2", "Как вызвать специалиста"],
      ["H2", "Отзывы и гарантии"],
      ["H2", "Частые вопросы"],
    ],
    editorBrief: [
      "Не писать общую статью вместо посадочной услуги.",
      "Указать реальную географию, контакты, условия и ограничения.",
      "Добавить доказательства доверия, которые можно проверить.",
    ],
    frontendBrief: [
      "Контакты и CTA должны быть видимы above the fold.",
      "LocalBusiness schema только при реальном бизнесе и видимых данных.",
      "Проверить mobile click-to-call.",
    ],
    trust: ["реальные контакты", "адрес/зона обслуживания", "отзывы/гарантии"],
    schema: ["LocalBusiness только для реальной компании", "Service при видимом описании услуги"],
  },
  freshness_page: {
    intent: "freshness",
    userTask:
      "Узнать актуальную дату, статус, последние подтвержденные факты и отличить их от слухов.",
    firstScreen:
      "Короткий актуальный ответ с датой проверки, статусом подтверждения и ссылками на первоисточники.",
    requiredModules: ["current_status", "last_checked", "official_sources", "timeline", "rumor_control"],
    topics: [
      ["date", ["date", "дата", "release", "выход"]],
      ["official", ["official", "официально", "confirmed"]],
      ["updated", ["updated", "обновлено", "актуально"]],
      ["rumor", ["rumor", "слух", "unconfirmed"]],
    ],
    outline: (query) => [
      ["H1", titleCaseQuery(query)],
      ["H2", "Короткий актуальный ответ"],
      ["H2", "Что подтверждено официально"],
      ["H2", "Хронология обновлений"],
      ["H2", "Что пока не подтверждено"],
      ["H2", "Источники и дата проверки"],
    ],
    editorBrief: [
      "Не выдавать слухи за подтвержденные факты.",
      "Указывать дату проверки и первоисточники.",
      "Обновлять страницу при изменении фактов.",
    ],
    frontendBrief: [
      "Показать last checked рядом с основным ответом.",
      "Источники оформить crawlable links.",
      "Не индексировать устаревший статус без обновления.",
    ],
    trust: ["официальные источники", "дата проверки", "разделение фактов и слухов"],
    schema: ["Article или NewsArticle только при новостном формате"],
  },
  ymyl_medical_guide: {
    intent: "medical_information",
    userTask:
      "Понять возможные симптомы или медицинскую тему без самодиагностики и с указанием, когда обращаться к врачу.",
    firstScreen:
      "Осторожное краткое объяснение, красные флаги и рекомендация обратиться к врачу при рисках.",
    requiredModules: ["cautious_summary", "red_flags", "when_to_see_doctor", "sources", "expert_review"],
    topics: [
      ["symptoms", ["symptom", "симптом"]],
      ["doctor", ["doctor", "врач"]],
      ["red_flags", ["urgent", "срочно", "опасно"]],
      ["sources", ["source", "источник", "guideline"]],
    ],
    outline: (query) => [
      ["H1", titleCaseQuery(query)],
      ["H2", "Коротко и осторожно"],
      ["H2", "Возможные признаки"],
      ["H2", "Когда срочно к врачу"],
      ["H2", "Что нельзя делать"],
      ["H2", "Источники и экспертная проверка"],
    ],
    editorBrief: [
      "Не ставить диагноз и не заменять врача.",
      "Использовать медицинские источники и дату обновления.",
      "Выделить красные флаги.",
    ],
    frontendBrief: [
      "Предупреждение должно быть видно до основного текста.",
      "Источники должны быть видимыми ссылками.",
      "Medical schema не добавлять без строгого соответствия и экспертной проверки.",
    ],
    trust: ["экспертная проверка", "медицинские источники", "дата обновления"],
    schema: ["Article", "MedicalWebPage только при полном соответствии правилам"],
  },
  hub_or_disambiguation: {
    intent: "ambiguous",
    userTask:
      "Разобраться, какой смысл запроса нужен пользователю, и перейти в подходящий раздел или страницу.",
    firstScreen:
      "Короткое разветвление по основным смыслам запроса вместо попытки закрыть все одним текстом.",
    requiredModules: ["intent_split", "hub_links", "definitions", "popular_paths", "avoid_overreach"],
    topics: [
      ["meanings", ["meaning", "definition", "значение"]],
      ["types", ["type", "вид"]],
      ["software", ["software", "tool", "сервис"]],
      ["guide", ["guide", "руководство"]],
    ],
    outline: (query) => [
      ["H1", titleCaseQuery(query)],
      ["H2", "Что может означать запрос"],
      ["H2", "Популярные направления"],
      ["H2", "Если вы ищете определение"],
      ["H2", "Если вы выбираете продукт или сервис"],
      ["H2", "Связанные страницы"],
    ],
    editorBrief: [
      "Не пытаться закрыть неоднозначный запрос одной длинной статьей.",
      "Разделить интенты и вести пользователя к правильной странице.",
      "Проверить SERP на доминирующий смысл перед созданием финального URL.",
    ],
    frontendBrief: [
      "Сделать хаб с понятными карточками/ссылками, не вложенными статьями.",
      "Каждый путь должен вести на отдельный crawlable URL.",
      "Canonical должен соответствовать хабу, не одному из интентов.",
    ],
    trust: ["прозрачное разделение интентов", "нет неподтвержденных утверждений"],
    schema: ["CollectionPage или WebPage"],
  },
  generic_guide: {
    intent: "informational",
    userTask:
      "Получить понятное решение информационной задачи с примерами, ограничениями и следующими шагами.",
    firstScreen:
      "Короткий ответ, затем навигация по основным подзадачам и подробности.",
    requiredModules: ["quick_answer", "core_sections", "examples", "limitations", "sources_if_needed"],
    topics: [
      ["definition", ["definition", "определение"]],
      ["examples", ["example", "пример"]],
      ["steps", ["step", "шаг"]],
      ["limitations", ["limitation", "ограничение"]],
    ],
    outline: (query) => [
      ["H1", titleCaseQuery(query)],
      ["H2", "Короткий ответ"],
      ["H2", "Что важно понять"],
      ["H2", "Практические примеры"],
      ["H2", "Ограничения"],
      ["H2", "Следующие шаги"],
    ],
    editorBrief: [
      "Сначала закрыть основной интент, затем расширять тему.",
      "Добавить примеры и ограничения.",
      "Не превращать страницу в универсальный SEO-текст.",
    ],
    frontendBrief: [
      "Семантический article/main.",
      "Основной ответ должен быть видим без позднего JS.",
      "Структура заголовков должна соответствовать задачам пользователя.",
    ],
    trust: ["источники при проверяемых фактах", "дата обновления при меняющихся данных"],
    schema: ["Article или WebPage"],
  },
};

export function normalizeText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

export function detectLocale(query, fallback = "en-US") {
  if (/[А-Яа-яЁё]/.test(query)) return "ru-RU";
  return fallback || "en-US";
}

export function tokenize(text, locale = "en-US") {
  const stopwords = new Set([
    ...(locale.startsWith("ru") ? RU_STOPWORDS : EN_STOPWORDS),
    ...RU_STOPWORDS,
    ...EN_STOPWORDS,
  ]);
  return [
    ...new Set(
      (String(text || "").toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}-]{1,}/gu) || [])
        .map((token) => token.replace(/^-+|-+$/g, ""))
        .filter((token) => token.length >= 3)
        .filter((token) => !stopwords.has(token)),
    ),
  ];
}

export function titleCaseQuery(query) {
  const text = normalizeText(query);
  if (!text) return "Page brief";
  if (/[А-Яа-яЁё]/.test(text)) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
  return text
    .split(/\s+/)
    .map((word) => {
      if (/^vs$/i.test(word)) return "vs";
      if (/^(api|crm|usd|eur)$/i.test(word)) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function escapeRegex(term) {
  return String(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function topicRegex(terms) {
  const clean = terms.map(String).map((term) => term.trim()).filter((term) => term.length >= 2);
  if (!clean.length) return /$a/;
  return new RegExp(clean.map(escapeRegex).join("|"), "iu");
}

function slug(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/giu, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

function canonicalQueryText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[«»"“”'.,:;!?()[\]{}|/\\]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function topTermsFromPages(pages, locale, max = 12) {
  const counts = new Map();
  for (const page of pages) {
    const text = [
      page.serpTitle,
      page.serpPassage,
      page.title,
      page.metaDescription,
      page.h1?.join(" "),
      page.headings?.map((h) => h.text).join(" "),
    ]
      .filter(Boolean)
      .join(" ");
    for (const token of tokenize(text, locale)) {
      if (/^\d+$/.test(token)) continue;
      counts.set(token, (counts.get(token) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, max)
    .map(([term]) => term);
}

function inferArchetypeFromQuery(query, locale) {
  const q = query.toLowerCase();
  if (/\b(best|top)\b/.test(q)) return "commercial_comparison_page";
  if (/\bvs\b|\bversus\b|compare|comparison|сравнен|что лучше|или/.test(q)) return "comparison_page";
  if (/calculator|калькулятор|рассчитать|calculate/.test(q)) return "hybrid_tool_guide";
  if (/\b[a-z]{3}\s+to\s+[a-z]{3}\b|convert|converter|конверт|курс|валют|usd|eur/.test(q)) {
    return "interactive_converter";
  }
  if (/что такое|what is|definition|meaning/.test(q)) return "article_guide_definition";
  if (/^как\s|как .+|how to|how do/.test(q)) return "how_to_guide";
  if (/симптом|болезн|диабет|symptom|treatment|disease/.test(q)) return "ymyl_medical_guide";
  if (/калори|nutrition|calories|сколько.*в|reference|таблица/.test(q)) return "reference_database";
  if (/рядом|near me|nearby|ремонт|service|услуг/.test(q)) return "local_service_page";
  if (/дата выход|release date|latest|новост|2026|updated|сегодня/.test(q)) return "freshness_page";
  if (tokenize(query, locale).length <= 1) return "hub_or_disambiguation";
  return "generic_guide";
}

function inferArchetypeFromSerp(queryArchetype, pages) {
  const usablePages = pages.filter((page) => ["good", "partial"].includes(page.extractionQuality));
  if (usablePages.length < 3) return { archetype: queryArchetype, confidence: 0 };

  const count = (predicate) => usablePages.filter(predicate).length;
  const toolRatio =
    count((page) => page.detectedPageType === "tool_or_interactive" || page.formCount > 0 || page.interactiveElements?.inputs >= 3) /
    usablePages.length;
  const comparisonRatio =
    count((page) => page.detectedPageType === "comparison" || / vs |compare|comparison|сравнен/i.test(`${page.title} ${page.h1?.join(" ")}`)) /
    usablePages.length;
  const articleRatio =
    count((page) => page.detectedPageType === "definition_or_guide" || page.hasArticle) / usablePages.length;

  if (queryArchetype === "article_guide_definition" && articleRatio >= 0.35) {
    return { archetype: "article_guide_definition", confidence: articleRatio };
  }
  if (["comparison_page", "commercial_comparison_page"].includes(queryArchetype) && comparisonRatio >= 0.35) {
    return { archetype: queryArchetype, confidence: comparisonRatio };
  }
  if (["how_to_guide", "ymyl_medical_guide", "reference_database", "local_service_page", "freshness_page", "hub_or_disambiguation"].includes(queryArchetype)) {
    return { archetype: queryArchetype, confidence: Math.max(toolRatio, comparisonRatio, articleRatio) };
  }
  if (toolRatio >= 0.45 && queryArchetype === "interactive_converter") {
    return { archetype: "interactive_converter", confidence: toolRatio };
  }
  if (toolRatio >= 0.45 && ["generic_guide", "hybrid_tool_guide"].includes(queryArchetype)) {
    return { archetype: "hybrid_tool_guide", confidence: toolRatio };
  }
  if (comparisonRatio >= 0.45) return { archetype: queryArchetype === "commercial_comparison_page" ? queryArchetype : "comparison_page", confidence: comparisonRatio };
  if (articleRatio >= 0.55 && ["article_guide_definition", "generic_guide"].includes(queryArchetype)) {
    return { archetype: "article_guide_definition", confidence: articleRatio };
  }
  return { archetype: queryArchetype, confidence: Math.max(toolRatio, comparisonRatio, articleRatio) };
}

function isYMYL(query, archetype) {
  return (
    ["ymyl_medical_guide"].includes(archetype) ||
    /ипотек|кредит|налог|юрид|банк|симптом|диабет|имт|индекс[а]? массы тела|ожирен|развод|развест|расторг|расторжен\w*\s+брака|алимент|опек|суд|иск|семейн\w*\s+спор|наследств|банкротств|штраф|пособи|выплат|medical|health|bmi|body mass index|loan|mortgage|tax|legal|divorce|court|lawsuit|custody|alimony|bankruptcy/i.test(query)
  );
}

function businessViability(archetype) {
  if (archetype === "interactive_converter") {
    return {
      note: "Zero-click risk is high; build only if the page has a faster tool, reliable data source, related conversions, or product value beyond the SERP answer.",
      buildOnlyIf: ["reliable data source", "clear tool UX", "related conversion paths", "timestamped fallback"],
    };
  }
  if (archetype === "commercial_comparison_page") {
    return {
      note: "Commercial SERPs are noisy; build only with transparent methodology, real criteria, and current pricing/source checks.",
      buildOnlyIf: ["transparent methodology", "fresh pricing", "disclosure", "clear best-for scenarios"],
    };
  }
  if (archetype === "hub_or_disambiguation") {
    return {
      note: "Ambiguous head terms should usually become hubs or be split; avoid building one overbroad article.",
      buildOnlyIf: ["SERP confirms mixed intent", "hub links to focused pages", "canonical strategy is clear"],
    };
  }
  return {
    note: "Build if the page can complete the dominant user task better than a generic article.",
    buildOnlyIf: ["clear user task", "specific modules", "visible trust/freshness requirements"],
  };
}

function profileSpecialization(query) {
  return {};
}

export function buildProfile(queryId, pages = [], metadata = {}) {
  const query =
    metadata.query ||
    pages.find((page) => page.query)?.query ||
    pages.find((page) => page.serpTitle)?.serpTitle ||
    queryId;
  const locale = metadata.locale || detectLocale(query);
  const queryArchetype = inferArchetypeFromQuery(query, locale);
  const serpInference = inferArchetypeFromSerp(queryArchetype, pages);
  const archetype = serpInference.archetype;
  const base = ARCHETYPES[archetype] || ARCHETYPES.generic_guide;
  const specialization = profileSpecialization(query);
  const queryTokens = tokenize(query, locale);
  const serpTerms = topTermsFromPages(pages, locale, 14).filter((term) => !queryTokens.includes(term));

  const topicMap = new Map();
  for (const [id, terms] of [...base.topics, ...(specialization.topics || [])]) {
    topicMap.set(id, { id, label: id, terms: [...terms] });
  }
  for (const term of queryTokens.slice(0, 8)) {
    topicMap.set(`query_${slug(term)}`, { id: `query_${slug(term)}`, label: term, terms: [term] });
  }
  for (const term of serpTerms.slice(0, 8)) {
    const id = `serp_${slug(term)}`;
    const labelExists = [...topicMap.values()].some(
      (topic) => String(topic.label).toLowerCase() === String(term).toLowerCase(),
    );
    if (!topicMap.has(id) && !labelExists) topicMap.set(id, { id, label: term, terms: [term] });
  }

  const viability = businessViability(archetype);
  const profile = {
    queryId,
    query,
    locale,
    profileSource: pages.length ? "generic_serp_profile" : "generic_query_profile",
    archetype,
    intent: base.intent,
    userTask: metadata.userTask || specialization.userTask || base.userTask,
    firstScreen: specialization.firstScreen || base.firstScreen,
    title: titleCaseQuery(query),
    h1: titleCaseQuery(query),
    requiredModules: [...new Set([...base.requiredModules, ...(specialization.requiredModules || [])])],
    topics: [...topicMap.values()].map((topic) => ({
      ...topic,
      regex: topicRegex(topic.terms),
    })),
    outline: specialization.outline || base.outline(query),
    differentiators: [...genericDifferentiators(archetype), ...(specialization.differentiators || [])],
    editorNotes: [...base.editorBrief, ...(specialization.editorBrief || [])],
    frontendNotes: [...base.frontendBrief, ...(specialization.frontendBrief || [])],
    trust: isYMYL(query, archetype)
      ? [
          ...new Set([
            localeText(locale, "экспертная проверка high-risk утверждений", "expert review for high-risk claims"),
            ...base.trust,
            ...(specialization.trust || []),
          ]),
        ]
      : [...new Set([...base.trust, ...(specialization.trust || [])])],
    schema: [...new Set([...base.schema, ...(specialization.schema || [])])],
    businessViabilityNote: viability.note,
    buildOnlyIf: viability.buildOnlyIf,
    serpArchetypeConfidence: serpInference.confidence,
  };
  return profile;
}

function genericDifferentiators(archetype) {
  const common = [
    "Make the first screen match the dominant task, not a generic introduction.",
    "Use SERP patterns as evidence, but do not copy competitor structure blindly.",
    "Show sources, dates, methodology, or limits wherever the claim can change or affect decisions.",
  ];
  const byType = {
    hybrid_tool_guide: [
      "Expose the calculation method and a worked example.",
      "Show result details, not only one final number.",
    ],
    interactive_converter: [
      "Show source and timestamp for dynamic values.",
      "Provide useful fallback when live data is unavailable.",
    ],
    comparison_page: [
      "Use scenario-based recommendations instead of one universal winner.",
      "Put a real comparison table near the top.",
    ],
    commercial_comparison_page: [
      "Disclose methodology, affiliate relationships, and freshness of pricing.",
      "Label recommendations by best-fit scenario.",
    ],
    how_to_guide: [
      "Separate required steps from optional advice.",
      "Add risk and expert-help thresholds.",
    ],
    hub_or_disambiguation: [
      "Split competing meanings into clear paths.",
      "Avoid pretending one URL satisfies all intents equally.",
    ],
  };
  return [...common, ...(byType[archetype] || [])];
}

function groupBy(items, keyFn) {
  const groups = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return groups;
}

function count(items, keyFn) {
  const result = {};
  for (const item of items) {
    const key = keyFn(item);
    result[key] = (result[key] || 0) + 1;
  }
  return result;
}

function pct(n, d) {
  return d ? Number((n / d).toFixed(2)) : 0;
}

function cleanSnippet(text, max = 220) {
  const normalized = normalizeText(text);
  if (normalized.length <= max) return normalized;
  const cut = normalized.slice(0, max + 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > Math.floor(max * 0.6) ? cut.slice(0, lastSpace) : cut.slice(0, max))
    .replace(/[,:;.!?\s]+$/g, "")
    .trim();
}

function usable(items) {
  return items.filter((item) => ["good", "partial"].includes(item.extractionQuality));
}

function topicEvidence(page, regex) {
  const haystack = [
    page.serpTitle,
    page.serpPassage,
    page.title,
    page.metaDescription,
    page.h1?.join(" "),
    page.headings?.map((h) => h.text).join(" "),
    page.mainTextSample,
  ]
    .filter(Boolean)
    .join(" ");
  return regex.test(haystack);
}

function analyzeTopics(profile, pages) {
  return profile.topics.map((topic) => {
    const matchedPages = pages.filter((page) => topicEvidence(page, topic.regex));
    return {
      id: topic.id,
      label: topic.label,
      terms: topic.terms,
      coverage: matchedPages.length,
      coverageRatio: pct(matchedPages.length, pages.length),
      examples: matchedPages.slice(0, 3).map((page) => ({
        position: page.position,
        title: page.h1?.[0] || page.title || page.serpTitle,
      })),
    };
  });
}

function moduleSignals(pages) {
  const withTables = pages.filter((page) => page.tableCount > 0).length;
  const withForms = pages.filter((page) => page.formCount > 0 || page.interactiveElements?.inputs > 2).length;
  const withSchema = pages.filter((page) => page.schemaTypes?.length > 0).length;
  const withArticle = pages.filter((page) => page.hasArticle || page.schemaTypes?.some((t) => /Article|BlogPosting|TechArticle/.test(t))).length;
  const withFaq = pages.filter((page) => page.schemaTypes?.includes("FAQPage") || page.headings?.some((h) => /faq|частые|questions/i.test(h.text))).length;
  const withVideo = pages.filter((page) => /youtube\.com/.test(page.url) || page.interactiveElements?.iframes > 0).length;
  return {
    tables: { count: withTables, ratio: pct(withTables, pages.length) },
    formsOrInputs: { count: withForms, ratio: pct(withForms, pages.length) },
    structuredData: { count: withSchema, ratio: pct(withSchema, pages.length) },
    articleSignals: { count: withArticle, ratio: pct(withArticle, pages.length) },
    faqSignals: { count: withFaq, ratio: pct(withFaq, pages.length) },
    videoSignals: { count: withVideo, ratio: pct(withVideo, pages.length) },
  };
}

function headingRelevant(profile, text) {
  if (!text || BOILERPLATE_HEADING_RE.test(text)) return false;
  if (profile.topics.some((topic) => topic.regex.test(text))) return true;
  const queryTerms = tokenize(profile.query, profile.locale);
  return queryTerms.some((term) => text.toLowerCase().includes(term));
}

function collectHeadings(profile, pages) {
  const headingCounts = new Map();
  for (const page of pages) {
    if (/youtube\.com\/watch|youtu\.be\//i.test(page.url || "")) continue;
    for (const heading of page.headings || []) {
      if (!["h1", "h2", "h3"].includes(heading.level)) continue;
      const key = normalizeText(heading.text);
      if (key.length < 4 || key.length > 140) continue;
      if (!headingRelevant(profile, key)) continue;
      headingCounts.set(key, (headingCounts.get(key) || 0) + 1);
    }
  }
  return [...headingCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 18)
    .map(([text, count]) => ({ text, count }));
}

function gapList(profile, topicCoverage, signals) {
  const lowCoverage = topicCoverage
    .filter((topic) => topic.coverageRatio <= 0.3)
    .slice(0, 8)
    .map((topic) => topic.label || topic.id);
  const gaps = [...profile.differentiators];
  if (lowCoverage.length) gaps.push(`Low observed topic coverage: ${lowCoverage.join(", ")}.`);
  if (signals.tables.ratio < 0.4 && profile.requiredModules.some((module) => /table|comparison/.test(module))) {
    gaps.push("Make the table a first-class visible module instead of burying comparison in prose.");
  }
  if (signals.formsOrInputs.ratio < 0.4 && profile.requiredModules.some((module) => /tool|converter|calculator/.test(module))) {
    gaps.push("Ensure the core interactive module has an SSR/prerendered shell and visible labels.");
  }
  return [...new Set(gaps)];
}

function uniq(items) {
  return [...new Set((items || []).map((item) => normalizeText(item)).filter(Boolean))];
}

function coveredTopics(topicCoverage, minRatio = 0.3) {
  return topicCoverage
    .filter((topic) => topic.coverageRatio >= minRatio && !/^query_|^serp_/i.test(topic.id))
    .map((topic) => topic.label || topic.id)
    .slice(0, 12);
}

function serpTopicTerms(topicCoverage) {
  return topicCoverage
    .filter((topic) => String(topic.id || "").startsWith("serp_") && topic.coverage > 0)
    .map((topic) => topic.label || topic.id)
    .slice(0, 10);
}

function localeText(locale, ru, en) {
  return String(locale || "").toLowerCase().startsWith("ru") ? ru : en;
}

const MODULE_LABELS = {
  quick_answer: ["Короткий ответ", "Quick answer"],
  quick_definition: ["Короткое определение", "Quick definition"],
  plain_language_example: ["Пример простым языком", "Plain-language example"],
  term_breakdown: ["Разбор термина", "Term breakdown"],
  use_cases: ["Сценарии использования", "Use cases"],
  common_mistakes: ["Типичные ошибки", "Common mistakes"],
  related_terms: ["Связанные понятия", "Related terms"],
  step_by_step: ["Пошаговый порядок", "Step-by-step process"],
  requirements: ["Условия и требования", "Requirements"],
  documents_or_tools: ["Что подготовить", "What to prepare"],
  risks: ["Риски, ограничения и ошибки", "Risks, limits and mistakes"],
  steps: ["Шаги", "Steps"],
  documents: ["Документы", "Documents"],
  date: ["Дата актуальности", "Freshness date"],
  when_to_get_help: ["Когда нужен специалист", "When to get help"],
  last_updated: ["Источники и дата обновления", "Sources and last updated"],
  interactive_tool: ["Инструмент", "Interactive tool"],
  result_block: ["Результат", "Result"],
  methodology: ["Методика", "Methodology"],
  worked_examples: ["Примеры", "Worked examples"],
  limitations: ["Ограничения", "Limitations"],
  source_date: ["Источники и дата", "Sources and date"],
  faq_if_visible: ["Частые вопросы, если они видимы в контенте", "FAQ if visible"],
  converter: ["Конвертер", "Converter"],
  live_or_cached_source: ["Источник данных", "Data source"],
  timestamp: ["Время обновления", "Timestamp"],
  inverse_conversion: ["Обратное преобразование", "Inverse conversion"],
  historical_context_if_needed: ["Контекст изменения данных", "Historical context if needed"],
  fallback_state: ["Состояние при недоступности данных", "Unavailable-source fallback"],
  quick_verdict: ["Короткий вывод", "Quick verdict"],
  comparison_table: ["Таблица сравнения", "Comparison table"],
  criteria: ["Критерии выбора", "Criteria"],
  pricing_or_feature_date: ["Дата проверки цены или функций", "Pricing or feature date"],
  disclosure: ["Раскрытие методологии и интересов", "Disclosure"],
  shortlist: ["Короткий список", "Shortlist"],
  selection_criteria: ["Критерии отбора", "Selection criteria"],
  best_for_labels: ["Метки best-for", "Best-for labels"],
  pricing_date: ["Дата проверки цен", "Pricing date"],
  reference_value: ["Справочное значение", "Reference value"],
  units: ["Единицы измерения", "Units"],
  source: ["Источник", "Source"],
  table: ["Таблица", "Table"],
  related_items: ["Связанные значения", "Related items"],
  service_area: ["Зона обслуживания", "Service area"],
  contacts: ["Контакты", "Contacts"],
  pricing_or_estimate: ["Цена или оценка", "Pricing or estimate"],
  reviews: ["Отзывы и доказательства", "Reviews and proof"],
  trust_proofs: ["Доказательства доверия", "Trust proofs"],
  faq: ["Частые вопросы", "FAQ"],
  current_status: ["Актуальный статус", "Current status"],
  last_checked: ["Дата проверки", "Last checked"],
  official_sources: ["Официальные источники", "Official sources"],
  timeline: ["Хронология", "Timeline"],
  rumor_control: ["Что подтверждено и что нет", "Rumor control"],
  cautious_summary: ["Осторожное резюме", "Cautious summary"],
  red_flags: ["Красные флаги", "Red flags"],
  when_to_see_doctor: ["Когда обращаться к врачу", "When to see a doctor"],
  sources: ["Источники", "Sources"],
  expert_review: ["Экспертная проверка", "Expert review"],
  intent_split: ["Разделение интентов", "Intent split"],
  hub_links: ["Пути и ссылки хаба", "Hub links"],
  definitions: ["Определения", "Definitions"],
  popular_paths: ["Популярные пути", "Popular paths"],
  avoid_overreach: ["Границы охвата", "Avoid overreach"],
  core_sections: ["Основные разделы", "Core sections"],
  examples: ["Примеры", "Examples"],
  sources_if_needed: ["Источники при необходимости", "Sources if needed"],
};

function labelForId(id, locale) {
  const pair = MODULE_LABELS[id];
  if (pair) return pair[String(locale || "").toLowerCase().startsWith("ru") ? 0 : 1];
  return String(id || "")
    .replace(/^query_|^serp_/, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function naturalList(items, locale, max = 3) {
  const values = uniq(items).slice(0, max);
  if (!values.length) return "";
  const joiner = String(locale || "").toLowerCase().startsWith("ru") ? " и " : " and ";
  if (values.length === 1) return values[0];
  return `${values.slice(0, -1).join(", ")}${joiner}${values.at(-1)}`;
}

function titleVariantsFromPages(pages, profile, max = 6) {
  const queryTerms = tokenize(profile.query, profile.locale);
  const values = [];
  for (const page of pages || []) {
    for (const value of [page.serpTitle, page.title, ...(page.h1 || [])]) {
      const cleaned = cleanSnippet(value, 90).replace(/\s+[|—–-]\s+.+$/g, "").trim();
      if (!cleaned || cleaned.length < 6) continue;
      if (cleaned.length > 78) continue;
      if (!queryTerms.some((term) => cleaned.toLowerCase().includes(term))) continue;
      if (/отзывы|контакт|корзина|подпис|цены на услуги|комментар/i.test(cleaned)) continue;
      values.push(cleaned);
    }
  }
  return uniq(values).slice(0, max);
}

function moduleSectionTitle(profile, module) {
  const label = labelForId(module, profile.locale);
  const query = titleCaseQuery(profile.query);
  if (module === "interactive_tool" || /calculator|converter|input|form|калькулятор|конвертер/i.test(module)) {
    return profile.locale.startsWith("ru") ? `${label}: ${query}` : `${label}: ${query}`;
  }
  return label;
}

function buildDynamicOutline(profile, entityMap, topicCoverage, headings, sourcePlan) {
  const lines = [["H1", profile.h1 || titleCaseQuery(profile.query)]];
  const seen = new Set([lines[0][1].toLowerCase()]);
  const add = (level, text) => {
    const cleaned = normalizeText(text);
    const key = cleaned.toLowerCase();
    if (!cleaned || seen.has(key)) return;
    seen.add(key);
    lines.push([level, cleaned]);
  };

  for (const module of profile.requiredModules) {
    if (/faq_if_visible/i.test(module) && !(headings || []).some((heading) => /faq|частые|вопрос/i.test(heading.text))) continue;
    add("H2", moduleSectionTitle(profile, module));
  }

  const lowCoverage = (topicCoverage || [])
    .filter((topic) => !/^query_|^serp_/i.test(topic.id) && topic.coverageRatio <= 0.55)
    .map((topic) => labelForId(topic.id || topic.label, profile.locale))
    .filter(Boolean);
  if (lowCoverage.length) {
    add("H2", profile.locale.startsWith("ru") ? `Что раскрыть лучше конкурентов: ${naturalList(lowCoverage, profile.locale, 4)}` : `Opportunities to cover better: ${naturalList(lowCoverage, profile.locale, 4)}`);
  }

  if (sourcePlan?.required) {
    add("H2", profile.locale.startsWith("ru") ? "Источники, ограничения и дата проверки" : "Sources, limits and checked date");
  }
  return lines.slice(0, 16);
}

function buildEntityMap(profile, pages, topicCoverage) {
  const queryTerms = tokenize(profile.query, profile.locale);
  const covered = coveredTopics(topicCoverage);
  const relatedFromSerp = serpTopicTerms(topicCoverage);
  const primaryEntity = titleCaseQuery(profile.query);
  const synonyms = uniq([profile.query, titleCaseQuery(profile.query), ...titleVariantsFromPages(pages, profile, 4)]);
  const actionsByType = {
    hybrid_tool_guide: [localeText(profile.locale, "рассчитать", "calculate"), localeText(profile.locale, "понять результат", "understand the result")],
    interactive_converter: [localeText(profile.locale, "конвертировать", "convert"), localeText(profile.locale, "проверить источник", "check the source")],
    article_guide_definition: [localeText(profile.locale, "понять определение", "understand the definition"), localeText(profile.locale, "посмотреть пример", "see an example")],
    how_to_guide: [localeText(profile.locale, "выполнить шаги", "follow the steps"), localeText(profile.locale, "избежать ошибок", "avoid mistakes")],
    comparison_page: [localeText(profile.locale, "сравнить варианты", "compare options"), localeText(profile.locale, "выбрать сценарий", "choose a scenario")],
    commercial_comparison_page: [localeText(profile.locale, "выбрать продукт", "shortlist products"), localeText(profile.locale, "сравнить цену и функции", "compare pricing and features")],
    reference_database: [localeText(profile.locale, "получить значение", "get the value"), localeText(profile.locale, "проверить единицы", "check units")],
    local_service_page: [localeText(profile.locale, "найти услугу", "find a service"), localeText(profile.locale, "связаться", "contact")],
    freshness_page: [localeText(profile.locale, "проверить актуальный статус", "check current status"), localeText(profile.locale, "отделить факты от слухов", "separate facts from rumors")],
    ymyl_medical_guide: [localeText(profile.locale, "понять тему осторожно", "understand cautiously"), localeText(profile.locale, "понять когда обращаться к специалисту", "know when to seek help")],
    hub_or_disambiguation: [localeText(profile.locale, "выбрать смысл запроса", "choose the query meaning"), localeText(profile.locale, "перейти к нужному пути", "pick the right path")],
  };
  const attributes = uniq([
    ...covered.slice(0, 8).map((item) => labelForId(item, profile.locale)),
    ...profile.requiredModules.slice(0, 8).map((item) => labelForId(item, profile.locale)),
  ]);
  const relatedEntities = uniq(relatedFromSerp.length ? relatedFromSerp : topTermsFromPages(pages, profile.locale, 8));
  const authorityEntities = uniq([
    ...profile.trust.filter((item) => /source|источник|official|официаль|expert|review|дата|updated|methodology|методолог/i.test(item)),
    localeText(profile.locale, "источники страницы", "page sources"),
  ]);
  const riskEntities = uniq([
    ...profile.trust.filter((item) => /risk|огранич|disclaimer|expert|medical|legal|financial|диагноз|privacy|security/i.test(item)),
    ...profile.differentiators.filter((item) => /not|avoid|нельзя|огранич|without|risk/i.test(item)).slice(0, 3),
  ]);
  const excludedEntities = [
    localeText(profile.locale, "универсальная SEO-страница без выполнения задачи", "generic SEO page without task completion"),
    localeText(profile.locale, "schema для невидимого контента", "schema for invisible content"),
  ];
  const relations = [
    `${primaryEntity} -> ${localeText(profile.locale, "основная задача пользователя", "main user task")} -> ${profile.archetype}`,
    `${primaryEntity} -> ${localeText(profile.locale, "обязательные модули", "required modules")} -> ${profile.requiredModules.slice(0, 4).map((item) => labelForId(item, profile.locale)).join(", ")}`,
    `${primaryEntity} -> ${localeText(profile.locale, "ограничения доверия", "trust limits")} -> ${profile.trust.slice(0, 3).join(", ")}`,
  ];
  return {
    primaryEntity,
    synonyms: uniq(synonyms),
    attributes: uniq(attributes),
    actions: uniq(actionsByType[profile.archetype] || actionsByType.generic_guide || ["understand"]),
    relatedEntities: uniq(relatedEntities),
    authorityEntities: uniq(authorityEntities),
    riskEntities: uniq(riskEntities),
    excludedEntities: uniq(excludedEntities),
    relations: uniq(relations),
  };
}

function charCount(text) {
  return [...String(text || "")].length;
}

function metaCandidate(title, description, basis = []) {
  return {
    title,
    titleLength: charCount(title),
    description,
    descriptionLength: charCount(description),
    basis,
  };
}

function buildMetaSuggestions(profile, entityMap) {
  const primary = entityMap.primaryEntity;
  const labels = profile.requiredModules
    .map((module) => labelForId(module, profile.locale))
    .filter((label) => !/faq|частые вопросы/i.test(label));
  const titleSupport = naturalList(labels, profile.locale, 2);
  const titleBase = titleSupport ? `${primary}: ${titleSupport}` : primary;
  const titleAlt = profile.archetype === "hub_or_disambiguation"
    ? `${primary}: ${localeText(profile.locale, "значения и варианты", "meanings and options")}`
    : titleCaseQuery(profile.query);
  const visibleModules = naturalList(labels, profile.locale, 3);
  const action = entityMap.actions[0] || localeText(profile.locale, "решить задачу", "complete the task");
  const description = profile.locale.startsWith("ru")
    ? `Поможет ${action}: ${visibleModules}. Указаны ограничения, источники и дата проверки.`
    : `Helps users ${action}: ${visibleModules}. Includes limits, sources, and checked date.`;
  const variants = [
    metaCandidate(cleanSnippet(titleBase, 68), cleanSnippet(description, 160), ["primary entity", "visible module labels", "user task"]),
    metaCandidate(cleanSnippet(titleAlt, 68), cleanSnippet(description, 160), ["query match", "user task", "visible module labels"]),
  ];
  return {
    selected: variants[0],
    variants,
    rules: [
      "Generate one unique title/description per URL.",
      "Use page-specific facts and visible modules rather than keyword lists.",
      "Keep metadata aligned with the selected page type and trust limits.",
    ],
  };
}

function buildQueryCluster(profile, entityMap) {
  const isHub = profile.archetype === "hub_or_disambiguation";
  const includedVariants = entityMap.synonyms
    .filter((item) => canonicalQueryText(item) !== canonicalQueryText(profile.query))
    .filter((item) => item.length <= 78 && !/:/.test(item))
    .slice(0, 4);
  return {
    primaryQuery: profile.query,
    decision: isHub ? "hub_or_split" : "single_page",
    canonicalIntent: profile.userTask,
    includedQueries: uniq([profile.query, ...includedVariants]),
    excludedQueries: [],
    splitCandidates: isHub
      ? entityMap.relatedEntities.slice(0, 4).map((entity) => ({
          query: entity,
          reason: "ambiguous head term needs a focused child page or hub path",
        }))
      : [],
    rationale: [
      isHub ? "Query is broad or ambiguous enough to require split paths." : "Current evidence supports one focused page.",
      "Included intents are derived from the seed query, SERP variants, entity scope and selected page archetype.",
    ],
  };
}

function sourceFact(id, claim, preferredSources = [], options = {}) {
  return {
    id,
    claim,
    preferredSources,
    status: "needs_refresh",
    lastChecked: null,
    reviewerRequired: Boolean(options.reviewerRequired),
    requiredForPublication: options.requiredForPublication !== false,
  };
}

function buildSourcePlan(profile, entityMap) {
  const highRisk = isYMYL(profile.query, profile.archetype);
  const freshnessRequired =
    highRisk ||
    profile.archetype === "freshness_page" ||
    profile.requiredModules.some((module) => /source|official|last_checked|timestamp|pricing|date|live/i.test(module));

  const facts = [];
  if (freshnessRequired) {
    const preferredSources = entityMap.authorityEntities.length
      ? entityMap.authorityEntities
      : [localeText(profile.locale, "официальные или первичные источники", "official or primary sources")];
    facts.push(
      sourceFact(
        "core_claims",
        `Core claims for "${profile.query}" must be supported by primary sources, official documentation, or an explicit methodology.`,
        preferredSources,
        { reviewerRequired: highRisk },
      ),
    );
    if (profile.requiredModules.some((module) => /step|requirement|document|tool|criteria|methodology|source/i.test(module))) {
      facts.push(
        sourceFact(
          "process_requirements",
          `Steps, requirements, required data/documents, or selection criteria for "${profile.query}" must be checked before publication.`,
          preferredSources,
          { reviewerRequired: highRisk },
        ),
      );
    }
    if (profile.requiredModules.some((module) => /pricing|price|cost|fee|date|timestamp|current|last_checked|source_date|updated/i.test(module))) {
      facts.push(
        sourceFact(
          "dates_values_and_costs",
          `Dates, prices, fees, dynamic values, statuses, and other changeable facts for "${profile.query}" need a visible checked date.`,
          preferredSources,
          { reviewerRequired: highRisk },
        ),
      );
    }
    if (profile.requiredModules.some((module) => /risk|limit|disclaimer|red_flags|avoid|review|help|doctor|expert/i.test(module)) || highRisk) {
      facts.push(
        sourceFact(
          "limits_and_review_boundary",
          `Limits, exclusions, warnings, and expert-review boundaries for "${profile.query}" must be explicit and sourced.`,
          preferredSources,
          { reviewerRequired: highRisk },
        ),
      );
    }
  }
  if (profile.requiredModules.some((module) => /pricing|price/i.test(module))) {
    facts.push(sourceFact("pricing_freshness", "Pricing claims must have a checked date and visible source.", ["official vendor pages"]));
  }
  if (profile.requiredModules.some((module) => /current|official|last_checked/i.test(module))) {
    facts.push(sourceFact("current_status", "Current-status claims must be verified against official sources.", ["official source"]));
  }

  return {
    required: freshnessRequired,
    riskLevel: highRisk ? "high" : freshnessRequired ? "freshness_or_source_sensitive" : "standard",
    reviewerRequired: highRisk,
    publicationStatus: freshnessRequired ? "blocked_until_sources_refreshed" : "source_refresh_optional",
    facts,
    requiredVisibleBlocks: uniq([
      ...profile.requiredModules.filter((module) => /source|official|last_checked|timestamp|date|disclaimer|limitations/i.test(module)),
      freshnessRequired ? "last_updated" : null,
    ]),
  };
}

function componentFromModule(module, profile) {
  return {
    id: module,
    label: labelForId(module, profile.locale),
    type: /tool|calculator|converter|input|form/i.test(module)
      ? "interactive_module"
      : /table|comparison/i.test(module)
        ? "table"
        : /source|date|official|review|disclaimer|limitations/i.test(module)
          ? "trust_block"
          : "content_block",
    required: true,
    visible: true,
    aboveTheFold: /quick|tool|calculator|converter|result|current_status|shortlist|verdict/i.test(module),
    purpose: localeText(
      profile.locale,
      `Закрыть часть пользовательской задачи: ${labelForId(module, profile.locale)}.`,
      `Satisfy this part of the user task: ${labelForId(module, profile.locale)}.`,
    ),
  };
}

function buildImplementationContract(profile, entityMap, sourcePlan) {
  return {
    contractStatus: sourcePlan.required ? "ready_for_build_after_source_refresh" : "ready_for_build",
    components: profile.requiredModules.map((module) => componentFromModule(module, profile)),
    acceptanceTests: uniq([
      "First screen matches the selected page decision.",
      "Required modules are visible, not hidden only for SEO.",
      "Trust/source/date blocks render when required by the source plan.",
      "Structured data recommendations map to visible components only.",
      "Meta title and description use human-visible content labels, not internal module ids.",
      "Outline sections are derived from required modules, topic gaps, and SERP signals for this query.",
      ...entityMap.actions.map((action) => `User can ${action}.`),
    ]),
    schemaDependencies: profile.schema,
  };
}

function buildSerpFeatures(profile, pages, signals) {
  const providerDataMode = pages.find((page) => page.serpDataMode)?.serpDataMode || "unknown";
  const providerCanExposeFullFeatures = /full_serp_features/i.test(providerDataMode);
  const toolPressure = ["hybrid_tool_guide", "interactive_converter", "reference_database"].includes(profile.archetype);
  const videoObserved = signals.videoSignals.count > 0;
  const localIntent = profile.archetype === "local_service_page";
  const zeroClickRisk =
    profile.archetype === "interactive_converter"
      ? "high"
      : toolPressure
        ? "medium"
        : ["article_guide_definition", "reference_database", "freshness_page"].includes(profile.archetype)
          ? "medium"
          : "low";

  return {
    providerDataMode,
    providerCanExposeFullFeatures,
    observedFromOrganic: {
      organicToolRatio: signals.formsOrInputs.ratio,
      organicTableRatio: signals.tables.ratio,
      videoSignals: videoObserved,
      localIntent,
    },
    features: {
      directAnswer: providerCanExposeFullFeatures ? "not_detected" : "unknown_provider_limited",
      calculatorWidget: providerCanExposeFullFeatures ? "not_detected" : toolPressure ? "possible_not_observed" : "unknown_provider_limited",
      peopleAlsoAsk: providerCanExposeFullFeatures ? [] : "unknown_provider_limited",
      videos: videoObserved,
      localPack: providerCanExposeFullFeatures ? localIntent : "unknown_provider_limited",
    },
    zeroClickRisk,
    limitations: providerCanExposeFullFeatures
      ? []
      : ["Current SERP provider/cache exposes organic title/snippet URLs, not complete SERP feature inventory."],
  };
}

function hasInternalModuleId(text) {
  return /\b[a-z]+(?:_[a-z0-9]+){1,}\b/.test(String(text || ""));
}

function metaQuality(metaSuggestions) {
  const selected = metaSuggestions?.selected || {};
  const text = `${selected.title || ""}\n${selected.description || ""}`;
  return (
    Boolean(selected.title) &&
    Boolean(selected.description) &&
    !hasInternalModuleId(text) &&
    !/\.\.\./.test(text) &&
    selected.titleLength >= 18 &&
    selected.titleLength <= 70 &&
    selected.descriptionLength >= 70 &&
    selected.descriptionLength <= 170
  );
}

function outlineQuality(queryAnalysis) {
  const outline = queryAnalysis.outline || [];
  const texts = outline.map(([, text]) => text).join("\n");
  const requiredLabels = (queryAnalysis.implementationContract?.components || [])
    .map((component) => component.label || component.id)
    .filter((label) => !/faq|частые/i.test(label));
  const matchedRequired = requiredLabels.filter((label) => texts.toLowerCase().includes(String(label).toLowerCase())).length;
  return outline.length >= 6 && !hasInternalModuleId(texts) && matchedRequired >= Math.min(3, requiredLabels.length);
}

function sourcePlanQuality(queryAnalysis) {
  const plan = queryAnalysis.sourcePlan;
  if (!plan || !Array.isArray(plan.facts)) return false;
  if (!plan.required) return true;
  return plan.facts.length >= 2 && plan.requiredVisibleBlocks?.length > 0;
}

function scoreFullAnalysis(queryAnalysis) {
  const checks = [
    ["usable_extraction", queryAnalysis.testedUrls === 0 || queryAnalysis.usableRatio >= 0.65],
    ["dominant_page_type", queryAnalysis.testedUrls === 0 || queryAnalysis.pageTypeConfidence >= 0.35],
    ["profile_is_generic", queryAnalysis.profileSource.startsWith("generic_")],
    ["search_expectation", Boolean(queryAnalysis.searchExpectation)],
    ["topic_coverage", queryAnalysis.topicCoverage.length >= 8],
    ["gap_opportunities", queryAnalysis.gaps.length >= 4],
    ["outline_specific", outlineQuality(queryAnalysis)],
    ["editor_frontend_briefs", queryAnalysis.editorBrief.length > 0 && queryAnalysis.frontendBrief.length > 0],
    ["trust_and_schema", queryAnalysis.trustRequirements.length > 0 && queryAnalysis.schemaGuidance.length > 0],
    ["business_viability", Boolean(queryAnalysis.businessViabilityNote) && queryAnalysis.buildOnlyIf.length > 0],
    ["entity_map", Boolean(queryAnalysis.entityMap?.primaryEntity) && queryAnalysis.entityMap?.attributes?.length >= 3],
    ["meta_suggestions", metaQuality(queryAnalysis.metaSuggestions)],
    ["query_cluster", Boolean(queryAnalysis.queryCluster?.decision) && Boolean(queryAnalysis.queryCluster?.primaryQuery)],
    ["source_plan", sourcePlanQuality(queryAnalysis)],
    ["implementation_contract", Boolean(queryAnalysis.implementationContract?.components?.length) && Boolean(queryAnalysis.implementationContract?.acceptanceTests?.length)],
    ["serp_features", Boolean(queryAnalysis.serpFeatures?.zeroClickRisk) && Boolean(queryAnalysis.serpFeatures?.providerDataMode)],
  ];
  return {
    passed: checks.filter(([, pass]) => pass).length,
    total: checks.length,
    checks: checks.map(([name, pass]) => ({ name, pass })),
  };
}

export function analyzeQuery(queryId, pages, metadata = {}) {
  const profile = buildProfile(queryId, pages, metadata);
  const usablePages = usable(pages);
  const blockedPages = pages.filter((page) => ["blocked", "poor"].includes(page.extractionQuality));
  const typeCounts = count(usablePages, (page) => page.detectedPageType);
  const dominantType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "query_inferred";
  const pageTypeConfidence =
    usablePages.length > 0 ? pct(typeCounts[dominantType] || 0, usablePages.length) : profile.serpArchetypeConfidence;
  const signals = moduleSignals(usablePages);
  const topicCoverage = analyzeTopics(profile, usablePages.length ? usablePages : pages);
  const headings = collectHeadings(profile, usablePages);
  const gaps = gapList(profile, topicCoverage, signals);
  const entityMap = buildEntityMap(profile, usablePages.length ? usablePages : pages, topicCoverage);
  const metaSuggestions = buildMetaSuggestions(profile, entityMap);
  const queryCluster = buildQueryCluster(profile, entityMap);
  const sourcePlan = buildSourcePlan(profile, entityMap);
  const outline = buildDynamicOutline(profile, entityMap, topicCoverage, headings, sourcePlan);
  const implementationContract = buildImplementationContract(profile, entityMap, sourcePlan);
  const serpFeatures = buildSerpFeatures(profile, usablePages.length ? usablePages : pages, signals);
  const usableRatio = pct(usablePages.length, pages.length);
  const confidence = Number(
    Math.min(
      0.95,
      0.55 +
        (pages.length ? usableRatio * 0.2 : 0) +
        (pageTypeConfidence || profile.serpArchetypeConfidence || 0.45) * 0.2,
    ).toFixed(2),
  );
  const result = {
    queryId,
    query: profile.query,
    locale: profile.locale,
    profileSource: profile.profileSource,
    userTask: profile.userTask,
    recommendedPageType: profile.archetype,
    dominantParsedPageType: dominantType,
    pageTypeConfidence,
    confidence,
    testedUrls: pages.length,
    usableUrls: usablePages.length,
    usableRatio,
    blockedUrls: blockedPages.map((page) => ({
      position: page.position,
      url: page.url,
      status: page.status,
      reason: page.extractionReasons?.join(", ") || page.extractionQuality,
    })),
    searchExpectation: `${profile.archetype}; ${profile.firstScreen}`,
    moduleSignals: signals,
    serpFeatures,
    topicCoverage,
    observedHeadings: headings,
    queryCluster,
    pageDecision: {
      recommendation: profile.archetype === "hub_or_disambiguation" ? "build_hub_or_split" : "build",
      pageType: profile.archetype,
      aboveTheFold: profile.firstScreen,
      requiredModules: profile.requiredModules,
      doNotBuild: ["generic long-form SEO article", "FAQ-only page", "schema for invisible content"],
      confidence,
    },
    businessViabilityNote: profile.businessViabilityNote,
    buildOnlyIf: profile.buildOnlyIf,
    gaps,
    entityMap,
    metaSuggestions,
    sourcePlan,
    implementationContract,
    outline,
    editorBrief: profile.editorNotes,
    frontendBrief: profile.frontendNotes,
    trustRequirements: profile.trust,
    schemaGuidance: profile.schema,
  };
  result.qualityScore = scoreFullAnalysis(result);
  return result;
}

export function analyzeMatrix(matrix, metadataById = {}) {
  const grouped = groupBy(matrix.results || [], (item) => item.queryId);
  const queryIds = [...new Set([...(matrix.queryIds || []), ...grouped.keys(), ...Object.keys(metadataById)])].filter((id) =>
    grouped.has(id),
  );
  return {
    generatedAt: new Date().toISOString(),
    source: matrix.source || "data/parser-output/parsed-matrix.json",
    mode: "parsed HTML + Playwright fallback output",
    queries: queryIds.map((queryId) => analyzeQuery(queryId, grouped.get(queryId) || [], metadataById[queryId] || {})),
  };
}

function mdTable(headers, rows) {
  const safe = (value) => String(value ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
  return [
    `| ${headers.map(safe).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(safe).join(" | ")} |`),
  ].join("\n");
}

export function renderMarkdown(analysis) {
  const lines = [];
  lines.push("# Full SERP Analysis");
  lines.push("");
  lines.push(`Date: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("## 1. Scope");
  lines.push("");
  lines.push(`- Source: \`${analysis.source}\``);
  lines.push(`- Mode: ${analysis.mode}`);
  lines.push(`- Queries: ${analysis.queries.map((q) => q.queryId).join(", ")}`);
  lines.push("- Profile engine: generic query + SERP profile builder");
  lines.push("");
  lines.push("## 2. Executive Summary");
  lines.push("");
  lines.push(
    mdTable(
      ["ID", "Query", "Decision", "Usable", "Confidence", "Quality"],
      analysis.queries.map((q) => [
        q.queryId,
        q.query,
        q.recommendedPageType,
        `${q.usableUrls}/${q.testedUrls}`,
        q.confidence,
        `${q.qualityScore.passed}/${q.qualityScore.total}`,
      ]),
    ),
  );
  lines.push("");

  for (const q of analysis.queries) {
    lines.push(`## ${q.queryId}. ${q.query}`);
    lines.push("");
    lines.push(`Profile source: \`${q.profileSource}\``);
    lines.push("");
    lines.push(`User task: ${q.userTask}`);
    lines.push("");
    lines.push(`Search expectation: ${q.searchExpectation}`);
    lines.push("");
    lines.push(`Recommended page type: \`${q.recommendedPageType}\``);
    lines.push("");
    lines.push(`Confidence: ${q.confidence}; usable extraction: ${q.usableUrls}/${q.testedUrls}.`);
    lines.push("");
    lines.push("### SERP Evidence");
    lines.push("");
    lines.push(
      mdTable(
        ["Signal", "Value"],
        [
          ["Dominant parsed page type", `${q.dominantParsedPageType} (${q.pageTypeConfidence})`],
          ["Tables", `${q.moduleSignals.tables.count}/${q.usableUrls}`],
          ["Forms/inputs", `${q.moduleSignals.formsOrInputs.count}/${q.usableUrls}`],
          ["Structured data", `${q.moduleSignals.structuredData.count}/${q.usableUrls}`],
          ["Article signals", `${q.moduleSignals.articleSignals.count}/${q.usableUrls}`],
          ["FAQ signals", `${q.moduleSignals.faqSignals.count}/${q.usableUrls}`],
          ["Video signals", `${q.moduleSignals.videoSignals.count}/${q.usableUrls}`],
        ],
      ),
    );
    lines.push("");
    lines.push("### SERP Features");
    lines.push("");
    lines.push(
      mdTable(
        ["Feature", "Value"],
        [
          ["Provider data mode", q.serpFeatures.providerDataMode],
          ["Full feature inventory available", q.serpFeatures.providerCanExposeFullFeatures ? "yes" : "no"],
          ["Direct answer", q.serpFeatures.features.directAnswer],
          ["Calculator/widget", q.serpFeatures.features.calculatorWidget],
          ["People Also Ask", Array.isArray(q.serpFeatures.features.peopleAlsoAsk) ? q.serpFeatures.features.peopleAlsoAsk.join("; ") || "-" : q.serpFeatures.features.peopleAlsoAsk],
          ["Videos", q.serpFeatures.features.videos ? "yes" : "no"],
          ["Local pack", q.serpFeatures.features.localPack],
          ["Zero-click risk", q.serpFeatures.zeroClickRisk],
          ["Organic tool ratio", q.serpFeatures.observedFromOrganic.organicToolRatio],
          ["Organic table ratio", q.serpFeatures.observedFromOrganic.organicTableRatio],
        ],
      ),
    );
    if (q.serpFeatures.limitations.length) {
      lines.push("");
      lines.push("Limitations:");
      for (const limitation of q.serpFeatures.limitations) lines.push(`- ${limitation}`);
    }
    lines.push("");
    if (q.blockedUrls.length) {
      lines.push("Blocked/limited URLs excluded from detailed gap conclusions:");
      for (const item of q.blockedUrls) {
        lines.push(`- #${item.position}: ${item.url} (${item.status}; ${item.reason})`);
      }
      lines.push("");
    }
    lines.push("### Topic Coverage");
    lines.push("");
    lines.push(
      mdTable(
        ["Topic", "Coverage", "Examples"],
        q.topicCoverage.map((topic) => [
          topic.label || topic.id,
          `${topic.coverage}/${q.usableUrls || q.testedUrls || 0}`,
          topic.examples.map((e) => `#${e.position} ${cleanSnippet(e.title, 80)}`).join("; "),
        ]),
      ),
    );
    lines.push("");
    lines.push("### Entity Map");
    lines.push("");
    lines.push(`Primary entity: ${q.entityMap.primaryEntity}`);
    lines.push("");
    lines.push(
      mdTable(
        ["Group", "Entities"],
        [
          ["Synonyms", q.entityMap.synonyms.join("; ")],
          ["Attributes", q.entityMap.attributes.join("; ")],
          ["Actions", q.entityMap.actions.join("; ")],
          ["Related entities", q.entityMap.relatedEntities.join("; ")],
          ["Authority entities", q.entityMap.authorityEntities.join("; ")],
          ["Risk entities", q.entityMap.riskEntities.join("; ")],
          ["Excluded/limited entities", q.entityMap.excludedEntities.join("; ")],
        ],
      ),
    );
    lines.push("");
    lines.push("Relations:");
    for (const relation of q.entityMap.relations) lines.push(`- ${relation}`);
    lines.push("");
    lines.push("### Query Cluster");
    lines.push("");
    lines.push(`Decision: \`${q.queryCluster.decision}\``);
    lines.push("");
    lines.push(`Canonical intent: ${q.queryCluster.canonicalIntent}`);
    lines.push("");
    lines.push(`Included queries: ${q.queryCluster.includedQueries.join("; ")}`);
    lines.push("");
    lines.push(`Excluded queries: ${q.queryCluster.excludedQueries.join("; ") || "-"}`);
    lines.push("");
    if (q.queryCluster.splitCandidates.length) {
      lines.push("Split candidates:");
      for (const item of q.queryCluster.splitCandidates) lines.push(`- ${item.query}: ${item.reason}`);
      lines.push("");
    }
    lines.push("Rationale:");
    for (const item of q.queryCluster.rationale) lines.push(`- ${item}`);
    lines.push("");
    lines.push("### Observed Heading Patterns");
    lines.push("");
    if (q.observedHeadings.length) {
      for (const heading of q.observedHeadings.slice(0, 10)) lines.push(`- ${heading.text} (${heading.count})`);
    } else {
      lines.push("- No reliable heading pattern extracted.");
    }
    lines.push("");
    lines.push("### Page Decision");
    lines.push("");
    lines.push(`- Recommendation: \`${q.pageDecision.recommendation}\``);
    lines.push(`- Page type: \`${q.pageDecision.pageType}\``);
    lines.push(`- Above the fold: ${q.pageDecision.aboveTheFold}`);
    lines.push(`- Required modules: ${q.pageDecision.requiredModules.join(", ")}`);
    lines.push(`- Do not build: ${q.pageDecision.doNotBuild.join(", ")}`);
    lines.push(`- Business viability: ${q.businessViabilityNote}`);
    lines.push(`- Build only if: ${q.buildOnlyIf.join(", ")}`);
    lines.push("");
    lines.push("### Meta Suggestions");
    lines.push("");
    lines.push(`Selected title: ${q.metaSuggestions.selected.title} (${q.metaSuggestions.selected.titleLength} chars)`);
    lines.push("");
    lines.push(`Selected description: ${q.metaSuggestions.selected.description} (${q.metaSuggestions.selected.descriptionLength} chars)`);
    lines.push("");
    lines.push(
      mdTable(
        ["Title", "Title chars", "Description", "Description chars", "Basis"],
        q.metaSuggestions.variants.map((variant) => [
          variant.title,
          variant.titleLength,
          variant.description,
          variant.descriptionLength,
          variant.basis.join(", "),
        ]),
      ),
    );
    lines.push("");
    lines.push("Rules:");
    for (const rule of q.metaSuggestions.rules) lines.push(`- ${rule}`);
    lines.push("");
    lines.push("### Source Plan");
    lines.push("");
    lines.push(`Required: ${q.sourcePlan.required ? "yes" : "no"}`);
    lines.push("");
    lines.push(`Risk level: ${q.sourcePlan.riskLevel}`);
    lines.push("");
    lines.push(`Publication status: \`${q.sourcePlan.publicationStatus}\``);
    lines.push("");
    lines.push(`Reviewer required: ${q.sourcePlan.reviewerRequired ? "yes" : "no"}`);
    lines.push("");
    lines.push(`Required visible blocks: ${q.sourcePlan.requiredVisibleBlocks.join(", ") || "-"}`);
    lines.push("");
    if (q.sourcePlan.facts.length) {
      lines.push(
        mdTable(
          ["Fact", "Claim", "Sources", "Status", "Reviewer"],
          q.sourcePlan.facts.map((fact) => [
            fact.id,
            fact.claim,
            fact.preferredSources.join(", ") || "-",
            fact.status,
            fact.reviewerRequired ? "yes" : "no",
          ]),
        ),
      );
    } else {
      lines.push("- No mandatory fact refresh for this query type.");
    }
    lines.push("");
    lines.push("### Implementation Contract");
    lines.push("");
    lines.push(`Contract status: \`${q.implementationContract.contractStatus}\``);
    lines.push("");
    lines.push(
      mdTable(
        ["Component", "Type", "Required", "Visible"],
        q.implementationContract.components.map((component) => [
          component.id,
          component.type,
          component.required ? "yes" : "no",
          component.visible ? "yes" : "no",
        ]),
      ),
    );
    lines.push("");
    lines.push("Acceptance tests:");
    for (const test of q.implementationContract.acceptanceTests) lines.push(`- ${test}`);
    lines.push("");
    lines.push("Schema dependencies:");
    for (const item of q.implementationContract.schemaDependencies) lines.push(`- ${item}`);
    lines.push("");
    lines.push("### Gap Opportunities");
    lines.push("");
    for (const gap of q.gaps) lines.push(`- ${gap}`);
    lines.push("");
    lines.push("### Outline");
    lines.push("");
    for (const [level, text] of q.outline) lines.push(`- ${level}: ${text}`);
    lines.push("");
    lines.push("### Editor Brief");
    lines.push("");
    for (const item of q.editorBrief) lines.push(`- ${item}`);
    lines.push("");
    lines.push("### Frontend Brief");
    lines.push("");
    for (const item of q.frontendBrief) lines.push(`- ${item}`);
    lines.push("");
    lines.push("### Trust and Schema");
    lines.push("");
    lines.push(`Trust: ${q.trustRequirements.join("; ")}`);
    lines.push("");
    lines.push(`Schema: ${q.schemaGuidance.join("; ")}`);
    lines.push("");
    lines.push("### Quality Checks");
    lines.push("");
    lines.push(
      mdTable(
        ["Check", "Status"],
        q.qualityScore.checks.map((check) => [check.name, check.pass ? "pass" : "fail"]),
      ),
    );
    lines.push("");
  }

  const totalPassed = analysis.queries.reduce((sum, q) => sum + q.qualityScore.passed, 0);
  const totalChecks = analysis.queries.reduce((sum, q) => sum + q.qualityScore.total, 0);
  lines.push("## 3. Overall Assessment");
  lines.push("");
  lines.push(`Full-analysis checks: ${totalPassed}/${totalChecks}.`);
  lines.push("");
  lines.push("Status: production-ready local workflow output when `npm.cmd test` and `npm.cmd run production:gate` pass.");
  lines.push("");
  lines.push("Operating rules:");
  lines.push("- Pages with poor or blocked extraction are excluded from detailed gap conclusions.");
  lines.push("- Pricing, medical, legal, financial and real-time facts still need official-source refresh before publication.");
  lines.push("- The outline is selected by intent and SERP evidence; there is no universal article template.");
  lines.push("");
  return lines.join("\n");
}
