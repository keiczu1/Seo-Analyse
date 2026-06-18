import fs from "node:fs/promises";
import path from "node:path";
import {
  clustersDir,
  fullAnalysisJsonPath,
  publicationReviewJsonPath,
  rel,
  reportsDir,
  rootDir,
  serpManifestPath,
  sourceRefreshJsonPath,
} from "./lib/paths.mjs";

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith("--")) {
      args._.push(item);
      continue;
    }
    const key = item.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) args[key] = true;
    else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

async function readJsonIfExists(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return fallback;
    throw error;
  }
}

function mdTable(headers, rows) {
  const safe = (value) => String(value ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
  return [
    `| ${headers.map(safe).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(safe).join(" | ")} |`),
  ].join("\n");
}

function list(items, fallback = "-") {
  const values = (items || []).filter((item) => item !== undefined && item !== null && String(item).trim() !== "");
  if (!values.length) return `- ${fallback}`;
  return values.map((item) => `- ${item}`).join("\n");
}

function inlineList(items, fallback = "-") {
  const values = (items || []).filter(Boolean);
  return values.length ? values.join("; ") : fallback;
}

function componentLabel(query, id) {
  return query.implementationContract?.components?.find((component) => component.id === id)?.label || id;
}

const RU_TRANSLIT = new Map(
  Object.entries({
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "c",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ъ: "",
    ы: "y",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya",
  }),
);

function slugify(value, fallback) {
  const transliterated = [...String(value || "").toLowerCase()]
    .map((char) => RU_TRANSLIT.get(char) ?? char)
    .join("");
  const slug = transliterated
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 80)
    .replace(/-+$/g, "");
  return slug || slugify(fallback || "query", "query");
}

function isRu(query) {
  return String(query.locale || "").toLowerCase().startsWith("ru") || /[а-яё]/i.test(query.query || "");
}

function section(en, ru, query) {
  return isRu(query) ? `${en} / ${ru}` : en;
}

function statusText(value) {
  return value === undefined || value === null || value === "" ? "-" : String(value);
}

const MODULE_GUIDANCE = {
  quick_answer: {
    heading: { ru: "Коротко: что делать в первую очередь", en: "Short Answer: What To Do First" },
    goal: {
      ru: "Сразу закрыть главный вопрос пользователя без общего вступления и без неподтвержденных обещаний.",
      en: "Answer the primary task immediately without a generic introduction or unsupported claims.",
    },
    include: {
      ru: [
        "Прямой ответ на основной запрос в 2-4 коротких абзацах или bullets.",
        "Главную развилку сценариев: когда порядок простой, а когда нужны дополнительные проверки.",
        "Предупреждение, какие факты нельзя утверждать без обновленных источников.",
      ],
      en: [
        "Direct answer to the primary query in 2-4 short paragraphs or bullets.",
        "Main decision branch: when the path is simple and when extra verification is needed.",
        "Warning for facts that must not be claimed without refreshed sources.",
      ],
    },
    format: { ru: "короткий answer box + 3-5 bullets", en: "short answer box + 3-5 bullets" },
    acceptance: { ru: "читатель понимает следующий шаг до прокрутки", en: "reader knows the next step before scrolling" },
  },
  step_by_step: {
    heading: { ru: "Порядок действий по шагам", en: "Step-By-Step Process" },
    goal: { ru: "Превратить интент 'как сделать' в проверяемую последовательность действий.", en: "Turn the how-to intent into a verifiable action sequence." },
    include: {
      ru: [
        "Шаги в естественном порядке выполнения.",
        "Входные условия для каждого шага: что пользователь должен знать или иметь.",
        "Точки принятия решения: когда сценарий меняется или требуется другой путь.",
        "Что считается завершением шага.",
      ],
      en: [
        "Steps in the natural execution order.",
        "Entry conditions for each step: what the user must know or have.",
        "Decision points where the scenario changes.",
        "What counts as step completion.",
      ],
    },
    format: { ru: "нумерованный список с короткими пояснениями", en: "numbered list with short explanations" },
    acceptance: { ru: "пользователь может выполнить процесс без чтения конкурентов", en: "user can complete the process without reading competitors" },
  },
  requirements: {
    heading: { ru: "Условия и ограничения", en: "Requirements And Limits" },
    goal: { ru: "Показать, от чего зависит применимость инструкции и где меняется порядок действий.", en: "Show what makes the instruction applicable and where the process changes." },
    include: {
      ru: [
        "Обязательные условия, без которых инструкция неприменима.",
        "Исключения и спорные случаи.",
        "Разницу между обязательным требованием и полезной рекомендацией.",
      ],
      en: [
        "Required conditions for the instruction to apply.",
        "Exceptions and edge cases.",
        "Difference between a hard requirement and useful advice.",
      ],
    },
    format: { ru: "таблица 'условие - что это меняет'", en: "table: requirement - what it changes" },
    acceptance: { ru: "читатель понимает, подходит ли ему основной сценарий", en: "reader understands whether the main scenario applies" },
  },
  documents_or_tools: {
    heading: { ru: "Что подготовить перед началом", en: "What To Prepare" },
    goal: { ru: "Собрать входные данные, документы, поля или материалы в отдельный рабочий блок.", en: "Collect required inputs, documents, fields, or materials in one usable block." },
    include: {
      ru: [
        "Чеклист того, что нужно подготовить.",
        "Какие пункты обязательны, а какие зависят от сценария.",
        "Если это интерактивный модуль - поля, состояния ошибок и результат.",
      ],
      en: [
        "Checklist of what to prepare.",
        "Which items are required and which depend on the scenario.",
        "For an interactive module: fields, error states, and output.",
      ],
    },
    format: { ru: "чеклист или мини-инструмент above the fold, если это помогает задаче", en: "checklist or mini tool above the fold when useful" },
    acceptance: { ru: "пользователь видит, чего ему не хватает для выполнения задачи", en: "user can see what is missing to complete the task" },
  },
  risks: {
    heading: { ru: "Ошибки, риски и спорные ситуации", en: "Mistakes, Risks And Edge Cases" },
    goal: { ru: "Закрыть то, что в SERP часто раскрыто слабо: ошибки, ограничения и последствия неверного действия.", en: "Cover what SERP often under-serves: mistakes, limits, and consequences of wrong action." },
    include: {
      ru: [
        "Типичные ошибки пользователя.",
        "Ситуации, где нельзя давать однозначный совет без источника или специалиста.",
        "Что проверить перед тем, как действовать.",
      ],
      en: [
        "Common user mistakes.",
        "Situations where a definitive answer needs a source or expert.",
        "What to check before acting.",
      ],
    },
    format: { ru: "таблица 'риск - как избежать - когда остановиться'", en: "table: risk - how to avoid it - when to stop" },
    acceptance: { ru: "страница предотвращает очевидные неправильные действия", en: "page prevents obvious wrong actions" },
  },
  when_to_get_help: {
    heading: { ru: "Когда нужен специалист", en: "When To Get Help" },
    goal: { ru: "Поставить границу между самостоятельным сценарием и ситуацией, где нужен эксперт.", en: "Draw the line between self-serve use and expert help." },
    include: {
      ru: [
        "Триггеры, при которых самостоятельной инструкции недостаточно.",
        "Какие вопросы подготовить специалисту.",
        "Чего страница сознательно не обещает решить.",
      ],
      en: [
        "Triggers where a self-serve guide is not enough.",
        "Questions to prepare for the specialist.",
        "What the page deliberately does not promise to solve.",
      ],
    },
    format: { ru: "короткий список триггеров + блок ограничений", en: "short trigger list + limitation block" },
    acceptance: { ru: "не создается ложное ощущение экспертной консультации", en: "does not create a fake expert-consultation impression" },
  },
  last_updated: {
    heading: { ru: "Источники и дата проверки", en: "Sources And Checked Date" },
    goal: { ru: "Сделать доверие видимым: какие факты проверены, где и когда.", en: "Make trust visible: which facts were checked, where, and when." },
    include: {
      ru: [
        "Список источников, которые реально использованы.",
        "Дату последней проверки изменяемых фактов.",
        "Что осталось ограничением или требует ручной проверки.",
      ],
      en: [
        "List of sources actually used.",
        "Last checked date for changeable facts.",
        "Remaining limitations or manual-review needs.",
      ],
    },
    format: { ru: "trust block внизу страницы + краткая дата в первом экране при high-risk", en: "trust block near the end + checked date near top for high-risk" },
    acceptance: { ru: "любое важное утверждение можно сопоставить с источником", en: "every important claim can be mapped to a source" },
  },
  interactive_tool: {
    heading: { ru: "Инструмент на первом экране", en: "Interactive Tool Above The Fold" },
    goal: { ru: "Дать пользователю результат на странице, а не только объяснение.", en: "Let the user get a result on the page, not only read about it." },
    include: {
      ru: ["Поля ввода с понятными label.", "Результат текстом и в доступном формате.", "Ошибки, пустые состояния и ограничения расчета."],
      en: ["Inputs with clear labels.", "Result as accessible text.", "Errors, empty states, and calculation limits."],
    },
    format: { ru: "форма + результат + короткое пояснение", en: "form + result + short explanation" },
    acceptance: { ru: "инструмент работает без чтения всей статьи", en: "tool works without reading the whole article" },
  },
  result_block: {
    heading: { ru: "Что показывает результат", en: "What The Result Means" },
    goal: { ru: "Объяснить итог, диапазоны, единицы и ограничения результата.", en: "Explain the output, ranges, units, and limits." },
    include: { ru: ["Расшифровка результата.", "Единицы измерения или категории.", "Что результат не означает."], en: ["Result interpretation.", "Units or categories.", "What the result does not mean."] },
    format: { ru: "result card + текстовая расшифровка", en: "result card + text explanation" },
    acceptance: { ru: "результат понятен без внешней справки", en: "result is understandable without external lookup" },
  },
  methodology: {
    heading: { ru: "Методика и формула", en: "Methodology And Formula" },
    goal: { ru: "Показать, как получен результат и где границы метода.", en: "Show how the result is produced and where the method stops." },
    include: { ru: ["Формула или метод.", "Источник методики.", "Пример применения."], en: ["Formula or method.", "Method source.", "Worked example."] },
    format: { ru: "формула + пример + ограничения", en: "formula + example + limitations" },
    acceptance: { ru: "методику можно проверить", en: "method can be verified" },
  },
  worked_examples: {
    heading: { ru: "Примеры", en: "Examples" },
    goal: { ru: "Показать задачу на реалистичных сценариях.", en: "Show the task in realistic scenarios." },
    include: { ru: ["Минимум один простой пример.", "Один пограничный или частый сценарий.", "Пояснение результата."], en: ["At least one simple example.", "One edge or common scenario.", "Result explanation."] },
    format: { ru: "короткие кейсы", en: "short cases" },
    acceptance: { ru: "пример помогает проверить понимание", en: "example helps validate understanding" },
  },
  limitations: {
    heading: { ru: "Ограничения", en: "Limitations" },
    goal: { ru: "Не дать пользователю принять предварительную информацию за окончательное решение.", en: "Prevent users from treating preliminary information as final advice." },
    include: { ru: ["Границы точности.", "Когда данные устаревают.", "Когда нужен официальный источник или эксперт."], en: ["Accuracy limits.", "When data gets stale.", "When an official source or expert is needed."] },
    format: { ru: "warning block + bullets", en: "warning block + bullets" },
    acceptance: { ru: "страница не обещает больше, чем может доказать", en: "page does not promise more than it can prove" },
  },
  source_date: {
    heading: { ru: "Источники и дата обновления", en: "Sources And Update Date" },
    goal: { ru: "Показать происхождение данных и дату проверки.", en: "Show data provenance and checked date." },
    include: { ru: ["Источник данных.", "Дата обновления.", "Правила пересмотра."], en: ["Data source.", "Update date.", "Refresh rules."] },
    format: { ru: "trust block", en: "trust block" },
    acceptance: { ru: "источник данных видим", en: "data source is visible" },
  },
};

