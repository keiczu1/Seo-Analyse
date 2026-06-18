# Спецификация системы анализа поискового запроса и проектирования страницы

Версия: 0.2  
Дата: 2026-06-04  
Контекст: чистый лист, без привязки к существующим проектам

## 1. Задача документа

Нужна система, которая принимает поисковый запрос или кластер запросов и выдает не SEO-текст, а решение по странице:

- какую страницу нужно создать;
- какой пользовательский интент она закрывает;
- какой формат ожидает выдача;
- какие блоки, функции, источники, UX-элементы и доказательства нужны;
- какой outline дать автору;
- какие технические требования дать разработчику;
- по каким критериям принять страницу перед публикацией.

Система должна работать как инженерный контур принятия решения: запрос -> интент -> SERP как обратная связь поисковой системы -> page decision -> ТЗ на контент и разработку -> QA.

## 2. Сравнение двух подходов

В сравнении участвовали:

- вариант Codex V0.1: более строгая decision-модель, фокус на интенте, формате страницы, user task completion, trust, structured output;
- вариант Gemini.md: более развернутый автоматизационный pipeline, XML River, гибридный парсер, матрица конкурентов, разделение финального ТЗ на блок для редактора и блок для frontend-разработчика.

### Что лучше в варианте Codex

- Начинает с пользовательской задачи, а не с сущностей, LSI или заголовков конкурентов.
- Четко отделяет SERP-анализ от копирования конкурентов.
- Требует Page Brief как управленческий артефакт, а не просто outline.
- Лучше держит риски: YMYL, проверяемость, свежесть, trust, acceptance criteria.
- Не обещает прямых ranking-эффектов от JSON-LD, ARIA или поведения пользователя.

### Что лучше в варианте Gemini

- Хорошо описывает автоматизацию: источник SERP, парсинг страниц, очистка шаблонов, LLM-анализ.
- Полезно разделяет финальный результат на два простых ТЗ: для редактора и для разработчика.
- Верно предлагает гибридный парсер: быстрый HTML GET, затем headless browser только для сложных SPA.
- Полезна идея матрицы конкурентов: page type, структура, таблицы, списки, интерактив, schema, freshness.
- Хороший принцип: не копировать лидеров, а взять ожидаемый формат и добавить реальную ценность.

### Что нельзя переносить без правки

- Нельзя писать, что поисковик "точно двинет страницу вверх" из-за конкретного блока, schema или ARIA.
- Нельзя называть JSON-LD ranking-фактором. Структурированные данные помогают поисковикам понять страницу и могут дать eligibility для rich results, но не гарантируют показ и не гарантируют рост позиций.
- Нельзя полагаться на "LSI-сущности" как на современный технический термин. Лучше использовать: сущности, связанные подтемы, co-occurrence, semantic coverage, search expectation.
- Нельзя утверждать, что поведенческие сигналы напрямую и прозрачно измеряются по каждому виджету. Безопаснее говорить: страница должна помогать завершить задачу и давать хороший page experience.
- Нельзя автоматически генерировать AggregateRating, FAQPage, Product и прочую schema, если соответствующий контент не виден пользователю и не соответствует правилам конкретного rich result.
- Нельзя считать Top-10 истиной. SERP - это сильная обратная связь, но она может быть зашумлена брендами, агрегаторами, локальностью, персонализацией и временными факторами.

### Итоговый выбор

Лучший вариант: гибрид.

База берется из Codex V0.1: интент, user task, page decision, quality gates, осторожность с поисковыми утверждениями.

Из Gemini.md берем операционную часть: SERP API, гибридный парсер, матрицу конкурентов, semantic gap, финальную LLM-сборку и разделение ТЗ для исполнителей.

## 3. Основные принципы системы

