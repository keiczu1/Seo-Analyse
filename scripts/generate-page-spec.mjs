import fs from "node:fs/promises";
import path from "node:path";
import {
  clustersDir,
  fullAnalysisJsonPath,
  publicationReviewJsonPath,
  rel,
  reportsDir,
  rootDir,
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
  const safe = (value) => String(value ?? "-").replace(/\|/g, "\\|").replace(/\n/g, " ");
  return [
    `| ${headers.map(safe).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(safe).join(" | ")} |`),
  ].join("\n");
}

function list(items, fallback = "No items.") {
  const values = (items || []).filter((item) => item !== undefined && item !== null && String(item).trim() !== "");
  return values.length ? values.map((item) => `- ${item}`).join("\n") : `- ${fallback}`;
}

function sentenceCase(value) {
  const text = String(value || "").trim();
  return text ? `${text[0].toLocaleUpperCase()}${text.slice(1)}` : "";
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
  return slug || fallback || "query";
}

function isRu(query) {
  return String(query.locale || "").toLowerCase().startsWith("ru") || /[а-яё]/i.test(query.query || "");
}

function t(query, ru, en) {
  return isRu(query) ? ru : en;
}

function moduleGuidance(query, component) {
  const id = component.id;
  const ru = {
    quick_answer: {
      cover: [
        "Ответить на основной запрос в первом экране без общего вступления.",
        "Дать главную развилку сценариев и следующий шаг.",
        "Указать, какие утверждения нельзя делать без обновленных источников.",
      ],
      acceptance: "Пользователь понимает, что делать дальше, до прокрутки страницы.",
    },
    step_by_step: {
      cover: [
        "Разложить задачу на действия в естественном порядке.",
        "Указать входные условия, результат каждого шага и точки, где сценарий меняется.",
        "Не обещать результат, который зависит от внешнего решения, суда, врача, рынка или сервиса.",
      ],
      acceptance: "Последовательность можно выполнить как рабочую инструкцию, а не читать как лекцию.",
    },
    requirements: {
      cover: [
        "Показать обязательные условия применимости инструкции.",
        "Отделить жесткие требования от полезных рекомендаций.",
        "Вынести исключения и спорные случаи из FAQ в видимый блок.",
      ],
      acceptance: "Читатель понимает, подходит ли ему основной сценарий.",
    },
    documents_or_tools: {
      cover: [
        "Собрать документы, поля, входные данные или материалы в отдельный рабочий блок.",
        "Разделить обязательные и зависящие от сценария пункты.",
        "Для интерактива описать поля, пустое состояние, ошибки, результат и ограничения.",
      ],
      acceptance: "Пользователь видит, чего ему не хватает для выполнения задачи.",
    },
    risks: {
      cover: [
        "Назвать типовые ошибки и последствия неправильного действия.",
        "Показать, что проверить перед действием.",
        "Добавить точки остановки, когда нужен источник, эксперт или другой маршрут.",
      ],
      acceptance: "Страница предотвращает очевидные неправильные действия.",
    },
    when_to_get_help: {
      cover: [
        "Поставить границу самостоятельного сценария.",
        "Назвать триггеры, где нужен специалист или официальный источник.",
        "Не создавать впечатление персональной консультации.",
      ],
      acceptance: "Пользователь понимает, когда не стоит действовать только по странице.",
    },
    last_updated: {
      cover: [
        "Показать дату проверки источников и список реально использованных источников.",
        "Связать важные утверждения с source refresh fact ids.",
        "Отдельно показать, что осталось на ручную или экспертную проверку.",
      ],
      acceptance: "Критичные утверждения можно сопоставить с источником и датой проверки.",
    },
  };
  const en = {
    quick_answer: {
      cover: ["Answer the primary query above the fold.", "Show the main scenario branch and next step.", "Mark claims that need refreshed sources."],
      acceptance: "The user knows the next action before scrolling.",
    },
    step_by_step: {
      cover: ["Turn the task into ordered actions.", "Show entry conditions, step output, and decision points.", "Avoid guaranteed outcomes."],
      acceptance: "The sequence works as an instruction, not a lecture.",
    },
    requirements: {
      cover: ["Show required applicability conditions.", "Separate hard requirements from recommendations.", "Expose exceptions visibly."],
      acceptance: "The reader understands whether the main scenario applies.",
    },
    documents_or_tools: {
      cover: ["Collect inputs, documents, fields, or materials.", "Split required and scenario-dependent items.", "Define fields, states, results, and limits for interactive modules."],
      acceptance: "The user can see what is missing.",
    },
    risks: {
      cover: ["Name common mistakes and consequences.", "Show what to verify before acting.", "Add stop triggers."],
      acceptance: "The page prevents obvious wrong actions.",
    },
    when_to_get_help: {
      cover: ["Draw the self-serve boundary.", "Name expert or official-source triggers.", "Avoid a fake consultation impression."],
      acceptance: "The user knows when not to rely only on the page.",
    },
    last_updated: {
      cover: ["Show checked date and sources used.", "Map critical claims to fact ids.", "Show remaining manual-review needs."],
      acceptance: "Critical claims can be mapped to source and date.",
    },
  };
  const fallback = {
    cover: [component.purpose || t(query, "Раскрыть назначение блока через задачу пользователя.", "Cover the component purpose through the user task.")],
    acceptance: component.purpose || t(query, "Блок помогает выполнить задачу.", "The block helps complete the task."),
  };
  return (isRu(query) ? ru[id] : en[id]) || fallback;
}