const COMPONENT_MATCHERS = [
  ["quick_answer", ["главное", "корот", "итог", "summary", "answer", "overview"]],
  ["step_by_step", ["шаг", "поряд", "процедур", "инструкц", "как подать", "этап", "process", "step"]],
  ["requirements", ["услов", "требован", "правил", "когда", "можно", "нужно", "eligible", "require"]],
  ["documents_or_tools", ["документ", "заявлен", "подготов", "форма", "поле", "input", "field", "tool"]],
  ["risks", ["ошиб", "риск", "отказ", "нельзя", "огранич", "спор", "limit", "mistake", "risk"]],
  ["when_to_get_help", ["специалист", "юрист", "адвокат", "консультац", "эксперт", "professional", "lawyer", "doctor"]],
  ["last_updated", ["источник", "дата", "обнов", "актуаль", "source", "updated", "checked"]],
  ["interactive_tool", ["калькулятор", "конвертер", "инструмент", "расчет", "форма", "input", "calculator", "tool"]],
  ["result_block", ["результат", "итог", "вывод", "result", "output"]],
  ["methodology", ["метод", "формул", "рассчит", "method", "formula"]],
  ["worked_examples", ["пример", "example", "case"]],
  ["limitations", ["огранич", "точност", "disclaimer", "limit"]],
  ["source_date", ["источник", "дата", "обнов", "source", "updated"]],
  ["comparison_table", ["сравн", "таблиц", "критер", "feature", "pricing", "compare"]],
  ["criteria", ["критер", "выбор", "methodology", "criteria"]],
  ["pricing_or_feature_date", ["цена", "стоим", "тариф", "pricing", "price"]],
  ["shortlist", ["best", "луч", "топ", "shortlist"]],
  ["reference_value", ["значение", "таблиц", "справ", "value", "reference"]],
  ["table", ["таблиц", "table"]],
  ["source", ["источник", "source"]],
];

const TOPIC_TO_COMPONENT = new Map([
  ["steps", "step_by_step"],
  ["requirements", "requirements"],
  ["documents", "documents_or_tools"],
  ["risks", "risks"],
  ["date", "last_updated"],
  ["source", "last_updated"],
  ["timestamp", "last_updated"],
  ["formula_method", "methodology"],
  ["examples", "worked_examples"],
  ["limitations", "limitations"],
  ["result", "result_block"],
  ["inputs", "interactive_tool"],
]);

function localText(value, query) {
  if (!value || typeof value !== "object") return value || "";
  return isRu(query) ? value.ru || value.en || "" : value.en || value.ru || "";
}

function sentenceCase(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function humanTopicName(topic, query) {
  const label = String(topic?.label || topic?.id || topic || "").replace(/^query_|^serp_|^topic_/, "");
  const ru = {
    steps: "шаги",
    requirements: "условия и требования",
    documents: "документы и входные данные",
    risks: "риски и ошибки",
    date: "дата актуальности",
    source: "источники",
    timestamp: "время обновления",
    formula_method: "методика",
    examples: "примеры",
    limitations: "ограничения",
    result: "результат",
    inputs: "поля ввода",
  };
  if (isRu(query)) return ru[label] || label;
  return label.replace(/_/g, " ");
}

function cleanSignalText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[™®©]/g, "")
    .trim();
}