1. Сначала задача пользователя, потом формат страницы.
2. SERP читается как обратная связь поисковой системы, а не как шаблон для копирования.
3. Страница должна завершать задачу пользователя, а не просто покрывать ключевые слова.
4. Добавочная ценность должна быть конкретной: данные, методика, инструмент, примеры, источники, сравнение, проверяемость.
5. Один URL должен иметь один основной поисковый фокус.
6. Структурированные данные должны описывать только видимый и правдивый контент страницы.
7. Техническая доступность, SSR/prerender, корректные статусы, семантический HTML и мобильная пригодность нужны не как магия ранжирования, а как условия нормального понимания и использования страницы.
8. Для YMYL и high-risk тем нужна отдельная планка: экспертная проверка, источники, ограничения, дата обновления, отказ от неподтвержденных советов.

## 4. Входные данные

Минимальный вход:

```json
{
  "primary_query": "string",
  "language": "ru",
  "region": "RU",
  "device": "desktop",
  "business_goal": "traffic | lead | sale | tool_usage | awareness | support",
  "site_context": "new_site | existing_site | brand_site | marketplace | media | tool_platform",
  "constraints": []
}
```

Расширенный вход:

```json
{
  "query_cluster": ["string"],
  "target_audience": "string",
  "conversion_goal": "string",
  "freshness_requirement": "evergreen | periodic | real_time | event_driven",
  "ymyl_level": "none | low | medium | high",
  "must_use_sources": [],
  "forbidden_claims": [],
  "available_assets": {
    "experts": [],
    "data_sources": [],
    "tools": [],
    "media": []
  }
}
```

## 5. Выходные артефакты

Система выдает четыре уровня результата:

1. Query Passport: структурированный паспорт запроса.
2. SERP Intelligence: матрица выдачи и вывод о search expectation.
3. Page Decision: решение о типе страницы и нужных модулях.
4. Production Brief: два независимых ТЗ для редактора и frontend-разработчика плюс общий QA-чеклист.

## 6. Pipeline системы

### Шаг 0. Intake и нормализация

Цель: не дать системе анализировать сырой запрос без контекста.

Что делаем:

- нормализуем язык, регион, устройство;
- фиксируем основной запрос и кластер;
- определяем ограничения бизнеса, источников, юридических рисков;
- проверяем, не является ли запрос неоднозначным.

Выход:

```json
{
  "normalized_query": "string",
  "locale": "ru-RU",
  "ambiguities": [],
  "initial_risk_flags": [],
  "analysis_scope": "single_query | query_cluster"
}
```

### Шаг 1. Query Passport

Цель: понять, что пользователь пытается сделать.

Система определяет:

- dominant_intent;
- secondary_intents;
- completion_goal;
- entities;
- modifiers;
- freshness;
- locality;
- YMYL/risk level;
- начальную гипотезу page type.

Пример структуры:

```json
{
  "dominant_intent": "calculate",
  "secondary_intents": ["learn_method", "compare_scenarios"],
  "completion_goal": "user can calculate a result and understand how it was derived",
  "entities": [
    {
      "name": "mortgage",
      "type": "financial_product",
      "confidence": 0.93
    }
  ],
  "freshness_requirement": "periodic",
  "ymyl_level": "high",
  "initial_page_type_hypothesis": "interactive_tool_plus_explanation"
}
```

Важно: паспорт запроса не должен быть чистой фантазией LLM. Если есть SERP и внешние данные, они должны переопределять слабые гипотезы.

### Шаг 2. SERP collection

Цель: получить реальную обратную связь выдачи.

Минимум:

- Top-10 organic URLs;
- title;
- snippet;
- visible SERP features, если источник их отдает;
- позиция;
- домен;
- тип результата, если можно определить.

Опционально:

- Top-20 для более шумных запросов;
- People Also Ask / related searches;
- AI Overview или Copilot citations, если это доступно легально и стабильно;
- mobile SERP, если mobile intent важен.

Рекомендуемый источник в автоматизации: SERP API вроде XML River или другой легальный поставщик SERP-данных.

Система обязана фиксировать режим данных:

```json
{
  "serp_data_mode": "title_snippet_only | parsed_html | rendered_dom | full_serp_features",
  "serp_provider": "xmlriver_google | xmlriver_yandex | other",
  "parser_used": false,
  "limitations": [
    "title/snippet SERP can support page-type hypotheses, but not full content-gap or DOM-quality conclusions"
  ]
}
```

