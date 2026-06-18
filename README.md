# SEO Query Analysis

Рабочий проект для анализа поискового запроса и SERP: сбор XMLRiver выдачи, гибридный парсинг страниц, выбор типа страницы, outline, редакторский brief, frontend brief, trust/schema требования и production gate.

## Быстрый вход

Установка из GitHub в любой проект одной командой после публикации репозитория:

```powershell
irm https://raw.githubusercontent.com/Keiczu1/Seo-Analyse/main/install.ps1 | iex
```

Если GitHub-репозиторий будет называться иначе:

```powershell
iex "& { $(irm https://raw.githubusercontent.com/OWNER/REPO/main/install.ps1) } -Repo OWNER/REPO"
```

Команда ставит skill локально в текущий проект, не глобально: `skills/seo-query-brief/`. Optional CLI ставится в `tools/seo-query-brief/`.

Главные команды:

```powershell
npm.cmd run fetch:serp -- G01 G02 G04
npm.cmd run parse:serp -- G01 G02 G04
npm.cmd run analyze:full
npm.cmd run package:skill
npm.cmd test
```

Для одного нового запроса:

```powershell
npm.cmd run analyze:query -- --id Q01 --query "ваш запрос" --locale ru-RU
```

Эта команда делает полный рабочий прогон:

```text
fetch-serp -> hybrid-parser -> analyze-parsed -> analyze-full -> cluster:query -> brief:query -> page:spec
```

Конечный production brief сохраняется отдельно:

```text
reports/query-<slug>-<date>.md
reports/page-spec-<slug>-<date>.md
```

Повторно собрать конечный файл из текущего `data/analysis/full-analysis-output.json` можно так:

```powershell
npm.cmd run cluster:query -- --id Q01
npm.cmd run brief:query -- --id Q01
npm.cmd run page:spec -- --id Q01
npm.cmd run score:brief -- reports/query-<slug>-<date>.md
npm.cmd run validate:page-spec -- reports/page-spec-<slug>-<date>.md
```

Кластер сохраняется отдельным доказательным артефактом:

```text
data/clusters/<id>-cluster.json
reports/cluster-<slug>-<date>.md
```

Без внешних keyword-сервисов режим кластера маркируется как `parsed_serp_cluster + synthetic_cluster`: это карта интентов и границ страницы, а не частотное семантическое ядро.

Если нужна публикационная проверка источников для поддержанного source catalog:

```powershell
New-Item -ItemType Directory -Force data/source-catalog
# Добавь data/source-catalog/<queryId>.json с официальными источниками.
npm.cmd run source:refresh
npm.cmd run publication:review
npm.cmd run brief:query -- --id Q01
npm.cmd run page:spec -- --id Q01
```

Для live-запросов XMLRiver положи реальные значения в локальный `.env` или переменные окружения. `.env.example` содержит только шаблон, ключи в проект не сохраняются.

## Где что искать

| Папка | Что внутри |
|---|---|
| `scripts/` | Исполняемый код пайплайна. |
| `scripts/lib/paths.mjs` | Единая карта путей проекта. Если меняется структура, начинать отсюда. |
| `data/serp-cache/` | XMLRiver XML-кэш и manifest без секретов. |
| `data/parser-output/` | JSON/Markdown результат гибридного парсера. |
| `data/analysis/` | Машиночитаемый полный анализ. |
| `data/clusters/` | JSON-кластеры запросов: include/support/exclude/split и evidence mode. |
| `data/source-catalog/` | Official-source candidates for source refresh, one JSON catalog per `queryId`. |
| `data/benchmark/` | Golden queries и JSON-результат offline benchmark. |
| `reports/` | Человеческие отчеты последних прогонов. |
| `reports/query-<slug>-<date>.md` | Конечный production brief по конкретному запросу. |
| `reports/page-spec-<slug>-<date>.md` | Конечное ТЗ на страницу: first screen, компоненты, source/fact map, QA. |
| `reports/cluster-<slug>-<date>.md` | Человеческий отчет по кластеру запроса. |
| `docs/spec/` | Спецификация, тест-план, production action plan. |
| `docs/reviews/` | Оценки качества и сравнение подходов. |
| `docs/source-material/` | Исходные материалы, например ответ Gemini. |
| `docs/archive/` | Исторические smoke/extended проверки. |
| `skills/seo-query-brief/` | Локальный skill artifact для упаковки. |
| `dist/seo-query-brief-portable/` | Переносимый пакет skill + optional CLI kit, создается командой `npm.cmd run package:skill`. |
| `install.ps1` | One-command installer из GitHub в любой проект. |

## Главные файлы

- `docs/spec/seo-query-analysis-spec.md` - основная спецификация.
- `docs/spec/seo-query-analysis-test-plan.md` - протокол проверки.
- `reports/production-gate-report.md` - итоговый gate готовности.
- `reports/full-analysis-2026-06-04.md` - полный анализ по текущим SERP.
- `data/analysis/full-analysis-output.json` - тот же анализ в JSON.
- `skills/seo-query-brief/SKILL.md` - skill-инструкция.
- `dist/seo-query-brief-portable/INSTALL.md` - как перенести skill в другой проект без глобальной установки.
- `install.ps1` - установщик для команды `irm .../install.ps1 | iex`.

## Правило структуры

Корень проекта должен оставаться коротким: `README`, package-файлы, env/git настройки и четыре рабочие зоны: `scripts`, `data`, `docs`, `reports`, `skills`.

Если появляется новый артефакт:

- исходная методология идет в `docs/spec/`;
- проверочный отчет идет в `reports/`;
- машинный JSON или кэш идет в `data/`;
- материалы для skill идут в `skills/seo-query-brief/`;
- переносимый пакет собирается в `dist/seo-query-brief-portable/`;
- код пайплайна идет в `scripts/`.