function signalKey(value) {
  return cleanSignalText(value).toLowerCase().replace(/[.,:;!?'"`«»()]/g, "").trim();
}

function isUsefulSignal(value) {
  const text = cleanSignalText(value);
  if (text.length < 8 || text.length > 140) return false;
  if (/подпиш|рассылк|отзыв|стоимость услуг|контакты|заказать|записаться|об авторе/i.test(text)) return false;
  return true;
}

function uniqueSignals(items, limit = 40) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const text = cleanSignalText(item.text || item.query || item);
    const key = signalKey(text);
    if (!key || seen.has(key) || !isUsefulSignal(text)) continue;
    seen.add(key);
    result.push({ ...item, text });
    if (result.length >= limit) break;
  }
  return result;
}

function collectSynthesisSignals(query, cluster) {
  const items = [];
  for (const heading of cluster?.sourceSignals?.observedHeadings || query.observedHeadings || []) {
    items.push({
      text: heading.text,
      source: "observed_heading",
      reason: heading.count ? `Observed heading pattern (${heading.count})` : "Observed heading pattern",
    });
  }
  for (const item of cluster?.supportingQueries || []) {
    items.push({
      text: item.query,
      source: item.source || "supporting_query",
      reason: item.reason || "Supporting query candidate",
    });
  }
  for (const item of cluster?.rawSerpSignals || []) {
    items.push({
      text: item.text,
      source: item.source || "raw_serp_signal",
      reason: item.reason || "Raw SERP signal",
    });
  }
  return uniqueSignals(items);
}

function termsForComponent(componentId) {
  const direct = COMPONENT_MATCHERS.filter(([id]) => id === componentId).flatMap(([, terms]) => terms);
  const fallback = String(componentId || "")
    .split(/[_-]+/)
    .filter((part) => part.length >= 4);
  return [...new Set([...direct, ...fallback])];
}

function componentSignals(component, signals, query) {
  const id = component.id || component;
  const terms = termsForComponent(id);
  const matched = signals.filter((signal) => terms.some((term) => signal.text.toLowerCase().includes(term.toLowerCase())));
  if (matched.length) return matched.slice(0, 5);
  if (component.aboveTheFold) return signals.slice(0, 3);
  const queryTerms = String(query.query || "")
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length >= 5);
  return signals.filter((signal) => queryTerms.some((term) => signal.text.toLowerCase().includes(term))).slice(0, 3);
}

function lowCoverageForComponent(component, query, cluster) {
  const allTopics = [
    ...(cluster?.sourceSignals?.lowCoverageTopics || []),
    ...(query.topicCoverage || []).filter((topic) => Number(topic.coverageRatio) < 0.35),
  ];
  const seen = new Set();
  return allTopics.filter((topic) => {
    const id = String(topic.id || topic.label || "");
    if (seen.has(id)) return false;
    seen.add(id);
    return TOPIC_TO_COMPONENT.get(id) === component.id;
  });
}

function sourceChecksForComponent(component, query) {
  if (!query.sourcePlan?.required) return [];
  const langRu = isRu(query);
  const common = langRu
    ? "Проверить утверждения по первичным или официальным источникам до публикации."
    : "Verify claims against primary or official sources before publication.";
  const byId = {
    quick_answer: langRu ? "Не публиковать прямой ответ, пока не проверены базовый порядок, исключения и дата актуальности." : "Do not publish the direct answer until process, exceptions, and checked date are verified.",
    step_by_step: langRu ? "Проверить каждый шаг: куда обращаться, в каком порядке, какие условия меняют процесс." : "Verify each step: where to go, order of actions, and conditions that change the process.",
    requirements: langRu ? "Проверить обязательные условия, ограничения и исключения." : "Verify required conditions, limits, and exceptions.",
    documents_or_tools: langRu ? "Проверить список документов, полей, входных данных и допустимых способов подачи." : "Verify documents, fields, input data, and allowed submission methods.",
    risks: langRu ? "Проверить формулировки рисков, отказов, сроков, расходов и спорных ситуаций." : "Verify risk, refusal, timing, cost, and edge-case claims.",
    when_to_get_help: langRu ? "Не имитировать консультацию: указать только проверяемые триггеры обращения к специалисту." : "Do not imitate expert advice: list only verifiable triggers for expert help.",
    last_updated: langRu ? "Указать фактическую дату проверки и ссылки, которые реально использованы на странице." : "Show the actual checked date and sources used on the page.",
  };
  return [byId[component.id] || common];
}

function componentGuidance(component, query) {
  const guidance = MODULE_GUIDANCE[component.id] || {};
  const label = component.label || sentenceCase(String(component.id || "").replace(/[_-]+/g, " "));
  return {
    heading: localText(guidance.heading, query) || label,
    goal: localText(guidance.goal, query) || (isRu(query) ? `Закрыть часть пользовательской задачи: ${label}.` : `Satisfy this part of the user task: ${label}.`),
    include: localText(guidance.include, query) || [
      isRu(query)
        ? `Раскрыть блок "${label}" через конкретные действия, условия и ограничения.`
        : `Cover "${label}" through concrete actions, conditions, and limits.`,
    ],
    format: localText(guidance.format, query) || (component.type === "interactive_module" ? "interactive module" : "content block"),
    acceptance: localText(guidance.acceptance, query) || (isRu(query) ? "блок помогает выполнить основную задачу" : "section helps complete the primary task"),
  };
}

function buildActionableOutline(query, cluster) {
  const signals = collectSynthesisSignals(query, cluster);
  const components = query.implementationContract?.components?.length
    ? query.implementationContract.components
    : (query.pageDecision?.requiredModules || []).map((id) => ({ id, label: componentLabel(query, id), type: "content_block", required: true, visible: true }));
  return components.map((component) => {
    const guidance = componentGuidance(component, query);
    const matchedSignals = componentSignals(component, signals, query);
    const lowTopics = lowCoverageForComponent(component, query, cluster);
    const include = [...guidance.include];
    if (lowTopics.length) {
      include.push(
        isRu(query)
          ? `Раскрыть глубже конкурентов: ${lowTopics.map((topic) => humanTopicName(topic, query)).join(", ")}.`
          : `Cover deeper than competitors: ${lowTopics.map((topic) => humanTopicName(topic, query)).join(", ")}.`,
      );
    }
    if (matchedSignals.length) {
      include.push(
        isRu(query)
          ? `Использовать SERP-сигналы как вопросы/подтемы, но не копировать заголовки дословно.`
          : `Use SERP signals as questions/subtopics, but do not copy headings verbatim.`,
      );
    }
    return {
      level: "H2",
      heading: guidance.heading,
      goal: guidance.goal,
      include,
      format: guidance.format,
      acceptance: guidance.acceptance,
      signals: matchedSignals,
      sourceChecks: sourceChecksForComponent(component, query),
      component,
    };
  });
}

function renderSignalBullets(signals, fallback, limit = 5) {
  if (!signals?.length) return list([], fallback);
  return list(signals.slice(0, limit).map((signal) => `${signal.text} (${humanSignalSource(signal.source)})`));
}

function humanSignalSource(source) {
  if (/heading|serp|query/i.test(String(source || ""))) return "SERP-сигнал";
  return "evidence";
}