Правило уверенности: если доступен только `title_snippet_only`, система может делать вывод о вероятном интенте, типе страницы и первом экране, но не должна уверенно утверждать структуру заголовков конкурентов, качество DOM, фактическое наличие JSON-LD или подробные content gaps.

Provider error policy:

```json
{
  "serp_provider_status": "ok | temporary_error | unavailable | quota_or_auth_error",
  "error_code": "string | null",
  "retry_count": 0,
  "fallback_used": false,
  "fallback_provider": "string | null"
}
```

Правила:

- временные ошибки вроде поискового timeout можно ретраить ограниченное число раз;
- если провайдер возвращает устойчивое сообщение о недоступности сервиса, система останавливает прямой SERP-сбор и помечает результат как fallback, а не притворяется, что получила полноценный Top-10;
- fallback-результаты нельзя смешивать с XMLRiver-кэшем без поля `serp_provider`;
- если нет ни SERP, ни fallback, результат должен быть помечен как `knowledge_draft`.

### Шаг 3. Парсинг и очистка страниц

Цель: анализировать основной контент конкурентов, а не шапки, футеры, рекламу и навигацию.

Рекомендуемый подход: умный гибрид.

1. Сначала быстрый HTTP GET.
2. Проверить, есть ли достаточный main content в HTML.
3. Если страница пустая, сильно JS-зависимая или контент не извлечен, открыть headless browser.
4. Очистить boilerplate.
5. Извлечь:
   - H1-H6;
   - main/article text;
   - таблицы;
   - списки;
   - формы и интерактивные элементы;
   - медиа;
   - видимую дату публикации/обновления;
   - автора/организацию;
   - JSON-LD и microdata;
   - canonical, robots, status code.

Ограничение: парсер должен соблюдать законные ограничения, robots/terms, rate limits и не использовать закрытый или недоступный обычному пользователю контент как основу анализа.

Каждый URL должен получать оценку извлечения:

```json
{
  "fetch_status": 200,
  "html_length": 1702901,
  "has_h1": true,
  "has_main_or_article": false,
  "has_form_or_interactive_shell": true,
  "has_structured_data": true,
  "block_signals": [],
  "extraction_quality": "good | partial | poor | blocked",
  "headless_fallback_required": false
}
```

Условия для headless fallback:

- HTTP 401/403/429/5xx;
- слишком короткий HTML для ожидаемого типа страницы;
- нет H1 или извлекаемого main content;
- признаки captcha, access denied, "just a moment", robot check;
- SPA shell без содержательного HTML;
- важные интерактивные элементы не видны в quick GET.

Правило качества: content-gap, heading-gap, schema-gap и feature-gap можно считать только по URL с `extraction_quality=good` или после успешного headless fallback. Если значимая часть Top-N не извлечена, итоговый brief обязан снизить confidence и указать parser limitations.

### Шаг 4. SERP classification matrix

Каждый результат классифицируется по единой матрице:

```json
{
  "position": 1,
  "url": "https://example.com/page",
  "domain_type": "brand | media | government | forum | ecommerce | tool | aggregator",
  "page_type": "guide | tool | product | category | comparison | forum | reference | local | hybrid",
  "dominant_task": "string",
  "content_depth": "thin | medium | deep",
  "format_modules": ["calculator", "table", "faq", "examples"],
  "trust_signals": ["author", "sources", "updated_date", "methodology"],
  "freshness_signals": ["updated_date"],
  "structured_data": ["Article", "FAQPage"],
  "technical_observations": ["ssr_content_present", "mobile_friendly_unknown"],
  "gaps": [],
  "notable_strengths": []
}
```

Матрица нужна не для копирования. Она нужна, чтобы понять:

- какой формат поисковик уже считает релевантным;
- какой минимальный уровень раскрытия темы ожидается;
- какие элементы повторяются у лидеров;
- где у выдачи есть слабые места.

### Шаг 5. Search Expectation Model

