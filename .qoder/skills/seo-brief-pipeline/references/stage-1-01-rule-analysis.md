# Stage 1. Rule-Based Analysis

Цель этапа - получить структурный каркас страницы до генерации брифа: intent, архетип, YMYL-риск, outline, entity map, gaps и source plan.

## Если доступен analysis engine

Запусти:

```powershell
npm.cmd run analyze:query -- --id <queryId> --query "<query>" --locale ru-RU
```

Прочитай `data/analysis/full-analysis-output.json` и перенеси в `stage1_output`:

- `archetype` - тип страницы;
- `isYMYL` - YMYL-флаг и уровень риска;
- `outline` - рекомендуемая структура;
- `entityMap` - сущности и атрибуты;
- `sourcePlan` - требования к источникам;
- `gaps` - пробелы покрытия;
- `profile` - профиль страницы.

## Offline-режим

Если `analysis-engine.mjs` недоступен, выполни Stage 1 вручную:

1. Определи доминирующий intent запроса.
2. Выбери архетип страницы: `how_to_guide`, `article_guide_definition`, `comparison_page`, `hybrid_tool_guide`, `commercial_comparison_page` или смешанный архетип.
3. Отметь YMYL-риск: нет, средний, высокий.
4. Проверь `parser-output/parsed-matrix.json`, если он есть в проекте.
5. Собери базовую entity map.
6. Предложи outline из 6-10 H2.
7. Отметь `evidence_mode: knowledge_draft`, если SERP или парсер недоступны.

## Выход этапа

В начале брифа должен быть внутренний блок `stage1_output`. Он не публикуется в HTML, но Stage 2 обязан опираться на него при заполнении 15 секций.