function humanMeta(query) {
  const base = sentenceCase(query.query);
  const type = query.recommendedPageType || query.pageDecision?.pageType || "";
  const ru = isRu(query);
  const titleSuffixByType = {
    how_to_guide: ru ? "порядок действий, документы и риски" : "steps, requirements, and risks",
    hybrid_tool_guide: ru ? "расчет, методика и ограничения" : "tool, method, and limits",
    interactive_converter: ru ? "конвертер, источник и дата обновления" : "converter, source, and update date",
    comparison_page: ru ? "критерии выбора, сравнение и ограничения" : "criteria, comparison, and limits",
    commercial_comparison_page: ru ? "критерии выбора, цены и методика" : "selection criteria, pricing, and method",
    article_guide_definition: ru ? "простое объяснение, примеры и ошибки" : "plain explanation, examples, and mistakes",
    reference_database: ru ? "значения, таблица и источник" : "values, table, and source",
    local_service_page: ru ? "условия, цены и контакты" : "terms, pricing, and contacts",
  };
  const suffix = titleSuffixByType[type] || (ru ? "что важно знать и проверить" : "what to know and verify");
  let title = `${base}: ${suffix}`;
  if (title.length > 70) title = `${base}: ${ru ? "что делать и что проверить" : "what to do and verify"}`;
  if (title.length > 70) title = base.slice(0, 70).replace(/\s+\S*$/, "");
  const description = ru
    ? `Страница должна сразу закрыть задачу пользователя: дать порядок действий, условия, подготовку, риски и дату проверки источников.`
    : `The page should satisfy the user task directly: steps, requirements, preparation, risks, and checked sources.`;
  return {
    title,
    description,
    titleLength: title.length,
    descriptionLength: description.length,
    basis: ["query", "page type", "user task", "required modules", "trust limits"],
  };
}

function sourceRefreshComplete(refresh) {
  return ["source_verified", "source_verified_reviewer_required"].includes(refresh?.status);
}

function executiveVerdict(query, refresh, review) {
  const ru = isRu(query);
  const type = query.recommendedPageType;
  if (sourceRefreshComplete(refresh) && review?.status === "ready_for_publication_candidate_pending_expert_review") {
    return ru
      ? `Итог: строить одну страницу типа \`${type}\`; источники проверены, но финальную публикацию держать на экспертной проверке.`
      : `Verdict: build one \`${type}\` page; sources are verified, but final publication remains pending expert review.`;
  }
  if (sourceRefreshComplete(refresh) && review?.status === "ready_for_publication_candidate_without_medical_review_claim") {
    return ru
      ? `Итог: строить одну страницу типа \`${type}\`; источники проверены, но нельзя заявлять медицинскую экспертную проверку без реального ревью.`
      : `Verdict: build one \`${type}\` page; sources are verified, but do not claim medical review without a real reviewer.`;
  }
  if (sourceRefreshComplete(refresh) && review?.status === "ready_for_publication_candidate") {
    return ru
      ? `Итог: строить одну страницу типа \`${type}\`; source refresh и publication review пройдены.`
      : `Verdict: build one \`${type}\` page; source refresh and publication review passed.`;
  }
  if (query.sourcePlan?.required) {
    return ru
      ? `Итог: строить одну страницу типа \`${type}\`, но не считать ее публикационно готовой до source refresh и publication review.`
      : `Verdict: build one \`${type}\` page, but keep it blocked for publication until source refresh and publication review pass.`;
  }
  return ru ? `Итог: строить одну страницу типа \`${type}\`.` : `Verdict: build one \`${type}\` page.`;
}

function sourceGateLine(query, refresh) {
  const ru = isRu(query);
  if (!query.sourcePlan?.required) return null;
  if (sourceRefreshComplete(refresh)) {
    return ru
      ? "High-risk утверждения уже имеют source refresh: при написании использовать только проверенные формулировки и ссылки из блока Source Refresh."
      : "High-risk claims have source refresh: use only checked wording and URLs from the Source Refresh block.";
  }
  return ru
    ? "Все изменяемые или high-risk утверждения писать только после source refresh; до этого формулировать как задачи проверки."
    : "All changeable or high-risk claims must wait for source refresh; until then, phrase them as verification tasks.";
}

function readinessBoundaryLine(query, refresh, review) {
  const ru = isRu(query);
  if (review?.status === "ready_for_publication_candidate_pending_expert_review") {
    return ru
      ? "Можно проектировать страницу и писать черновик по проверенным источникам; финальную публикацию и любые claims об экспертной проверке выпускать только после реального профильного ревью."
      : "The page can be designed and drafted from checked sources; final publication and expert-review claims require a real qualified review.";
  }
  if (review?.status === "ready_for_publication_candidate_without_medical_review_claim") {
    return ru
      ? "Можно проектировать и публиковать только как информационный материал по источникам; нельзя заявлять медицинскую проверку или экспертную схему без реального ревью."
      : "The page can proceed only as a source-backed informational page; do not claim medical review or expert schema without real review.";
  }
  if (review?.status === "ready_for_publication_candidate") {
    return ru ? "Можно переходить к реализации и пост-build QA по этому брифу." : "Proceed to implementation and post-build QA against this brief.";
  }
  if (query.sourcePlan?.required && !sourceRefreshComplete(refresh)) {
    return ru
      ? "Можно проектировать страницу и писать черновик, но нельзя выпускать source-sensitive материал как финальный без проверки источников."
      : "The page can be designed and drafted, but source-sensitive content cannot be published as final without source refresh.";
  }
  return ru ? "Можно переходить к реализации и QA по этому брифу." : "Proceed to implementation and QA against this brief.";
}

function renderExecutiveDecision(query, cluster, refresh, review) {
  const lines = [];
  const ru = isRu(query);
  const lowTopics = (cluster?.sourceSignals?.lowCoverageTopics || query.topicCoverage?.filter((topic) => Number(topic.coverageRatio) < 0.35) || [])
    .map((topic) => humanTopicName(topic, query))
    .slice(0, 6);
  const signals = collectSynthesisSignals(query, cluster).slice(0, 6);
  lines.push(`## ${section("Executive Production Decision", "Итоговое решение по странице", query)}`);
  lines.push("");
  lines.push(executiveVerdict(query, refresh, review));
  lines.push("");
  lines.push(ru ? "Содержательная линия:" : "Content line:");
  lines.push("");
  lines.push(
    list([
      ru ? `Первый экран должен отвечать на запрос "${query.query}" действием, а не вводной лекцией.` : `The first screen must answer "${query.query}" with action, not a generic intro.`,
      ru ? `Страница выигрывает не объемом текста, а тем, что собирает путь, условия, подготовку, риски и проверяемые источники в одном месте.` : "The page wins by combining path, requirements, preparation, risks, and verifiable sources in one place.",
      lowTopics.length
        ? ru
          ? `Главная возможность относительно конкурентов: глубже раскрыть ${lowTopics.join(", ")}.`
          : `Main competitor opportunity: cover ${lowTopics.join(", ")} more deeply.`
        : null,
      sourceGateLine(query, refresh),
    ].filter(Boolean)),
  );
  if (signals.length) {
    lines.push("");
    lines.push(ru ? "Что выдача подсказывает использовать как подтемы:" : "SERP signals to use as subtopics:");
    lines.push("");
    lines.push(renderSignalBullets(signals, "-", 6));
  }
  lines.push("");
  lines.push(ru ? "Граница готовности:" : "Readiness boundary:");
  lines.push("");
  lines.push(
    list([
      refresh ? (ru ? `Source refresh status: \`${refresh.status}\`.` : `Source refresh status: \`${refresh.status}\`.`) : ru ? "Source refresh для этого queryId не выполнен." : "Source refresh has not been run for this queryId.",
      review ? (ru ? `Publication review status: \`${review.status}\`.` : `Publication review status: \`${review.status}\`.`) : ru ? "Publication review для этого queryId не выполнен." : "Publication review has not been run for this queryId.",
      readinessBoundaryLine(query, refresh, review),
    ]),
  );
  lines.push("");
  return lines.join("\n");
}