На основе Top-N система формулирует ожидание выдачи:

```json
{
  "expected_page_format": "hybrid_tool_guide",
  "must_have_modules": ["tool", "short_answer", "methodology", "examples"],
  "common_modules": ["faq", "related_terms"],
  "trust_requirements": ["sources", "calculation_method", "updated_date"],
  "freshness_requirement": "periodic",
  "content_depth_expected": "medium",
  "interactivity_expected": true,
  "dominant_serp_pattern": "tools rank above long-form guides",
  "confidence": 0.82
}
```

Если SERP смешанная, система не должна насильно выбирать один интент. Она должна зафиксировать конфликт:

```json
{
  "serp_intent_split": {
    "tool": 0.5,
    "guide": 0.3,
    "commercial": 0.2
  },
  "decision_note": "mixed SERP; build a hybrid page with tool-first layout"
}
```

### Шаг 6. Gap и добавочная ценность

Система разделяет находки на три типа:

1. Hygiene minimum: то, без чего страница будет неполной.
2. Expected value: то, что пользователи и SERP ожидают увидеть.
3. Differentiating value: то, что дает причину выбрать нашу страницу.

Примеры differentiating value:

- собственная методика расчета;
- интерактивный сценарий вместо статичной таблицы;
- оригинальная таблица сравнения;
- проверяемые данные с датой;
- локальный контекст;
- примеры с реальными edge cases;
- экспертная вычитка;
- понятные ограничения и дисклеймеры;
- downloadable template;
- визуальный flow или decision tree.

Запрещенный вывод: "у конкурентов нет FAQ, значит добавим FAQ".  
Правильный вывод: "в SERP есть повторяющиеся вопросы, на которые нет короткого проверяемого ответа; нужен FAQ из 4 вопросов, каждый виден на странице и не дублирует основной текст".

### Шаг 7. Page Decision

Система выбирает действие:

- build_new_page;
- build_tool;
- build_guide;
- build_hybrid_page;
- build_comparison;
- build_reference;
- build_category_or_hub;
- merge_with_existing;
- noindex_or_avoid;
- expert_review_required.

Пример:

```json
{
  "recommendation": "build_hybrid_page",
  "recommended_page_type": "interactive_tool_plus_explanation",
  "primary_reason": "SERP shows users need immediate calculation; guides are present but secondary",
  "business_viability_note": "build if the site can provide accurate calculation logic, data freshness, and a reason to compete beyond a generic tool",
  "above_the_fold": ["H1", "one-sentence value proposition", "interactive calculator", "method note"],
  "required_modules": ["calculator", "methodology", "examples", "limitations", "sources"],
  "do_not_build": ["generic 3000-word article", "FAQ-only page"],
  "risk_level": "high",
  "expert_review_required": true
}
```

Для zero-click-heavy, affiliate-heavy или brand-dominated запросов система должна уметь выдавать условное решение:

```json
{
  "recommendation": "build_only_if",
  "condition": "site has reliable live data, topical authority, or a broader tool ecosystem",
  "otherwise": "avoid_or_merge_into_hub",
  "reason": "generic standalone page is unlikely to create enough user value"
}
```

### Шаг 8. Production Brief

Финальный brief должен быть понятен линейным исполнителям, но сохранять управленческий слой.

Структура:

1. Общий паспорт страницы.
2. ТЗ для редактора/автора.
3. ТЗ для frontend-разработчика.
4. QA и acceptance criteria.

## 7. Scoring-модель

Это не "SEO score" и не предсказание позиции. Это модель принятия решения.

```json
{
  "intent_fit": 0,
  "serp_format_fit": 0,
  "task_completion_potential": 0,
  "original_value_potential": 0,
  "trust_requirement": 0,
  "freshness_requirement": 0,
  "technical_complexity": 0,
  "production_effort": 0,
  "risk_ymyl": 0,
  "confidence": 0
}
```

Шкала: 0-5.

Интерпретация:

- intent_fit ниже 3: нельзя писать ТЗ, нужен пересмотр интента;
- serp_format_fit ниже 3: формат страницы не совпадает с выдачей;
- original_value_potential ниже 3: высокая вероятность сделать вторичный материал;
- risk_ymyl 4-5: обязательна экспертная проверка;
- confidence ниже 0.65: нужен ручной review или дополнительная SERP-выборка.

## 8. Типы страниц и базовые модули

| Page type | Когда выбирать | Обязательные модули |
|---|---|---|
| article_guide | Пользователь хочет разобраться и принять решение | краткий ответ, структура H2-H3, примеры, источники, ограничения |
| how_to | Пользователь хочет выполнить процесс | результат, шаги, требования, ошибки, проверка результата |
| interactive_tool | Пользователь хочет получить расчет/проверку/конвертацию | инструмент above the fold, методика, примеры, ограничения, доступность |
| hybrid_tool_guide | SERP смешивает инструмент и объяснение | инструмент сверху, короткий answer, методика, сценарии, FAQ по делу |
| comparison_page | Пользователь выбирает между вариантами | критерии сравнения, таблица, методика оценки, сценарии выбора |
| reference_database | Пользователь ищет справочные значения | поиск/фильтр, таблица, источники, дата обновления |
| category_or_hub | Интент широкий и включает подзадачи | карта подстраниц, кластеризация, короткие вводные, внутренние ссылки |
| product_or_service | Коммерческий интент | оффер, доказательства, условия, FAQ, отзывы только при наличии реальных данных |
| diagnostic | Пользователь не знает, что выбрать | вопросы, decision tree, результат, объяснение |

## 9. Outline Engine

Outline Engine - это не один шаблон статьи для всех запросов. Это механизм выбора структуры страницы под интент, SERP expectation и тип результата.

Общий алгоритм один:

```text
query -> intent -> SERP expectation -> page type -> modules -> outline
```

Фиксированным является только процесс принятия решения. Сам outline должен меняться.

### 9.1. Библиотека outline-архетипов

| Intent / page type | Первый экран | Типовой порядок блоков |
|---|---|---|
| calculate / convert / check | Инструмент или форма | инструмент, короткое пояснение, методика/формула, примеры, ограничения, источники |
| what is / definition | Короткое определение | определение, контекст, виды/классификация, примеры, связанные понятия, ошибки понимания |
| how to | Результат и путь | что получится, требования, шаги, ошибки, проверка результата, альтернативы |
| best / compare / vs | Критерии выбора | критерии, таблица сравнения, сценарии выбора, плюсы/минусы, рекомендации, ограничения |
| price / cost | Диапазон или способ оценки | быстрый ответ, факторы цены, таблица, примеры расчета, регион/дата, как снизить риск ошибки |
| local / service | Действие и доверие | услуга/оффер, зона обслуживания, условия, доказательства, процесс, FAQ, контакты |
| reference / database | Поиск или таблица | фильтр/поиск, таблица, расшифровка полей, источники, дата обновления |
| diagnostic | Вопросы или decision tree | быстрый выбор, вопросы, результат, объяснение, следующие шаги, ограничения |
| YMYL guide | Осторожный ответ | короткий безопасный ответ, источники, методика, ограничения, когда нужен специалист, дата обновления |
| hybrid_tool_guide | Инструмент или быстрый результат | инструмент, короткий answer, методика, сценарии, примеры, ограничения, FAQ по делу |

### 9.2. Модульная сборка

Система собирает страницу из модулей, а не из универсального списка H2:

- quick_answer;
- tool;
- input_form;
- result_explanation;
- methodology;
- formula;
- steps;
- comparison_table;
- examples;
- scenarios;
- edge_cases;
- limitations;
- sources;
- author_or_reviewer;
- faq;
- related_links;
- cta.

Пример: для инструментального запроса модуль `tool` должен быть выше `what_is`. Для информационного запроса `quick_answer` и `definition` могут идти первыми. Для commercial comparison первым обычно идет `criteria` или `comparison_table`, а не длинное вступление.

### 9.3. Общие правила

Правила:

- не создавать H2 только ради ключа;
- не копировать заголовки конкурентов;
- не писать "что такое" первым блоком, если пользователь пришел считать, выбрать или выполнить действие;
- не гнаться за word count;
- каждый H2 должен иметь функцию в решении задачи;
- таблицы использовать для сопоставимых данных;
- списки использовать для перечислений, шагов, условий;
- важные выводы делать короткими и извлекаемыми.

### 9.4. Проверка outline

Outline считается слабым, если его можно без изменений применить к любому ключу. Хороший outline содержит признаки конкретного интента:

- для расчета есть inputs, outputs, формула и ограничения;
- для инструкции есть prerequisites, шаги и проверка результата;
- для сравнения есть критерии и сценарии выбора;
- для YMYL есть источники, осторожность и expert review;
- для справочника есть структура данных, дата обновления и источник значений.

## 10. Trust, YMYL и свежесть

Система должна выставлять trust requirements.

Для обычных тем:

- ясно указать дату обновления, если тема меняется;
- не скрывать методику;
- не использовать неподтвержденные факты.

Для YMYL:

- указать автора или проверяющего с релевантной экспертизой;
- дать источники и дату доступа/обновления;
- показать методику расчета или критерии;
- добавить ограничения;
- избегать персональных рекомендаций без данных пользователя;
- отправлять на expert_review_required.

Для real-time тем:

- указать источник данных;
- указать частоту обновления;
- не индексировать устаревшие динамические результаты как вечнозеленый контент;
- предусмотреть fallback при недоступности API.

## 11. Технические требования к странице

Минимум:

- HTTP 200 для индексируемой страницы;
- indexable main content;
- уникальный title и H1;
- canonical;
- mobile-friendly layout;
- основной контент доступен без критической зависимости от позднего JS;
- ссылки являются crawlable links;
- корректные статусы для 404/410/redirect;
- нет скрытого контента в structured data.

Для интерактивных страниц:

- SSR или prerender для базового shell и главного текстового контента;
- форма/виджет видны и понятны до выполнения сложного JS, если это возможно;
- все поля имеют label;
- результаты доступны для screen reader;
- состояние ошибок понятно пользователю;
- core interaction не ломает URL/canonical;
- важные результаты не должны существовать только в canvas/image без текстового дубля.

Для structured data:

- выбирать самый конкретный подходящий тип;
- размечать только видимый контент;
- не генерировать отзывы, рейтинги, автора или FAQ, если их нет на странице;
- валидировать через Rich Results Test или аналог;
- помнить, что корректная разметка не гарантирует rich result и не гарантирует позицию.

## 12. Формат финального Production Brief

### 12.1. Общий паспорт страницы

```markdown
# Page Brief

## Target
- Primary query:
- Region/language:
- Query cluster:
- Dominant intent:
- Secondary intents:
- User completion goal:
- Recommended page type:
- Confidence:

## SERP interpretation
- What SERP currently rewards:
- Dominant page formats:
- Must-have modules:
- Gaps in current results:
- Risks/noise in SERP:

## Page decision
- Build:
- Above-the-fold:
- Required modules:
- Optional modules:
- Do not include:
- Trust/freshness requirements:
```

### 12.2. ТЗ для редактора

```markdown
# ТЗ для редактора

## Главная задача страницы
Объяснить, какую задачу пользователя решает страница и какой результат должен получить читатель.

## Тон и глубина
- Коротко/глубоко:
- Для кого:
- Что не писать:

## Outline
H1:
H2:
- Что раскрыть:
- Какие факты/примеры нужны:
- Какой формат использовать:

## Добавочная ценность
- Что должно быть лучше, чем в SERP:
- Какие данные, примеры, методики или таблицы обязательны:
- Какие источники использовать:

## Проверка редактора
- Нет неподтвержденных утверждений.
- Нет воды и SEO-заполнителя.
- Каждый раздел помогает завершить задачу.
- Указаны ограничения и дата обновления, если нужны.
```

### 12.3. ТЗ для frontend-разработчика

