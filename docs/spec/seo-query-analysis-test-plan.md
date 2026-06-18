# План тестирования SEO Query Analysis Spec

Версия: 0.1  
Дата: 2026-06-04  
Связанный документ: `seo-query-analysis-spec.md`

## 1. Что именно тестируем

Мы тестируем не "качество SEO-советов", а способность системы принимать разные решения под разные запросы.

Система проходит тест, если по разным интентам она меняет:

- тип страницы;
- первый экран;
- набор обязательных модулей;
- outline;
- требования к trust/freshness/YMYL;
- техническое ТЗ;
- список того, что не надо делать.

Ключевая проверка: система не должна выдавать один и тот же шаблон статьи для всех запросов.

## 2. Уровни тестирования

### Уровень 1. Static spec review

Цель: проверить саму спецификацию без SERP.

Проверяем:

- есть ли Query Passport;
- есть ли SERP matrix;
- есть ли Page Decision;
- есть ли Outline Engine, а не единый outline;
- есть ли guardrails против SEO-мистики;
- есть ли разделение ТЗ для редактора и разработчика;
- есть ли QA/acceptance criteria.

Ожидаемый результат: документ можно дать другому агенту или аналитику, и он поймет процесс без дополнительных объяснений.

### Уровень 2. Offline golden-query tests

Цель: проверить decision-логику без live SERP.

Формат: берем запрос, регион, язык и просим систему выдать Page Brief с пометкой `knowledge_draft`. Это не финальное SEO-решение, а проверка того, что логика интента работает.

Ожидаемый результат: система выбирает разумный архетип страницы и не притворяется, что видела реальную выдачу.

### Уровень 3. SERP-backed smoke tests

Цель: проверить систему на реальной выдаче.

Формат:

1. Берем запрос.
2. Собираем Top-10 через SERP API.
3. Парсим страницы.
4. Генерируем brief.
5. Проверяем brief по рубрике.

Ожидаемый результат: выводы ссылаются на наблюдаемые SERP-паттерны: типы страниц, модули, глубина, freshness, trust.

Если SERP-провайдер недоступен:

- сохранить код/текст ошибки в test run;
- не смешивать fallback с XMLRiver-кэшем;
- пометить `serp_provider` и `serp_data_mode`;
- снизить оценку `SERP discipline`, если есть только title/snippet или fallback;
- не утверждать DOM/schema/heading gaps без парсинга страниц.

### Уровень 3.5. DOM extraction smoke test

Цель: проверить, может ли быстрый HTML fetch реально извлечь основной контент из Top-N.

Формат:

1. Взять Top-3 или Top-5 URL из SERP-кэша.
2. Сделать quick HTTP GET.
3. Зафиксировать status, HTML length, H1, main/article, form, JSON-LD, block signals.
4. Выставить `extraction_quality`.
5. Решить, нужен ли headless fallback.

Ожидаемый результат: система не строит content-gap, heading-gap, schema-gap и feature-gap по страницам с `poor`, `blocked` или не проверенным extraction quality.

### Уровень 4. Adversarial tests

Цель: проверить, ломается ли система на сложных запросах.

Типы:

- неоднозначный запрос;
- смешанный интент;
- high-risk/YMYL;
- локальный интент;
- запрос со свежестью;
- брендовый запрос;
- запрос, где лучше не создавать страницу;
- запрос, где нужен hub, а не отдельная статья.

Ожидаемый результат: система умеет сказать "нужен review", "не хватает данных", "нельзя делать универсальный guide", "лучше hub/merge/avoid".

### Уровень 5. Skill forward-test

Цель: проверить будущий Codex skill.

Формат: другой агент получает только skill и один запрос, без наших объяснений, и должен выдать brief. Мы оцениваем, насколько он следует процессу.

Ожидаемый результат: skill работает как переносимое процедурное знание, а не как пересказ этого чата.

### Уровень 6. Parser implementation smoke gate

Цель: проверить, что hybrid parser не только описан, но реально выполняет сбор страниц.

Команды:

```text
npm.cmd run parse:serp -- G01 G02 G04
npm.cmd run analyze:parsed
npm.cmd run analyze:full
```

Проверяем:

- SERP XML cache прочитан;
- fast HTML extraction работает;
- Playwright headless fallback реально вызван хотя бы для одного URL;
- у каждой страницы есть `extractionQuality`;
- blocked/poor pages явно исключены из detailed gap analysis;
- минимум 80% страниц benchmark имеют `good` или `partial`;
- parsed-data re-analysis сохраняет разные decisions для разных интентов.