function statusFor(query, refresh, review) {
  if (review?.status) return review.status;
  if (refresh?.status === "source_search_required") return "blocked_until_sources_refreshed";
  if (query.sourcePlan?.reviewerRequired) return "source_verified_reviewer_required";
  return "ready_for_editorial_build";
}

function renderComponentSpecs(query, refresh) {
  const facts = refresh?.facts || [];
  return (query.implementationContract?.components || []).flatMap((component, index) => {
    const guidance = moduleGuidance(query, component);
    const sourceChecks = facts
      .filter((fact) => ["quick_answer", "step_by_step", "requirements", "documents_or_tools", "risks", "last_updated"].includes(component.id))
      .map((fact) => `\`${fact.id}\`: \`${fact.refreshStatus || fact.status || "not_checked"}\``);
    return [
      `### ${index + 1}. ${component.label || component.id} (\`${component.id}\`)`,
      "",
      mdTable(
        [t(query, "Поле", "Field"), t(query, "Значение", "Value")],
        [
          [t(query, "Тип", "Type"), component.type],
          [t(query, "Обязательный", "Required"), component.required ? "yes" : "no"],
          [t(query, "Видимый", "Visible"), component.visible ? "yes" : "no"],
          [t(query, "Первый экран", "Above fold"), component.aboveTheFold ? "yes" : "no"],
          [t(query, "Назначение", "Purpose"), component.purpose || "-"],
        ],
      ),
      "",
      t(query, "Что должно быть внутри:", "What it must contain:"),
      "",
      list(guidance.cover),
      "",
      t(query, "Source gate:", "Source gate:"),
      "",
      list(sourceChecks, t(query, "Для блока нет отдельного source gate; соблюдать общий source plan.", "No separate source gate for this block; follow the general source plan.")),
      "",
      t(query, "Критерий приемки:", "Acceptance:"),
      "",
      `- ${guidance.acceptance}`,
      "",
    ];
  });
}

function renderSources(query, refresh) {
  const uniqueSources = new Map();
  for (const fact of refresh?.facts || []) {
    for (const source of fact.verifiedSources || []) {
      uniqueSources.set(source.url, source);
    }
  }
  const rows = [...uniqueSources.values()].map((source) => [
    source.source,
    source.authorityType,
    source.sourceDate || "-",
    source.url,
  ]);
  if (!rows.length) {
    return list(
      [
        t(
          query,
          "Источник не подтвержден в текущем source refresh. Перед публикацией добавить data/source-catalog/<queryId>.json и повторить source:refresh.",
          "No verified source in current source refresh. Add data/source-catalog/<queryId>.json and rerun source:refresh before publication.",
        ),
      ],
    );
  }
  return mdTable([t(query, "Источник", "Source"), "Authority", t(query, "Дата на странице", "Source date"), "URL"], rows);
}

function renderFactMap(query, refresh) {
  const rows = (refresh?.facts || []).map((fact) => [
    `\`${fact.id}\``,
    fact.claim,
    `\`${fact.refreshStatus || fact.status || "not_checked"}\``,
    `${fact.verifiedSources?.length || 0}/${fact.minimumVerifiedSources || 0}`,
    fact.reviewerRequired ? "yes" : "no",
  ]);
  if (!rows.length) return list([t(query, "Fact map отсутствует: source refresh не запускался или не нужен.", "Fact map is missing: source refresh was not run or is not required.")]);
  return mdTable(["Fact", "Claim", "Status", "Sources", "Reviewer"], rows);
}