```markdown
# ТЗ для frontend-разработчика

## Page architecture
- Route/URL:
- Page type:
- Main content container:
- Article/tool sections:
- Aside/related sections:

## Above-the-fold
- Что должно быть видно сразу:
- Что должно быть SSR/prerender:

## Components
- Интерактивные компоненты:
- Inputs/outputs:
- Error states:
- Loading states:
- Accessibility requirements:

## SEO/technical
- Title/meta:
- Canonical:
- Structured data:
- Crawlable links:
- Status code rules:
- Mobile and performance requirements:

## QA
- DOM semantics checked.
- Structured data validates.
- Main content visible in rendered HTML.
- Keyboard navigation works.
- No hidden/misleading schema.
```

## 13. Системный промпт для LLM-сборки

Этот промпт используется после сбора SERP, парсинга страниц и подготовки очищенных данных.

```text
Роль: ты Search Retrieval Engineer, SEO Product Architect и Technical Product Manager.

Задача: на основе входного запроса, региона, языка, SERP-данных, очищенных текстов конкурентов и ограничений проекта сгенерировать Production Brief для новой страницы.

Главное правило: не начинай с текста. Сначала определи пользовательскую задачу, search expectation и тип страницы. SERP используй как обратную связь поисковой системы, но не копируй конкурентов.

Обязательные проверки:
1. Определи dominant intent, secondary intents и completion goal.
2. Классифицируй Top-N результатов по page type, модулям, trust, freshness, structured data и UX.
3. Сформулируй search expectation: какой формат и какие модули выдача ожидает.
4. Найди hygiene minimum, expected value и differentiating value.
5. Выбери page decision и объясни его простым языком.
6. Сформируй два независимых ТЗ: для редактора и для frontend-разработчика.
7. Укажи, что не нужно делать: лишние FAQ, рерайт конкурентов, неподтвержденные claims, schema для невидимого контента.
8. Для YMYL или high-risk тем поставь expert_review_required.

Не утверждай, что отдельный элемент гарантирует рост позиций. Не называй JSON-LD, ARIA, FAQ или длину текста прямым ranking-фактором. Не используй термин LSI как основание решения.

Формат ответа:
1. Page Brief.
2. SERP Interpretation.
3. Page Decision.
4. Editor Brief.
5. Frontend Brief.
6. QA Checklist.
7. Open Risks.
```

## 14. QA и acceptance criteria

Production Brief считается готовым, если:

- по нему понятно, какой тип страницы создавать;
- есть причина выбора формата;
- есть explicit user completion goal;
- SERP-вывод отделен от фантазии LLM;
- указаны обязательные и запрещенные блоки;
- outline не является копией конкурентов;
- добавочная ценность конкретна и реализуема;
- техническое ТЗ можно отдать разработчику без чтения редакторского полотна;
- редакторское ТЗ можно отдать автору без JSON-LD и технического шума;
- для YMYL есть expert_review_required;
- structured data соответствует видимому содержимому;
- нет обещаний гарантированного ранжирования.

## 15. MVP автоматизации

MVP:

1. Ввод query + language + region.
2. SERP API Top-10.
3. Быстрый HTML fetch.
4. Headless fallback только при слабом извлечении.
5. Boilerplate removal.
6. SERP classification matrix.
7. LLM generation of Page Brief.
8. Human review перед публикацией.

Проверенный production entrypoint:

```text
npm.cmd run fetch:serp -- --id Q01 --query "your query" --locale ru-RU
npm.cmd run analyze:query -- --id Q01
npm.cmd run benchmark:offline
npm.cmd run parse:serp -- G01 G02 G04
npm.cmd run analyze:parsed
npm.cmd run analyze:full
npm.cmd test
```

Текущий parser implementation:

- читает XMLRiver cache из `data/serp-cache/*.xml`;
- сначала использует fast HTML fetch;
- считает extraction quality;
- запускает Playwright headless fallback при слабом извлечении;
- сохраняет page JSON в `data/parser-output/pages/*.json`;
- собирает `data/parser-output/parsed-matrix.json`;
- генерирует `reports/parser-analysis-2026-06-04.md`.