Ожидаемый результат: `reports/parser-analysis-2026-06-04.md` показывает `Passed: 6/6`.

Дополнительный full-analysis gate:

- `reports/full-analysis-2026-06-04.md` создан;
- по каждому query есть `Search expectation`;
- есть `SERP Evidence`, `Topic Coverage`, `Page Decision`, `Gap Opportunities`, `Outline`, `Editor Brief`, `Frontend Brief`, `Trust and Schema`;
- headings очищены от явного boilerplate/CTA/related content;
- blocked pages перечислены и не используются для detailed gap conclusions;
- `Full-analysis checks` показывает pass по всем проверкам.

## 3. Golden-query набор

Минимальный набор для первой проверки:

| ID | Query | Locale | Главный интент | Ожидаемый page type | Главная проверка |
|---|---|---|---|---|---|
| G01 | `ипотечный калькулятор` | ru-RU | calculate | hybrid_tool_guide | инструмент первым, формула, YMYL/trust |
| G02 | `что такое api` | ru-RU | definition | article_guide | короткое определение первым, примеры, без калькулятора |
| G03 | `как открыть ип` | ru-RU | how_to / YMYL-lite | how_to | шаги, документы, дата актуальности, ограничения |
| G04 | `notion vs obsidian` | en-US | compare | comparison_page | критерии, таблица, сценарии выбора |
| G05 | `best project management software for small business` | en-US | commercial investigation | comparison_page | критерии, прозрачность методики, без фейковых рейтингов |
| G06 | `usd to eur` | en-US | convert / freshness | interactive_tool | real-time data, источник курса, fallback |
| G07 | `симптомы диабета` | ru-RU | medical YMYL | YMYL guide | осторожный ответ, врач, источники, no diagnosis |
| G08 | `калории в авокадо` | ru-RU | reference | reference_database | таблица, единицы, источник данных |
| G09 | `ремонт стиральных машин рядом` | ru-RU | local service | local_service | локальность, контакты, доверие, CTA |
| G10 | `iphone дата выхода` | ru-RU | freshness / news | news_or_freshness_page | дата, источник, осторожность к слухам |
| G11 | `как удалить плесень со стены` | ru-RU | how_to | how_to | безопасность, шаги, материалы, когда нужен специалист |
| G12 | `crm` | en-US | ambiguous | hub_or_disambiguation | система должна зафиксировать неоднозначность |

Правило ID: test run IDs должны совпадать с этой таблицей. Если для быстрого smoke-test используется временная нумерация, перед итоговой оценкой нужно привести артефакты к golden-query ID.

Расширенный набор добавляется после первых 12 тестов.

## 4. Рубрика оценки brief

Каждый brief оценивается по 10 критериям. Шкала: 0-2.

| Критерий | 0 | 1 | 2 |
|---|---|---|---|
| Intent fit | интент неверный | частично | точный dominant + secondary |
| Page type | шаблонный guide | подходит частично | формат соответствует задаче |
| First screen | generic intro | частично полезен | сразу закрывает главный интент |
| Modules | случайный набор | часть модулей верна | модули вытекают из интента |
| Outline specificity | универсальный | частично конкретный | нельзя применить к другому запросу без правок |
| SERP discipline | выдумывает SERP | отделяет гипотезы | явно опирается на данные SERP |
| Differentiating value | "добавить FAQ" | слабая ценность | конкретные данные/методика/инструмент |
| Trust/freshness | игнорирует | частично | явно задает требования |
| Technical brief | общие слова | частично | разработчик понимает, что делать |
| Guardrails | обещает топ/schema magic | есть мелкие риски | осторожные корректные формулировки |

Максимум: 20 баллов.

Интерпретация:

- 18-20: готово для production workflow;
- 15-17: годится, но нужны точечные правки;
- 12-14: логика работает нестабильно;
- ниже 12: спецификацию или skill надо переделывать.

Критический fail независимо от баллов:

- один и тот же outline для разных интентов;
- schema для невидимого контента;
- обещание гарантированного роста позиций;
- YMYL без предупреждений и источников;
- SERP-выводы без SERP-данных;
- fallback SERP выдан как полноценный XMLRiver/parsed-DOM анализ;
- копирование структуры конкурентов как основной метод.

## 5. Формат тестового запуска

Для каждого запроса сохранять результат в таком формате:

```markdown
# Test Run: G01

## Input
- Query:
- Locale:
- SERP mode: offline | live | fallback
- SERP provider:
- SERP provider status: ok | temporary_error | unavailable | quota_or_auth_error
- SERP data mode: title_snippet_only | parsed_html | rendered_dom | full_serp_features
- Parser used: true | false
- Fallback used: true | false
- Date:

## Expected
- Intent:
- Page type:
- Must-have modules:
- Red flags:

## Actual
- Summary:
- Page type:
- First screen:
- Modules:
- Outline:
- Trust/freshness:
- Technical brief:

## Score
- Intent fit:
- Page type:
- First screen:
- Modules:
- Outline specificity:
- SERP discipline:
- Differentiating value:
- Trust/freshness:
- Technical brief:
- Guardrails:
- Total:

## Verdict
pass | revise | fail

## Notes
- What broke:
- What to change in spec/skill:
```

## 6. Первый ручной smoke-test

Для первого ручного теста лучше взять 3 запроса:

1. `ипотечный калькулятор` - проверяет tool-first, YMYL и методику.
2. `что такое api` - проверяет definition/article-first.
3. `notion vs obsidian` - проверяет comparison-first.

Если система для этих трех запросов выдаст похожий outline, значит Outline Engine не работает.

Если она выдаст разные структуры:

- calculator: инструмент -> формула -> примеры -> ограничения;
- definition: короткое определение -> контекст -> примеры -> связанные понятия;
- comparison: критерии -> таблица -> сценарии выбора -> плюсы/минусы;

значит базовая логика живая.

## 7. Как тестировать перед упаковкой в skill

Перед созданием skill нужно получить 3 артефакта:

1. Спецификация: `seo-query-analysis-spec.md`.
2. Тест-план: `seo-query-analysis-test-plan.md`.
3. Минимум 6 test runs с оценками по рубрике.

После этого можно делать skill:

```text
seo-query-brief
```

Предполагаемая структура skill:

```text
skills/seo-query-brief/
  SKILL.md
  references/
    seo-query-analysis-spec.md
    test-rubric.md
    outline-archetypes.md
  scripts/
    score_brief.py
```

Что должно быть в SKILL.md:

- когда использовать skill;
- быстрый workflow;
- когда требовать live SERP;
- как помечать offline результат как `knowledge_draft`;
- как выдавать Production Brief;
- какие guardrails нельзя нарушать.

Что не надо класть в SKILL.md:

- весь длинный документ спецификации;
- большие примеры;
- историю сравнения с Gemini.

Идея skill: короткий SKILL.md + references для деталей + простой scoring script.

## 8. Минимальный критерий готовности к skill

Можно упаковывать в draft skill, когда:

- 6 из 6 тестов набрали минимум 15/20;
- 3 разных интента дали разные outline-архетипы;
- ни один тест не нарушил critical fail;
- хотя бы один тест проверил provider error/fallback поведение;
- skill-инструкция помещается в короткий workflow;
- подробности вынесены в references, а не перегружают SKILL.md.

Для production-grade automation дополнительно нужно:

- минимум 6 тестов с полноценным SERP API кэшем или явно задокументированной причиной fallback;
- минимум 1 тест с `parsed_html`;
- минимум 1 тест с `rendered_dom`;
- проверка, что система снижает уверенность при `title_snippet_only`;
- проверка, что commercial/zero-click-heavy запросы получают `business_viability_note` или `build_only_if`.
- parser implementation smoke gate `Passed: 6/6`.
- full-analysis gate прошел без critical fail.

## 9. Production gate

Локальная production-ready версия считается готовой, когда проходят:

```text
npm.cmd run benchmark:offline
npm.cmd run parse:serp -- G01 G02 G04
npm.cmd test
```

`npm.cmd test` должен пройти всю цепочку:

1. offline benchmark G01-G12;
2. parsed SERP re-analysis;
3. full-analysis generation;
4. production gate.

Обязательные доказательства:

- `reports/offline-benchmark-report.md`: минимум 11/12, минимум 7 разных archetypes;
- `reports/parser-analysis-2026-06-04.md`: parser and generic decision engine pass the production smoke gate;
- `reports/full-analysis-2026-06-04.md`: full-analysis checks pass;
- `reports/production-gate-report.md`: 22/22;
- `skills/seo-query-brief/SKILL.md`: skill artifact exists;
- `.env.example`: реальные ключи не сохранены.