function sourceRefreshFor(query, sourceRefresh) {
  return (sourceRefresh.queries || []).find((item) => item.queryId === query.queryId) || null;
}

function publicationReviewFor(query, publicationReview) {
  return (publicationReview.queries || []).find((item) => item.queryId === query.queryId) || null;
}

function clusterFor(query, context) {
  return context.clustersById?.get(query.queryId) || null;
}

function manifestEntryFor(query, manifest) {
  return manifest.items?.[query.queryId] || null;
}

function evidenceMode(query) {
  const modes = [];
  if ((query.usableUrls || 0) > 0) modes.push("parsed_html", "rendered_dom");
  const providerMode = query.serpFeatures?.providerDataMode;
  if (providerMode && !modes.includes(providerMode)) modes.push(providerMode);
  if (!modes.length) modes.push("knowledge_draft");
  if (query.sourcePlan?.required) modes.push("source_plan");
  return [...new Set(modes)].join(" + ");
}

function readiness(query, refresh, review) {
  if (review?.status?.startsWith("ready_for_publication_candidate")) return review.status;
  if (query.sourcePlan?.required && !refresh) return "implementation_brief_not_publication_ready_source_refresh_not_run";
  if (refresh?.status === "source_search_required") return "implementation_brief_not_publication_ready_source_search_required";
  return "implementation_brief_ready_for_build_review";
}

function renderSourceRefresh(query, refresh) {
  const lines = [];
  lines.push(`## ${section("Source Refresh", "Проверка источников", query)}`);
  lines.push("");
  if (!refresh) {
    lines.push("Status: `not_run_for_this_query`");
    lines.push("");
    lines.push(
      query.sourcePlan?.required
        ? "Для этого запроса source refresh требуется, но в текущих артефактах нет результата проверки официальных URL по этому queryId. Такой brief можно использовать для проектирования страницы, но не как публикационно готовый юридический, медицинский, финансовый или freshness-sensitive материал."
        : "Для этого типа запроса обязательная проверка источников не требуется по текущему source plan.",
    );
    lines.push("");
    return lines.join("\n");
  }

  lines.push(`Status: \`${refresh.status}\``);
  lines.push("");
  lines.push(
    mdTable(
      ["Fact", "Claim status", "Verified sources", "Reviewer"],
      (refresh.facts || []).map((fact) => [
        fact.id,
        fact.refreshStatus || fact.status,
        (fact.verifiedSources || []).map((source) => `${source.source}: ${source.url}`).join("<br>") || "-",
        fact.reviewerRequired ? "yes" : "no",
      ]),
    ),
  );
  if (!(refresh.facts || []).length) lines.push("- Source refresh is not required for this query.");
  lines.push("");
  return lines.join("\n");
}

function renderPublicationReview(query, review) {
  const lines = [];
  lines.push(`## ${section("Publication Review", "Публикационная проверка", query)}`);
  lines.push("");
  if (!review) {
    lines.push("Status: `not_run_for_this_query`");
    lines.push("");
    lines.push("Перед публикацией нужно выполнить publication review или вручную проверить ограничения, источники, schema и недопустимые обещания.");
    lines.push("");
    return lines.join("\n");
  }

  lines.push(`Status: \`${review.status}\``);
  lines.push("");
  lines.push(
    mdTable(
      ["Check", "Status", "Evidence"],
      (review.checks || []).map((check) => [check.name, check.pass ? "pass" : "fail", check.evidence]),
    ),
  );
  if (review.constraints?.length) {
    lines.push("");
    lines.push("Constraints:");
    lines.push("");
    lines.push(list(review.constraints));
  }
  lines.push("");
  return lines.join("\n");
}