function renderPageSpec(query, context) {
  const cluster = context.clustersById.get(query.queryId);
  const refresh = context.refreshById.get(query.queryId);
  const review = context.reviewById.get(query.queryId);
  const h1 = sentenceCase(query.query);
  const status = statusFor(query, refresh, review);
  const selectedMeta = query.metaSuggestions?.selected || {};
  const requiredModules = query.pageDecision?.requiredModules || query.implementationContract?.components?.map((component) => component.id) || [];
  const checkedDate = context.date;
  const lines = [];

  lines.push(`# Page Spec: ${h1}`);
  lines.push("");
  lines.push(`Spec date: ${checkedDate}`);
  lines.push("");
  lines.push(`Status: \`${status}\``);
  lines.push("");
  lines.push(
    `Source artifacts: \`${rel(context.analysisPath)}\`, \`${rel(sourceRefreshJsonPath)}\`, \`${rel(publicationReviewJsonPath)}\`${cluster ? `, \`${rel(path.join(clustersDir, `${query.queryId}-cluster.json`))}\`` : ""}`,
  );
  lines.push("");
  lines.push(
    t(
      query,
      "Важно: это универсально сгенерированное ТЗ на страницу. Оно не заменяет редакторскую, юридическую, медицинскую, финансовую или иную экспертную проверку, если такая проверка требуется source plan или publication review.",
      "Important: this is a universally generated page specification. It does not replace editorial, legal, medical, financial, or other expert review when required by the source plan or publication review.",
    ),
  );
  lines.push("");

  lines.push(`## ${t(query, "Паспорт запроса", "Query Passport")}`);
  lines.push("");
  lines.push(
    mdTable(
      [t(query, "Поле", "Field"), t(query, "Значение", "Value")],
      [
        ["Query ID", query.queryId],
        [t(query, "Основной запрос", "Primary query"), query.query],
        ["Locale", query.locale || "-"],
        [t(query, "Тип страницы", "Page type"), query.recommendedPageType || query.pageDecision?.pageType || "-"],
        [t(query, "Задача пользователя", "User task"), query.userTask || cluster?.canonicalIntent || "-"],
        [t(query, "Решение по кластеру", "Cluster decision"), cluster?.clusterDecision || query.queryCluster?.decision || "-"],
        [t(query, "Evidence mode", "Evidence mode"), cluster?.evidenceMode?.join(" + ") || query.serpFeatures?.providerDataMode || "-"],
      ],
    ),
  );
  lines.push("");

  lines.push(`## ${t(query, "Итоговое решение", "Production Decision")}`);
  lines.push("");
  lines.push(
    list([
      `${t(query, "Создать страницу типа", "Build page type")}: \`${query.pageDecision?.pageType || query.recommendedPageType || "-"}\`.`,
      `${t(query, "Первый экран", "First screen")}: ${query.pageDecision?.aboveTheFold || t(query, "ответ на задачу, навигация по шагам, дата/источники при source-sensitive теме", "answer, step navigation, date/sources for source-sensitive pages")}.`,
      `${t(query, "Обязательные модули", "Required modules")}: ${requiredModules.map((item) => `\`${item}\``).join(", ") || "-"}.`,
      `${t(query, "Не строить", "Do not build")}: ${(query.pageDecision?.doNotBuild || []).join("; ") || t(query, "универсальную статью без выполнения задачи", "a generic article that does not complete the task")}.`,
    ]),
  );
  lines.push("");

  lines.push(`## SEO Meta`);
  lines.push("");
  lines.push(`Title: ${selectedMeta.title || h1}`);
  lines.push("");
  lines.push(`Description: ${selectedMeta.description || "-"}`);
  lines.push("");
  lines.push(t(query, "Правила:", "Rules:"));
  lines.push("");
  lines.push(
    list([
      t(query, "Title и description должны обещать только то, что реально есть в первом экране и видимых блоках.", "Title and description must promise only what exists in visible sections."),
      t(query, "Не использовать список ключей вместо human-readable оффера страницы.", "Do not use a keyword list instead of a human-readable page offer."),
      query.sourcePlan?.required
        ? t(query, "В description можно упоминать актуальность только если source refresh действительно прошел.", "Mention freshness only when source refresh has actually passed.")
        : null,
    ]),
  );
  lines.push("");

  lines.push(`## ${t(query, "Первый экран", "First Screen")}`);
  lines.push("");
  lines.push(`H1:`);
  lines.push("");
  lines.push(`\`${h1}\``);
  lines.push("");
  lines.push(t(query, "Состав первого экрана:", "Above-fold composition:"));
  lines.push("");
  lines.push(
    list([
      t(query, "Короткий прямой ответ на основной запрос.", "Short direct answer to the primary query."),
      t(query, "Понятный следующий шаг или интерактивный рабочий блок, если он нужен по contract.", "Clear next step or interactive work block when required by the contract."),
      t(query, "Навигация к шагам, условиям, документам/входным данным, рискам и источникам.", "Navigation to steps, requirements, inputs/documents, risks, and sources."),
      query.sourcePlan?.required
        ? t(query, `Плашка доверия: источники проверены ${checkedDate}; материал не заменяет профильную консультацию.`, `Trust note: sources checked ${checkedDate}; the page does not replace qualified advice.`)
        : null,
    ]),
  );
  lines.push("");

  lines.push(`## ${t(query, "Кластер и покрытие", "Cluster And Coverage")}`);
  lines.push("");
  if (cluster) {
    lines.push(
      mdTable(
        ["Group", "Role", "Treatment", "Queries"],
        (cluster.intentGroups || []).map((group) => [
          group.label || group.id,
          group.role,
          group.pageTreatment,
          (group.queries || []).slice(0, 8).join("; "),
        ]),
      ),
    );
    lines.push("");
    lines.push(t(query, "Coverage requirements:", "Coverage requirements:"));
    lines.push("");
    lines.push(list((cluster.coverageRequirements || []).map((item) => item.requirement)));
  } else {
    lines.push(list([t(query, "Отдельный cluster artifact не найден. Запустить `cluster:query` перед финальным ТЗ.", "Separate cluster artifact is missing. Run `cluster:query` before final specification.")]));
  }
  lines.push("");

  lines.push(`## ${t(query, "Контракт компонентов", "Component Contract")}`);
  lines.push("");
  lines.push(
    mdTable(
      ["Component", "Label", "Type", "Required", "Visible", "Above fold", "Purpose"],
      (query.implementationContract?.components || []).map((component) => [
        `\`${component.id}\``,
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

  lines.push(`## ${t(query, "Спецификация блоков", "Block Specifications")}`);
  lines.push("");
  lines.push(...renderComponentSpecs(query, refresh));

  lines.push(`## ${t(query, "Карта источников и фактов", "Source And Fact Map")}`);
  lines.push("");
  lines.push(`Source refresh status: \`${refresh?.status || "not_run"}\``);
  lines.push("");
  lines.push(`Publication review status: \`${review?.status || "not_run"}\``);
  lines.push("");
  lines.push(renderFactMap(query, refresh));
  lines.push("");
  lines.push(t(query, "Проверенные источники:", "Verified sources:"));
  lines.push("");
  lines.push(renderSources(query, refresh));
  lines.push("");

  lines.push(`## ${t(query, "Редакционные правила", "Editorial Rules")}`);
  lines.push("");
  lines.push(list(query.editorBrief));
  lines.push("");
  lines.push(
    list([
      t(query, "Писать как рабочую страницу: что сделать, что проверить, где риск, когда остановиться.", "Write as a working page: what to do, what to verify, where the risk is, when to stop."),
      t(query, "Не прятать критичные ограничения в FAQ или schema.", "Do not hide critical limits in FAQ or schema."),
      t(query, "Не добавлять неподтвержденные суммы, сроки, медицинские/юридические/финансовые обещания.", "Do not add unverified prices, dates, medical/legal/financial promises."),
    ]),
  );
  lines.push("");

  lines.push(`## ${t(query, "Frontend правила", "Frontend Rules")}`);
  lines.push("");
  lines.push(list(query.frontendBrief));
  lines.push("");
  lines.push(list(query.implementationContract?.acceptanceTests));
  lines.push("");

  lines.push(`## Structured Data`);
  lines.push("");
  lines.push(list(query.schemaGuidance));
  lines.push("");
  lines.push(
    list([
      t(query, "`Article` допустим как базовый вариант для видимого редакционного материала.", "`Article` is acceptable for visible editorial content."),
      t(query, "`HowTo` допустим только если видимые шаги действительно есть на странице.", "`HowTo` is acceptable only when visible steps exist on the page."),
      t(query, "Не добавлять Review, Rating, claim об экспертной проверке, LegalService или MedicalWebPage без реального основания и видимого контента.", "Do not add Review, Rating, expert-review claims, LegalService, or MedicalWebPage without a real basis and visible content."),
    ]),
  );
  lines.push("");

  lines.push(`## QA Checklist`);
  lines.push("");
  lines.push(
    mdTable(
      ["Check", "Required"],
      [
        [t(query, "Page spec сгенерирован из анализа, кластера, source refresh и publication review.", "Page spec is generated from analysis, cluster, source refresh, and publication review."), "yes"],
        [t(query, "H1 соответствует primary query.", "H1 matches the primary query."), "yes"],
        [t(query, "Первый экран закрывает задачу пользователя.", "First screen satisfies the user task."), "yes"],
        [t(query, "Все required components видимы.", "All required components are visible."), "yes"],
        [t(query, "У каждого блока есть purpose, content requirements, source gate и acceptance.", "Each block has purpose, content requirements, source gate, and acceptance."), "yes"],
        [t(query, "Есть карта источников и fact statuses.", "Source map and fact statuses exist."), query.sourcePlan?.required ? "yes" : "if source-sensitive"],
        [t(query, "Нет неподтвержденного expert/reviewer claim.", "No unsupported expert/reviewer claim."), "yes"],
        [t(query, "Нет гарантии результата.", "No guaranteed outcome."), "yes"],
        [t(query, "Structured data описывает только видимое содержимое.", "Structured data describes visible content only."), "yes"],
      ],
    ),
  );
  lines.push("");

  lines.push(`## ${t(query, "Открытые риски", "Open Risks")}`);
  lines.push("");
  lines.push(
    list([
      refresh?.status === "source_search_required"
        ? t(query, "Source refresh не прошел: страницу нельзя считать publication candidate.", "Source refresh did not pass: do not treat the page as a publication candidate.")
        : null,
      query.sourcePlan?.reviewerRequired
        ? t(query, "Нужен экспертный просмотр перед финальной публикацией или перед claim об экспертной проверке.", "Expert review is required before final publication or any expert-review claim.")
        : null,
      query.blockedUrls?.length
        ? t(query, `${query.blockedUrls.length} SERP URL ограничены или заблокированы; не использовать их для детальных gap claims.`, `${query.blockedUrls.length} SERP URLs are blocked/limited; do not use them for detailed gap claims.`)
        : null,
      cluster?.externalKeywordDataUsed === false
        ? t(query, "Кластер не использует внешние keyword-volume данные; не трактовать его как частотный анализ.", "The cluster does not use external keyword-volume data; do not treat it as volume analysis.")
        : null,
    ], t(query, "Открытых рисков не зафиксировано текущим workflow.", "No open risks were generated by the current workflow.")),
  );
  lines.push("");

  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n")}\n`;
}

async function writePageSpec(query, context, outPath) {
  const slug = slugify(query.query, query.queryId);
  const target = outPath || path.join(reportsDir, `page-spec-${slug}-${context.date}.md`);
  const resolved = path.resolve(target);
  const root = path.resolve(rootDir);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Refusing to write outside workspace: ${resolved}`);
  }
  await fs.mkdir(path.dirname(resolved), { recursive: true });
  await fs.writeFile(resolved, renderPageSpec(query, context), "utf8");
  return resolved;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const analysisPath = args.analysis ? path.resolve(args.analysis) : fullAnalysisJsonPath;
  const analysis = JSON.parse(await fs.readFile(analysisPath, "utf8"));
  const sourceRefresh = await readJsonIfExists(args["source-refresh"] ? path.resolve(args["source-refresh"]) : sourceRefreshJsonPath, { queries: [] });
  const publicationReview = await readJsonIfExists(args["publication-review"] ? path.resolve(args["publication-review"]) : publicationReviewJsonPath, { queries: [] });
  const queries = analysis.queries || [];
  const id = args.id || args._[0];
  const date = args.date || new Date().toISOString().slice(0, 10);

  let selected;
  if (args.all) selected = queries;
  else if (id) selected = queries.filter((query) => query.queryId === id);
  else if (queries.length === 1) selected = queries;
  else throw new Error(`Analysis has ${queries.length} queries. Pass --id <queryId> or --all.`);

  if (!selected.length) throw new Error(`No matching query found${id ? ` for ${id}` : ""}.`);

  const clustersById = new Map();
  for (const query of selected) {
    const cluster = await readJsonIfExists(path.join(clustersDir, `${query.queryId}-cluster.json`), null);
    if (cluster) clustersById.set(query.queryId, cluster);
  }

  const context = {
    analysisPath,
    date,
    clustersById,
    refreshById: new Map((sourceRefresh.queries || []).map((query) => [query.queryId, query])),
    reviewById: new Map((publicationReview.queries || []).map((query) => [query.queryId, query])),
  };

  const outputs = [];
  for (const query of selected) {
    const outPath = args.output && selected.length === 1 ? path.resolve(args.output) : null;
    outputs.push(await writePageSpec(query, context, outPath));
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
