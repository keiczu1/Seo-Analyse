# Project Map

Этот файл фиксирует структуру проекта после уборки. Цель простая: человек должен за 30 секунд понять, где код, где данные, где отчеты и где спецификация.

## Root

| Путь | Назначение |
|---|---|
| `README.md` | Главный вход и быстрые команды. |
| `install.ps1` | One-command installer из GitHub в любой проект. |
| `package.json` | npm scripts для пайплайна. |
| `.env.example` | Шаблон переменных окружения без секретов. |
| `scripts/` | Код пайплайна. |
| `data/` | Кэш, parsed output, benchmark JSON, machine-readable analysis. |
| `reports/` | Человеческие отчеты прогонов. |
| `docs/` | Спецификации, ревью, архивные заметки. |
| `skills/` | Локальные skill artifacts. |
| `dist/` | Сборка переносимого пакета и zip. |

## Code

| Путь | Назначение |
|---|---|
| `scripts/fetch-serp.mjs` | Получает SERP XML из XMLRiver или использует свежий кэш. |
| `scripts/hybrid-parser.mjs` | Парсит страницы из SERP через fast HTML и Playwright fallback. |
| `scripts/analyze-parsed-matrix.mjs` | Проверяет parsed matrix и базовые решения по запросам. |
| `scripts/generate-full-analysis.mjs` | Генерирует полный SEO brief по parsed SERP. |
| `scripts/benchmark-offline.mjs` | Проверяет query-only классификацию на golden queries. |
| `scripts/production-gate.mjs` | Проверяет готовность проекта и отсутствие утечек ключей. |
| `scripts/analyze-query.mjs` | Оркестратор: fetch, parse, analyze. |
| `scripts/lib/analysis-engine.mjs` | Основная логика выбора archetype, outline, gaps, trust/schema. |
| `scripts/lib/paths.mjs` | Единая карта путей. |

## Data

| Путь | Назначение |
|---|---|
| `data/serp-cache/` | XMLRiver XML и `manifest.json`. |
| `data/parser-output/pages/` | JSON по каждой распарсенной странице. |
| `data/parser-output/parsed-matrix.json` | Сводная матрица парсинга. |
| `data/parser-output/parsed-matrix.md` | Человеческий просмотр матрицы. |
| `data/analysis/full-analysis-output.json` | Полный анализ в JSON. |
| `data/benchmark/golden-queries.json` | Golden queries G01-G12. |
| `data/benchmark/offline-benchmark-output.json` | JSON-результат offline benchmark. |

## Reports

| Путь | Назначение |
|---|---|
| `reports/offline-benchmark-report.md` | Результат query-only benchmark. |
| `reports/parser-analysis-2026-06-04.md` | Проверка parsed SERP matrix. |
| `reports/full-analysis-2026-06-04.md` | Полный отчет по анализу SERP. |
| `reports/production-gate-report.md` | Итоговый production gate. |

## Docs

| Путь | Назначение |
|---|---|
| `docs/spec/seo-query-analysis-spec.md` | Основная спецификация системы. |
| `docs/spec/seo-query-analysis-test-plan.md` | Тест-план и acceptance checks. |
| `docs/spec/production-action-plan-2026-06-04.md` | План доведения до production-ready состояния. |
| `docs/reviews/project-review.md` | Ревью подхода и дальнейшие улучшения. |
| `docs/reviews/quality-evaluation-2026-06-04.md` | Оценка качества текущей реализации. |
| `docs/source-material/Gemini.md` | Исходный материал Gemini для сравнения. |
| `docs/archive/` | Исторические smoke/extended проверки. |

## Skill

| Путь | Назначение |
|---|---|
| `skills/seo-query-brief/SKILL.md` | Главная инструкция skill. |
| `skills/seo-query-brief/references/` | Reference workflow и scoring rubric. |
| `skills/seo-query-brief/scripts/score-brief.mjs` | Локальная проверка brief. |
| `skills/seo-query-brief/agents/openai.yaml` | Агентная конфигурация. |