function renderBrief(query, context) {
  const manifestEntry = manifestEntryFor(query, context.manifest);
  const refresh = sourceRefreshFor(query, context.sourceRefresh);
  const review = publicationReviewFor(query, context.publicationReview);
  const cluster = clusterFor(query, context);
  const actionableOutline = buildActionableOutline(query, cluster);
  const selectedMeta = humanMeta(query);
  const generatedDate = context.date;
  const outputStatus = readiness(query, refresh, review);
  const request = manifestEntry?.request || {};
  const lines = [];

  lines.push(`# ${isRu(query) ? "Production Brief / Производственный бриф" : "Production Brief"}: ${query.query}`);
  lines.push("");
  lines.push(`Date: ${generatedDate}`);
  lines.push("");
  lines.push(`Query ID: \`${query.queryId}\``);
  lines.push("");
  lines.push(`Status: \`${outputStatus}\``);
  lines.push("");
  lines.push(`Evidence mode: \`${evidenceMode(query)}\``);
  if (cluster) {
    lines.push("");
    lines.push(`Cluster evidence mode: \`${cluster.evidenceMode.join(" + ")}\``);
  }
  lines.push("");
  lines.push(
    `SERP/parser scope: ${query.testedUrls || 0} URLs tested, ${query.usableUrls || 0} usable for detailed conclusions, ${
      query.blockedUrls?.length || 0
    } blocked/limited excluded from detailed gap analysis.`,
  );
  lines.push("");

  lines.push(`## ${section("Query Passport", "Паспорт запроса", query)}`);
  lines.push("");
  lines.push(
    mdTable(
      ["Field", "Value"],
      [
        ["Primary query", query.query],
        ["Locale", query.locale],
        ["Region/device", [request.lr ? `lr=${request.lr}` : null, request.device || null, request.domain ? `domain=${request.domain}` : null].filter(Boolean).join(", ") || "-"],
        ["Provider", manifestEntry?.provider || "-"],
        ["Provider status", manifestEntry?.serpProviderStatus || "-"],
        ["Recommended page type", query.recommendedPageType],
        ["Confidence", query.confidence],
        ["Business goal", query.businessViabilityNote],
        ["Build only if", inlineList(query.buildOnlyIf)],
        ["Freshness/source risk", query.sourcePlan?.required ? `${query.sourcePlan.riskLevel || "source_sensitive"}; source refresh required` : "standard"],
        ["Cluster artifact", cluster ? rel(path.join(clustersDir, `${query.queryId}-cluster.json`)) : "missing; fallback to embedded queryCluster"],
      ],
    ),
  );
  lines.push("");

  lines.push(renderExecutiveDecision(query, cluster, refresh, review));

  lines.push(`## ${section("SERP Interpretation", "Интерпретация выдачи", query)}`);
  lines.push("");
  lines.push(`User task: ${query.userTask}`);
  lines.push("");
  lines.push(`Search expectation: ${query.searchExpectation}`);
  lines.push("");
  lines.push(
    mdTable(
      ["Signal", "Value"],
      [
        ["Dominant parsed page type", `${query.dominantParsedPageType} (${query.pageTypeConfidence})`],
        ["Usable extraction", `${query.usableUrls}/${query.testedUrls}`],
        ["Tables", `${query.moduleSignals?.tables?.count ?? 0}/${query.usableUrls}`],
        ["Forms/inputs", `${query.moduleSignals?.formsOrInputs?.count ?? 0}/${query.usableUrls}`],
        ["Structured data", `${query.moduleSignals?.structuredData?.count ?? 0}/${query.usableUrls}`],
        ["Article signals", `${query.moduleSignals?.articleSignals?.count ?? 0}/${query.usableUrls}`],
        ["FAQ signals", `${query.moduleSignals?.faqSignals?.count ?? 0}/${query.usableUrls}`],
        ["Video signals", `${query.moduleSignals?.videoSignals?.count ?? 0}/${query.usableUrls}`],
      ],
    ),
  );
  if (query.blockedUrls?.length) {
    lines.push("");
    lines.push("Blocked/limited URLs excluded from detailed gap conclusions:");
    lines.push("");
    lines.push(query.blockedUrls.map((item) => `- #${item.position}: ${item.url} (${item.status}; ${item.reason})`).join("\n"));
  }
  lines.push("");

  lines.push(`## ${section("SERP Features", "Особенности выдачи", query)}`);
  lines.push("");
  lines.push(
    mdTable(
      ["Feature", "Value"],
      [
        ["Provider data mode", query.serpFeatures?.providerDataMode],
        ["Full feature inventory available", query.serpFeatures?.providerCanExposeFullFeatures ? "yes" : "no"],
        ["Direct answer", query.serpFeatures?.features?.directAnswer],
        ["Calculator/widget", query.serpFeatures?.features?.calculatorWidget],
        ["People Also Ask", Array.isArray(query.serpFeatures?.features?.peopleAlsoAsk) ? inlineList(query.serpFeatures.features.peopleAlsoAsk) : query.serpFeatures?.features?.peopleAlsoAsk],
        ["Videos", query.serpFeatures?.features?.videos ? "yes" : "no"],
        ["Local pack", query.serpFeatures?.features?.localPack],
        ["Zero-click risk", query.serpFeatures?.zeroClickRisk],
      ],
    ),
  );
  if (query.serpFeatures?.limitations?.length) {
    lines.push("");
    lines.push("Limitations:");
    lines.push("");
    lines.push(list(query.serpFeatures.limitations));
  }
  lines.push("");

  lines.push(`## ${section("Entity Map", "Семантический слой", query)}`);
  lines.push("");
  lines.push(`Primary entity: ${query.entityMap?.primaryEntity || "-"}`);
  lines.push("");
  lines.push(
    mdTable(
      ["Group", "Entities"],
      [
        ["Synonyms", inlineList(query.entityMap?.synonyms)],
        ["Attributes", inlineList(query.entityMap?.attributes)],
        ["Actions", inlineList(query.entityMap?.actions)],
        ["Related entities", inlineList(query.entityMap?.relatedEntities)],
        ["Authority entities", inlineList(query.entityMap?.authorityEntities)],
        ["Risk entities", inlineList(query.entityMap?.riskEntities)],
        ["Excluded entities", inlineList(query.entityMap?.excludedEntities)],
      ],
    ),
  );
  lines.push("");
  lines.push("Relations:");
  lines.push("");
  lines.push(list(query.entityMap?.relations));
  lines.push("");

  lines.push(`## ${section("Query Cluster", "Кластер запроса", query)}`);
  lines.push("");
  if (cluster) {
    lines.push(
      mdTable(
        ["Field", "Value"],
        [
          ["Source", rel(path.join(clustersDir, `${query.queryId}-cluster.json`))],
          ["Evidence mode", cluster.evidenceMode.join(" + ")],
          ["External keyword data used", cluster.externalKeywordDataUsed ? "yes" : "no"],
          ["Decision", cluster.clusterDecision],
          ["Canonical intent", cluster.canonicalIntent],
          ["Included queries", inlineList(cluster.includedQueries.map((item) => item.query))],
          ["Supporting queries", inlineList(cluster.supportingQueries.slice(0, 18).map((item) => item.query))],
          ["Excluded queries", inlineList(cluster.excludedQueries.map((item) => item.query))],
        ],
      ),
    );
  } else {
    lines.push("");
    lines.push("Cluster artifact status: `missing_fallback_to_embedded_query_cluster`");
    lines.push("");
    lines.push(
      mdTable(
        ["Field", "Value"],
        [
          ["Decision", query.queryCluster?.decision],
          ["Canonical intent", query.queryCluster?.canonicalIntent],
          ["Included queries", inlineList(query.queryCluster?.includedQueries)],
          ["Excluded queries", inlineList(query.queryCluster?.excludedQueries)],
        ],
      ),
    );
  }
  const splitCandidates = cluster?.splitCandidates || query.queryCluster?.splitCandidates || [];
  if (splitCandidates.length) {
    lines.push("");
    lines.push("Split candidates:");
    lines.push("");
    lines.push(
      splitCandidates
        .map((item) => `- ${item.query}: ${item.reason || "Separate or adjacent intent."}`)
        .join("\n"),
    );
  }
  if (cluster?.intentGroups?.length) {
    lines.push("");
    lines.push("Intent groups:");
    lines.push("");
    lines.push(
      mdTable(
        ["Group", "Role", "Treatment", "Queries"],
        cluster.intentGroups.map((group) => [
          group.label,
          group.role,
          group.pageTreatment,
          inlineList(group.queries),
        ]),
      ),
    );
  }
  if (cluster) {
    lines.push("");
    lines.push(isRu(query) ? "Как использовать кластер в странице:" : "How to use the cluster on the page:");
    lines.push("");
    lines.push(
      list([
        isRu(query)
          ? "Included queries держать в title/H1/первом экране и закрывать прямым ответом."
          : "Keep included queries in title/H1/first screen and satisfy them directly.",
        isRu(query)
          ? "Supporting queries использовать как H2/H3, чеклисты, предупреждения или FAQ только когда они помогают задаче."
          : "Use supporting queries as H2/H3, checklists, warnings, or FAQ only when they help the task.",
        isRu(query)
          ? "Raw SERP signals использовать как доказательство спроса на подтемы, но не как готовый список ключей."
          : "Use raw SERP signals as evidence for subtopics, not as a ready keyword list.",
        cluster.externalKeywordDataUsed
          ? null
          : isRu(query)
            ? "Внешних данных по частотности нет, поэтому приоритет определяется интентом, SERP-повторяемостью и ценностью для выполнения задачи."
            : "No external keyword-volume data was used; priority comes from intent, SERP repetition, and task value.",
      ].filter(Boolean)),
    );
  }
  if (cluster?.coverageRequirements?.length) {
    lines.push("");
    lines.push("Coverage requirements from cluster:");
    lines.push("");
    lines.push(
      mdTable(
        ["Requirement", "Source", "Related queries"],
        cluster.coverageRequirements.map((item) => [
          item.requirement,
          item.source,
          inlineList(item.relatedQueries),
        ]),
      ),
    );
  }
  if (cluster?.rawSerpSignals?.length) {
    lines.push("");
    lines.push("Raw SERP signals, not normalized keywords:");
    lines.push("");
    lines.push(
      mdTable(
        ["Observed text", "Source", "Reason"],
        cluster.rawSerpSignals.slice(0, 12).map((item) => [
          item.text,
          item.source,
          item.reason,
        ]),
      ),
    );
  }
  const rationale = cluster?.rationale || query.queryCluster?.rationale || [];
  if (rationale.length) {
    lines.push("");
    lines.push("Rationale:");
    lines.push("");
    lines.push(list(rationale));
  }
  lines.push("");

  lines.push(`## ${section("Page Decision", "Решение по странице", query)}`);
  lines.push("");
  lines.push(`Recommendation: \`${query.pageDecision?.recommendation}\``);
  lines.push("");
  lines.push(`Page type: \`${query.pageDecision?.pageType}\``);
  lines.push("");
  lines.push(`Above the fold: ${query.pageDecision?.aboveTheFold}`);
  lines.push("");
  lines.push("Required modules:");
  lines.push("");
  lines.push(list((query.pageDecision?.requiredModules || []).map((module) => `${componentLabel(query, module)} (\`${module}\`)`)));
  lines.push("");
  lines.push("Do not build:");
  lines.push("");
  lines.push(list(query.pageDecision?.doNotBuild));
  lines.push("");

  lines.push(`## ${section("Meta Suggestions", "Title и Description", query)}`);
  lines.push("");
  lines.push(`Selected title: ${selectedMeta.title} (${selectedMeta.titleLength} chars)`);
  lines.push("");
  lines.push(
    `Selected description: ${selectedMeta.description} (${selectedMeta.descriptionLength} chars)`,
  );
  lines.push("");
  lines.push(isRu(query) ? "Почему этот вариант лучше машинного черновика:" : "Why this beats the machine draft:");
  lines.push("");
  lines.push(
    list([
      isRu(query)
        ? "Он называет реальную ценность страницы: порядок, подготовка, риски и проверка, а не внутренние labels модулей."
        : "It names the page value: process, preparation, risks, and verification, not internal module labels.",
      isRu(query)
        ? "Он не обещает факты, которые еще не прошли source refresh."
        : "It does not promise facts that still need source refresh.",
    ]),
  );
  lines.push("");
  lines.push(
    mdTable(
      ["Title", "Description", "Basis"],
      [
        [selectedMeta.title, selectedMeta.description, inlineList(selectedMeta.basis)],
        ...(query.metaSuggestions?.variants || []).map((variant) => [
          variant.title,
          variant.description,
          `machine draft; ${inlineList(variant.basis)}`,
        ]),
      ],
    ),
  );
  if (query.metaSuggestions?.rules?.length) {
    lines.push("");
    lines.push("Rules:");
    lines.push("");
    lines.push(list(query.metaSuggestions.rules));
  }
  lines.push("");

  lines.push(`## ${section("Source Plan", "План источников", query)}`);
  lines.push("");
  lines.push(
    mdTable(
      ["Field", "Value"],
      [
        ["Required", query.sourcePlan?.required ? "yes" : "no"],
        ["Risk level", query.sourcePlan?.riskLevel || "-"],
        ["Publication status", query.sourcePlan?.publicationStatus || "-"],
        ["Reviewer required", query.sourcePlan?.reviewerRequired ? "yes" : "no"],
        ["Required visible blocks", inlineList(query.sourcePlan?.requiredVisibleBlocks)],
      ],
    ),
  );
  if (query.sourcePlan?.facts?.length) {
    lines.push("");
    lines.push(
      mdTable(
        ["Fact", "Claim", "Preferred sources", "Status", "Reviewer"],
        query.sourcePlan.facts.map((fact) => [
          fact.id,
          fact.claim,
          inlineList(fact.preferredSources),
          fact.status,
          fact.reviewerRequired ? "yes" : "no",
        ]),
      ),
    );
  }
  if (query.sourcePlan?.required) {
    lines.push("");
    lines.push(isRu(query) ? "Проверить перед публикацией:" : "Verify before publication:");
    lines.push("");
    const sourceQuestions = [...new Set(actionableOutline.flatMap((item) => item.sourceChecks).filter(Boolean))];
    lines.push(list(sourceQuestions));
  }
  lines.push("");

  lines.push(renderSourceRefresh(query, refresh));
  lines.push(renderPublicationReview(query, review));

  lines.push(`## ${section("Implementation Contract", "Контракт разработки", query)}`);
  lines.push("");
  lines.push(`Contract status: \`${query.implementationContract?.contractStatus || "-"}\``);
  lines.push("");
  lines.push(
    mdTable(
      ["Component", "Label", "Type", "Required", "Visible", "Above fold", "Purpose"],
      (query.implementationContract?.components || []).map((component) => [
        component.id,
        component.label || component.id,
        component.type,
        component.required ? "yes" : "no",
        component.visible ? "yes" : "no",
        component.aboveTheFold ? "yes" : "no",
        component.purpose || "-",
      ]),
    ),
  );
  lines.push("");
  lines.push(isRu(query) ? "Спецификация компонентов:" : "Component specs:");
  lines.push("");
  for (const item of actionableOutline) {
    lines.push(`### ${item.heading}`);
    lines.push("");
    lines.push(`- ${isRu(query) ? "Назначение" : "Purpose"}: ${item.goal}`);
    lines.push(`- ${isRu(query) ? "Формат" : "Format"}: ${item.format}.`);
    lines.push(`- ${isRu(query) ? "Критерий готовности" : "Acceptance"}: ${item.acceptance}.`);
    if (item.sourceChecks.length) {
      lines.push(`- Source gate: ${item.sourceChecks.join(" ")}`);
    }
    if (item.component.type === "interactive_module") {
      lines.push(
        `- ${
          isRu(query)
            ? "Состояния UI: пустое состояние, заполнено частично, ошибка/не хватает данных, готовый результат, source-refresh required."
            : "UI states: empty, partial input, error/missing data, ready result, source-refresh required."
        }`,
      );
    }
    lines.push("");
  }
  lines.push("");
  lines.push("Acceptance tests:");
  lines.push("");
  lines.push(list(query.implementationContract?.acceptanceTests));
  lines.push("");
  lines.push("Schema dependencies:");
  lines.push("");
  lines.push(list(query.implementationContract?.schemaDependencies));
  lines.push("");

  lines.push(`## ${section("Outline", "Структура страницы", query)}`);
  lines.push("");
  lines.push(`- H1: ${sentenceCase(query.query)}`);
  lines.push("");
  lines.push(isRu(query) ? "Рабочая структура с задачей каждого блока:" : "Actionable outline with section jobs:");
  lines.push("");
  for (const item of actionableOutline) {
    lines.push(`### ${item.level}: ${item.heading}`);
    lines.push("");
    lines.push(`Цель блока: ${item.goal}`);
    lines.push("");
    lines.push(isRu(query) ? "Что раскрыть:" : "What to cover:");
    lines.push("");
    lines.push(list(item.include));
    lines.push("");
    if (item.signals.length) {
      lines.push(isRu(query) ? "SERP-сигналы для этого блока:" : "SERP signals for this section:");
      lines.push("");
      lines.push(renderSignalBullets(item.signals, "-", 5));
      lines.push("");
    }
    if (item.sourceChecks.length) {
      lines.push(isRu(query) ? "Факты для проверки:" : "Facts to verify:");
      lines.push("");
      lines.push(list(item.sourceChecks));
      lines.push("");
    }
    lines.push(`${isRu(query) ? "Формат" : "Format"}: ${item.format}.`);
    lines.push("");
    lines.push(`${isRu(query) ? "Критерий приемки" : "Acceptance"}: ${item.acceptance}.`);
    lines.push("");
  }
  if (query.outline?.length) {
    lines.push(isRu(query) ? "Машинный черновик структуры, использованный как вход:" : "Machine draft outline used as input:");
    lines.push("");
    lines.push((query.outline || []).map(([level, text]) => `- ${level}: ${text}`).join("\n"));
  }
  lines.push("");

  lines.push(`## ${section("Editor Brief", "Редакторский бриф", query)}`);
  lines.push("");
  lines.push(isRu(query) ? "Задача автора:" : "Author task:");
  lines.push("");
  lines.push(
    list([
      isRu(query)
        ? `Написать страницу, которая помогает пользователю выполнить задачу по запросу "${query.query}", а не просто пересказывает тему.`
        : `Write a page that helps the user complete the task behind "${query.query}", not just describe the topic.`,
      isRu(query)
        ? "Каждый раздел должен отвечать на практический вопрос: что сделать, что проверить, где риск, когда остановиться."
        : "Each section must answer a practical question: what to do, what to verify, where the risk is, and when to stop.",
      query.sourcePlan?.required
        ? isRu(query)
          ? "Факты, которые могут измениться или повлиять на решение пользователя, писать только после проверки источников."
          : "Facts that can change or affect decisions must be written only after source verification."
        : null,
    ].filter(Boolean)),
  );
  lines.push("");
  lines.push(isRu(query) ? "Секционные инструкции:" : "Section instructions:");
  lines.push("");
  for (const item of actionableOutline) {
    lines.push(`- ${item.heading}: ${item.goal} ${isRu(query) ? "Обязательно раскрыть" : "Must cover"}: ${item.include.slice(0, 2).join("; ")}.`);
  }
  if (query.editorBrief?.length) {
    lines.push("");
    lines.push(isRu(query) ? "Общие правила стиля:" : "General style rules:");
    lines.push("");
    lines.push(list(query.editorBrief));
  }
  lines.push("");

  lines.push(`## ${section("Frontend Brief", "Бриф для разработки", query)}`);
  lines.push("");
  lines.push(isRu(query) ? "Задача разработки:" : "Development task:");
  lines.push("");
  lines.push(
    list([
      isRu(query)
        ? "Собрать страницу из видимых компонентов, которые соответствуют секциям outline; не прятать критические условия в FAQ или schema."
        : "Build the page from visible components that match the outline; do not hide critical conditions in FAQ or schema.",
      isRu(query)
        ? "Первый экран должен содержать answer/действие, навигацию по шагам и блок актуальности, если источник-sensitive."
        : "First screen should include answer/action, step navigation, and freshness block when source-sensitive.",
      isRu(query)
        ? "Каждый интерактивный компонент должен иметь label, empty/error/ready состояния и текстовый результат."
        : "Every interactive component needs labels, empty/error/ready states, and a text result.",
    ]),
  );
  lines.push("");
  lines.push(isRu(query) ? "Компоненты и UI-ожидания:" : "Components and UI expectations:");
  lines.push("");
  for (const item of actionableOutline) {
    lines.push(`- ${item.heading}: ${item.component.type}; ${item.format}; ${isRu(query) ? "видимость" : "visible"}: ${item.component.visible ? "yes" : "no"}; ${isRu(query) ? "первый экран" : "above fold"}: ${item.component.aboveTheFold ? "yes" : "no"}.`);
  }
  if (query.frontendBrief?.length) {
    lines.push("");
    lines.push(isRu(query) ? "Общие технические правила:" : "General technical rules:");
    lines.push("");
    lines.push(list(query.frontendBrief));
  }
  lines.push("");

  lines.push(`## ${section("Trust and Schema", "Доверие и structured data", query)}`);
  lines.push("");
  lines.push("Trust requirements:");
  lines.push("");
  lines.push(list(query.trustRequirements));
  lines.push("");
  lines.push("Schema guidance:");
  lines.push("");
  lines.push(list(query.schemaGuidance));
  lines.push("");

  lines.push(`## ${section("QA Checklist", "Чеклист качества", query)}`);
  lines.push("");
  lines.push(
    mdTable(
      ["Check", "Status"],
      (query.qualityScore?.checks || []).map((check) => [check.name, check.pass ? "pass" : "fail"]),
    ),
  );
  lines.push("");
  lines.push("Additional acceptance checks:");
  lines.push("");
  lines.push(
    list([
      "First screen must match the selected page decision.",
      "Structured data must describe only visible truthful content.",
      "Blocked or poor-extraction pages must not be used for detailed competitor gap claims.",
      cluster ? "Final page scope must follow the separate cluster artifact." : "Generate cluster:query before treating the brief as workflow-complete.",
      "No universal outline: the structure must match this query intent and page archetype.",
      query.sourcePlan?.required ? "Source-sensitive facts must be refreshed against official URLs before publication." : null,
    ].filter(Boolean)),
  );
  lines.push("");

  lines.push(`## ${section("Open Risks", "Открытые риски", query)}`);
  lines.push("");
  lines.push(
    list([
      query.blockedUrls?.length ? `${query.blockedUrls.length} SERP URLs are blocked/limited and excluded from detailed gap conclusions.` : null,
      query.serpFeatures?.limitations?.length ? "SERP feature inventory is provider-limited; do not invent direct answers, PAA, local pack, or widget presence." : null,
      !cluster ? "Cluster artifact is missing; Query Cluster section uses embedded fallback only." : null,
      query.sourcePlan?.required && !refresh ? "Source refresh has not been run for this queryId." : null,
      refresh?.status === "source_search_required" ? "Official-source verification is still unresolved." : null,
      review && !review.status?.startsWith("ready_for_publication_candidate") ? "Publication review did not mark this as a publication candidate." : null,
      query.sourcePlan?.reviewerRequired ? "Expert review may be required before publication or before claiming expert review/schema." : null,
    ].filter(Boolean), "No open risks were generated by the current analysis."),
  );
  lines.push("");

  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n")}\n`;
}