Текущий full-analysis implementation:

- читает `data/parser-output/parsed-matrix.json`;
- группирует страницы по query ID;
- считает usable/blocked URLs;
- определяет dominant parsed page type;
- считает module signals: tables, forms/inputs, structured data, article/FAQ/video signals;
- считает topic coverage по intent profile;
- фильтрует observed heading patterns от boilerplate/CTA/related content;
- формирует search expectation, page decision, gap opportunities, outline, editor brief, frontend brief, trust/schema guidance;
- сохраняет `data/analysis/full-analysis-output.json`;
- генерирует `reports/full-analysis-2026-06-04.md`.

Production smoke gate:

- SERP XML ingestion работает;
- есть fast HTML extraction;
- headless fallback реально был вызван;
- у каждой страницы есть extraction quality;
- минимум 80% страниц в текущем benchmark имеют `good` или `partial`;
- разные page decisions сохраняются после parsed-data анализа.

Smoke gate для full-analysis layer:

- есть search expectation для каждого запроса;
- есть topic coverage;
- есть gap opportunities;
- outline специфичен для интента;
- editor/frontend briefs не пустые;
- trust/schema guidance присутствует;
- blocked pages явно исключены из detailed gap conclusions;
- итоговые quality checks показывают pass.

V1:

1. Query clustering.
2. Mobile/desktop SERP comparison.
3. Freshness classifier.
4. YMYL/risk classifier.
5. Structured data validator.
6. Rendered HTML checker.
7. Brief quality scoring.
8. Diff mode для обновления существующих страниц.

V2:

1. Автоматический мониторинг SERP drift.
2. Постпубликационный feedback loop из Search Console/Bing Webmaster Tools.
3. Обнаружение cannibalization.
4. Внутренняя перелинковка на основе topic graph.
5. Автоматическое обновление briefs при изменении SERP.

## 16. Официальные ориентиры, на которых держится спецификация

- Google Search Central: Creating helpful, reliable, people-first content  
  https://developers.google.com/search/docs/fundamentals/creating-helpful-content

- Google Search Central: SEO Starter Guide  
  https://developers.google.com/search/docs/fundamentals/seo-starter-guide

- Google Search Central: Search Essentials  
  https://developers.google.com/search/docs/essentials

- Google Search Central: General structured data guidelines  
  https://developers.google.com/search/docs/appearance/structured-data/sd-policies

- Google Search Central: JavaScript SEO basics  
  https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics

- Google Search Central: Understanding page experience  
  https://developers.google.com/search/docs/appearance/page-experience

- Bing Webmaster Guidelines  
  https://www.bing.com/webmasters/help/bing-webmaster-guidelines-30fba23a

## 17. Production-ready local implementation

Статус на 2026-06-04: локальная production-ready версия готова и проверяется командами.

Команды:

```text
npm.cmd run fetch:serp -- --id Q01 --query "your query" --locale ru-RU
npm.cmd run analyze:query -- --id Q01
npm.cmd run benchmark:offline
npm.cmd run parse:serp -- G01 G02 G04
npm.cmd test
```

Что реализовано:

- generic query + SERP profile engine вместо hard-coded профилей G01/G02/G04;
- XMLRiver fetcher с секретами через env, retry/backoff, stale-cache policy, manifest и provider-error records;
- hybrid parser: fast HTML, extraction quality, Playwright fallback, blocked/poor exclusions;
- full-analysis generator: page decision, topic coverage, gaps, outline, editor brief, frontend brief, trust/schema, business viability;
- offline benchmark G01-G12 для проверки разных интентов и outline archetypes;
- production gate `reports/production-gate-report.md`;
- локальный skill artifact `skills/seo-query-brief/`.

Граница 100% готовности:

- Да: reproducible local CLI workflow, cached/live SERP ingestion, parser, generic analysis, gates, skill package.
- Нет: hosted SaaS, distributed crawl scheduler, CMS publishing, Search Console/Bing feedback loop. Это следующие продуктовые слои, а не часть текущего локального production workflow.