async function writeBrief(query, context, outPath) {
  const slug = slugify(query.query, query.queryId);
  const target = outPath || path.join(reportsDir, `query-${slug}-${context.date}.md`);
  const resolved = path.resolve(target);
  const root = path.resolve(rootDir);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Refusing to write outside workspace: ${resolved}`);
  }
  await fs.mkdir(path.dirname(resolved), { recursive: true });
  await fs.writeFile(resolved, renderBrief(query, context), "utf8");
  return resolved;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const analysisPath = args.analysis ? path.resolve(args.analysis) : fullAnalysisJsonPath;
  const analysis = JSON.parse(await fs.readFile(analysisPath, "utf8"));
  const sourceRefresh = await readJsonIfExists(args["source-refresh"] ? path.resolve(args["source-refresh"]) : sourceRefreshJsonPath, { queries: [] });
  const publicationReview = await readJsonIfExists(args["publication-review"] ? path.resolve(args["publication-review"]) : publicationReviewJsonPath, {
    queries: [],
  });
  const manifest = await readJsonIfExists(serpManifestPath, { items: {} });
  const date = args.date || new Date().toISOString().slice(0, 10);
  const id = args.id || args._[0];
  const queries = analysis.queries || [];
  if (!queries.length) throw new Error(`No queries found in ${rel(analysisPath)}`);

  let selected;
  if (args.all) {
    selected = queries;
  } else if (id) {
    selected = queries.filter((query) => query.queryId === id);
    if (!selected.length) throw new Error(`Query id not found in analysis: ${id}`);
  } else if (queries.length === 1) {
    selected = queries;
  } else {
    throw new Error(`Analysis has ${queries.length} queries. Pass --id <queryId> or --all.`);
  }

  const clustersById = new Map();
  for (const query of selected) {
    const clusterPath = path.join(clustersDir, `${query.queryId}-cluster.json`);
    const cluster = await readJsonIfExists(clusterPath, null);
    if (cluster) clustersById.set(query.queryId, cluster);
  }
  const context = { analysis, sourceRefresh, publicationReview, manifest, clustersById, date };

  const outputs = [];
  for (const query of selected) {
    const outPath = args.output && selected.length === 1 ? path.resolve(args.output) : null;
    outputs.push(await writeBrief(query, context, outPath));
  }

  console.log(
    JSON.stringify(
      {
        generated: outputs.map((file) => rel(file)),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
