import fs from "node:fs/promises";
import path from "node:path";
import {
  clustersDir,
  fullAnalysisJsonPath,
  parserMatrixPath,
  rel,
  reportsDir,
  rootDir,
} from "./lib/paths.mjs";

const RU_STOPWORDS = new Set([
  "как",
  "что",
  "это",
  "для",
  "или",
  "при",
  "без",
  "если",
  "есть",
  "можно",
  "нужно",
  "через",
  "после",
  "перед",
  "свой",
  "свои",
  "ваш",
  "ваши",
  "где",
  "куда",
  "какие",
  "какой",
  "какая",
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

function uniq(items) {
  const seen = new Set();
  const result = [];
  for (const item of items || []) {
    const value = typeof item === "string" ? item.trim() : item;
    const key = typeof value === "string" ? value.toLowerCase() : JSON.stringify(value);
    if (!value || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

function mdTable(headers, rows) {
  const safe = (value) => String(value ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
  return [
    `| ${headers.map(safe).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(safe).join(" | ")} |`),
  ].join("\n");
}

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

function normalizeQuery(text) {
  return String(text || "")
    .replace(/[«»"“”]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalQueryKey(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[«»"“”'.,:;!?()[\]{}|/\\]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text, locale) {
  const stopwords = String(locale || "").toLowerCase().startsWith("ru") ? RU_STOPWORDS : EN_STOPWORDS;
  return uniq(
    String(text || "")
      .toLowerCase()
      .replace(/[^a-zа-яё0-9\s-]+/gi, " ")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3 && !stopwords.has(token)),
  );
}

function addCandidate(target, query, role, source, reason, evidence = []) {
  const value = normalizeQuery(query);
  if (!value) return;
  const key = canonicalQueryKey(value);
  if (
    target.some(
      (item) =>
        canonicalQueryKey(item.query) === key &&
        (item.role === role || item.role === "included" || role === "included"),
    )
  ) {
    return;
  }
  target.push({ query: value, role, source, reason, evidence });
}

function cleanHeading(text) {
  return normalizeQuery(
    String(text || "")
      .replace(/\s+\|\s+.+$/g, "")
      .replace(/\s+[-—–]\s+[^-—–|]{2,80}$/g, "")
      .replace(/\.\.\.+/g, "")
      .replace(/\s+[—–-]\s+.+$/g, "")
      .replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+/gu, "")
      .replace(/\s*\(\d+\)\s*$/g, ""),
  );
}

function rawSignal(target, text, source, reason, evidence = []) {
  const value = normalizeQuery(text);
  if (!value) return;
  const key = `${canonicalQueryKey(value)}:${source}:${reason}`;
  if (target.some((item) => `${canonicalQueryKey(item.text)}:${item.source}:${item.reason}` === key)) return;
  target.push({ text: value, source, reason, evidence });
}

function looksLikeQueryCandidate(value, query) {
  const cleaned = normalizeQuery(value);
  if (!cleaned || cleaned.length < 8 || cleaned.length > 90) return false;
  if (/[|]|\.\.\.|©|™|®/.test(cleaned)) return false;
  if (/отзывы|корзина|подпис|контакт|врачи|обработка|уведомление|меню|похожие|полезн|цены на услуги|пациенты|youtube|facebook|instagram/i.test(cleaned)) return false;
  const tokens = tokenize(cleaned, query.locale);
  if (tokens.length < 2) return false;
  const coreTerms = new Set([
    ...tokenize(query.query, query.locale),
    ...(query.entityMap?.synonyms || []).flatMap((item) => tokenize(item, query.locale)),
    ...(query.entityMap?.attributes || []).flatMap((item) => tokenize(item, query.locale)),
  ]);
  const overlap = tokens.filter((token) => coreTerms.has(token)).length;
  return overlap >= 2;
}

function topicLabel(topic, locale) {
  const ru = String(locale || "").toLowerCase().startsWith("ru");
  const labels = {
    inputs: ["поля ввода", "inputs"],
    result: ["результат", "result"],
    formula_method: ["формула и методика", "formula and method"],
    examples: ["пример расчета", "worked example"],
    limitations: ["ограничения", "limitations"],
    formula: ["формула", "formula"],
    categories: ["категории", "categories"],
    source_quality: ["источники и качество данных", "sources and data quality"],
    steps: ["шаги", "steps"],
    requirements: ["условия и требования", "requirements"],
    documents: ["документы", "documents"],
    risks: ["риски и ошибки", "risks and mistakes"],
    date: ["дата актуальности", "freshness date"],
  };
  const pair = labels[topic.id] || labels[topic.label];
  return pair ? pair[ru ? 0 : 1] : topic.label || topic.id;
}

function parsedCandidatesFromPages(pages, query, candidates, rawSerpSignals) {
  const coreTerms = new Set([
    ...tokenize(query.query, query.locale),
    ...(query.entityMap?.synonyms || []).flatMap((item) => tokenize(item, query.locale)),
    ...(query.entityMap?.attributes || []).flatMap((item) => tokenize(item, query.locale)),
  ]);
  const matchesCore = (value) => {
    const tokens = tokenize(value, query.locale);
    return tokens.some((token) => coreTerms.has(token));
  };
  for (const page of pages) {
    for (const value of [page.serpTitle, page.title, ...(page.h1 || [])]) {
      const cleaned = cleanHeading(value);
      if (!cleaned) continue;
      rawSignal(rawSerpSignals, cleaned, "parsed_serp_title_h1", `Observed in SERP/page #${page.position}`, [page.url]);
      if (!matchesCore(cleaned) || !looksLikeQueryCandidate(cleaned, query)) continue;
      addCandidate(candidates, cleaned, "supporting", "parsed_serp_normalized", `Normalized title/H1 candidate from page #${page.position}`, [page.url]);
    }
  }

  const topHeadings = new Map();
  for (const page of pages) {
    for (const heading of page.headings || []) {
      const cleaned = cleanHeading(heading.text);
      if (!cleaned || cleaned.length < 8 || cleaned.length > 90) continue;
      if (!matchesCore(cleaned)) continue;
      rawSignal(rawSerpSignals, cleaned, "parsed_serp_heading", `Observed heading on page #${page.position}`, [page.url]);
      if (!looksLikeQueryCandidate(cleaned, query)) continue;
      topHeadings.set(cleaned, (topHeadings.get(cleaned) || 0) + 1);
    }
  }
  for (const [heading, count] of [...topHeadings.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
    addCandidate(candidates, heading, "supporting", "parsed_serp_normalized", `Normalized heading candidate on ${count} usable page(s)`);
  }
}

function genericSynthetic(query, candidates) {
  const primary = query.query;

  addCandidate(candidates, primary, "included", "synthetic", "Primary seed query");
  for (const item of query.queryCluster?.includedQueries || []) {
    if (item !== primary && tokenize(item, query.locale).length < 2) continue;
    addCandidate(candidates, item, "included", "analysis_engine", "Included by base entity/archetype cluster");
  }

  for (const item of query.queryCluster?.excludedQueries || []) {
    if (/schema|невидим|универсальн|generic|seo-статья/i.test(item)) continue;
    addCandidate(candidates, item, "excluded", "analysis_engine", "Excluded by base entity/archetype scope");
  }
  for (const item of query.queryCluster?.splitCandidates || []) {
    addCandidate(candidates, item.query, "split", "analysis_engine", item.reason);
  }
}

function clusterDecision(query, candidates) {
  const splitCount = candidates.filter((item) => item.role === "split").length;
  const excludedCount = candidates.filter((item) => item.role === "excluded").length;
  if (query.recommendedPageType === "hub_or_disambiguation") return "hub_or_split";
  if (splitCount >= 3 || excludedCount >= 4) return "single_page_with_explicit_exclusions";
  return query.queryCluster?.decision || "single_page";
}

function buildIntentGroups(query, candidates) {
  const byRole = (role) => candidates.filter((item) => item.role === role).map((item) => item.query);
  return [
    {
      id: "core_intent",
      label: "Core page intent",
      role: "included",
      queries: byRole("included").slice(0, 12),
      pageTreatment: "target in title/H1/first screen and satisfy directly",
    },
    {
      id: "supporting_blocks",
      label: "Supporting blocks",
      role: "supporting",
      queries: byRole("supporting").slice(0, 18),
      pageTreatment: "cover as H2/H3, modules, examples, warnings, or FAQ only when visible",
    },
    {
      id: "separate_pages",
      label: "Separate page candidates",
      role: "split",
      queries: byRole("split").slice(0, 12),
      pageTreatment: "link or briefly qualify; do not let these intents dominate this page",
    },
    {
      id: "excluded_or_limited",
      label: "Excluded or limited intents",
      role: "excluded",
      queries: byRole("excluded").slice(0, 12),
      pageTreatment: "explicitly exclude, limit, or route elsewhere",
    },
  ].filter((group) => group.queries.length);
}

function buildEntityGroups(query) {
  const entityMap = query.entityMap || {};
  return [
    { id: "primary", label: "Primary entity", entities: [entityMap.primaryEntity].filter(Boolean) },
    { id: "synonyms", label: "Synonyms", entities: entityMap.synonyms || [] },
    { id: "attributes", label: "Attributes", entities: entityMap.attributes || [] },
    { id: "actions", label: "Actions", entities: entityMap.actions || [] },
    { id: "authority", label: "Authority entities", entities: entityMap.authorityEntities || [] },
    { id: "risk", label: "Risk entities", entities: entityMap.riskEntities || [] },
  ].filter((group) => group.entities.length);
}

function buildCoverageRequirements(query, candidates) {
  const lowTopics = (query.topicCoverage || [])
    .filter((topic) => !/^query_|^serp_/i.test(topic.id) && topic.coverageRatio <= 0.55)
    .map((topic) => ({
      id: `topic_${topic.id}`,
      requirement: `Cover ${topicLabel(topic, query.locale)} explicitly; parsed SERP coverage is ${topic.coverage}/${query.usableUrls}.`,
      source: "parsed_serp_topic_coverage",
      relatedQueries: candidates
        .filter((item) => item.role === "supporting" && item.query.toLowerCase().includes(String(topic.label || topic.id).toLowerCase()))
        .map((item) => item.query)
        .slice(0, 4),
    }));

  const moduleRequirements = (query.pageDecision?.requiredModules || []).slice(0, 16).map((module) => ({
    id: `module_${module}`,
    requirement: `Required visible module: ${module}.`,
    source: "page_decision",
    relatedQueries: candidates
      .filter((item) => item.reason?.includes(module))
      .map((item) => item.query)
      .slice(0, 4),
  }));

  return [...moduleRequirements, ...lowTopics];
}

function qualityChecks(cluster) {
  const normalizedItems = [...cluster.includedQueries, ...cluster.supportingQueries, ...cluster.excludedQueries, ...cluster.splitCandidates];
  const checks = [
    ["has_primary_query", Boolean(cluster.primaryQuery)],
    ["has_evidence_mode", cluster.evidenceMode.length > 0],
    ["has_included_queries", cluster.includedQueries.length > 0],
    ["has_supporting_queries", cluster.supportingQueries.length > 0],
    ["has_intent_groups", cluster.intentGroups.length > 0],
    ["has_entity_groups", cluster.entityGroups.length > 0],
    ["has_coverage_requirements", cluster.coverageRequirements.length > 0],
    ["source_labels_present", normalizedItems.every((item) => item.source)],
    ["normalized_queries_no_raw_serp_noise", normalizedItems.every((item) => !/[|]|\.\.\.|©|™|®/.test(item.query))],
  ];
  return {
    passed: checks.filter(([, pass]) => pass).length,
    total: checks.length,
    checks: checks.map(([name, pass]) => ({ name, pass })),
  };
}

function buildCluster(query, pages, context) {
  const candidates = [];
  genericSynthetic(query, candidates);
  const rawSerpSignals = [];
  parsedCandidatesFromPages(pages, query, candidates, rawSerpSignals);

  const evidenceMode = uniq([
    pages.length ? "parsed_serp_cluster" : null,
    "synthetic_cluster",
    query.serpFeatures?.providerDataMode ? "title_snippet_only" : null,
  ].filter(Boolean));
  const decision = clusterDecision(query, candidates);
  const includedQueries = candidates.filter((item) => item.role === "included");
  const supportingQueries = candidates.filter((item) => item.role === "supporting");
  const excludedQueries = candidates.filter((item) => item.role === "excluded");
  const splitCandidates = candidates.filter((item) => item.role === "split");
  const cluster = {
    generatedAt: new Date().toISOString(),
    queryId: query.queryId,
    query: query.query,
    locale: query.locale,
    primaryQuery: query.query,
    sourceAnalysis: rel(context.analysisPath),
    sourceParserMatrix: rel(context.parserMatrixPath),
    evidenceMode,
    clusterDecision: decision,
    canonicalIntent: query.queryCluster?.canonicalIntent || query.userTask,
    confidence: Number(
      Math.min(0.95, 0.55 + (query.usableRatio || 0) * 0.2 + Math.min(includedQueries.length, 8) * 0.015 + Math.min(supportingQueries.length, 12) * 0.01).toFixed(2),
    ),
    externalKeywordDataUsed: false,
    limitations: [
      "No external keyword-volume service was used.",
      "Synthetic queries are intent/entity candidates, not verified search-volume data.",
      query.serpFeatures?.limitations?.length ? "SERP feature inventory is provider-limited." : null,
    ].filter(Boolean),
    sourceSignals: {
      testedUrls: query.testedUrls,
      usableUrls: query.usableUrls,
      blockedOrLimitedUrls: query.blockedUrls?.length || 0,
      observedHeadings: query.observedHeadings || [],
      lowCoverageTopics: (query.topicCoverage || [])
        .filter((topic) => !/^query_|^serp_/i.test(topic.id) && topic.coverageRatio <= 0.55)
        .map((topic) => ({
          id: topic.id,
          label: topic.label,
          coverage: topic.coverage,
          coverageRatio: topic.coverageRatio,
        })),
      rawSerpSignals: rawSerpSignals.slice(0, 40),
    },
    includedQueries,
    supportingQueries,
    excludedQueries,
    splitCandidates,
    rawSerpSignals: rawSerpSignals.slice(0, 40),
    intentGroups: buildIntentGroups(query, candidates),
    entityGroups: buildEntityGroups(query),
    coverageRequirements: buildCoverageRequirements(query, candidates),
    rationale: [
      `Base page type is ${query.recommendedPageType}.`,
      pages.length
        ? `Cluster uses ${pages.length} usable parsed SERP page(s) plus synthetic intent/entity expansion.`
        : "Cluster uses synthetic intent/entity expansion because no usable parsed SERP pages were available.",
      decision === "single_page_with_explicit_exclusions"
        ? "Adjacent intents exist and should be excluded, limited, or split instead of being merged into the core page."
        : "Current evidence supports the selected cluster decision.",
    ],
  };
  cluster.qualityScore = qualityChecks(cluster);
  return cluster;
}

function renderCluster(cluster) {
  const lines = [];
  const title = isRu(cluster) ? "Query Cluster / Кластер запроса" : "Query Cluster";
  lines.push(`# ${title}: ${cluster.query}`);
  lines.push("");
  lines.push(`Date: ${cluster.generatedAt.slice(0, 10)}`);
  lines.push("");
  lines.push(`Query ID: \`${cluster.queryId}\``);
  lines.push("");
  lines.push(`Evidence mode: \`${cluster.evidenceMode.join(" + ")}\``);
  lines.push("");
  lines.push(`Cluster decision: \`${cluster.clusterDecision}\``);
  lines.push("");
  lines.push(`Canonical intent: ${cluster.canonicalIntent}`);
  lines.push("");
  lines.push(`External keyword data used: ${cluster.externalKeywordDataUsed ? "yes" : "no"}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(
    mdTable(
      ["Metric", "Value"],
      [
        ["Included queries", cluster.includedQueries.length],
        ["Supporting queries", cluster.supportingQueries.length],
        ["Excluded queries", cluster.excludedQueries.length],
        ["Split candidates", cluster.splitCandidates.length],
        ["Usable SERP pages", `${cluster.sourceSignals.usableUrls}/${cluster.sourceSignals.testedUrls}`],
        ["Quality checks", `${cluster.qualityScore.passed}/${cluster.qualityScore.total}`],
      ],
    ),
  );
  lines.push("");
  lines.push("## Included Queries");
  lines.push("");
  lines.push(mdTable(["Query", "Source", "Reason"], cluster.includedQueries.map((item) => [item.query, item.source, item.reason])));
  lines.push("");
  lines.push("## Supporting Queries");
  lines.push("");
  lines.push(mdTable(["Query", "Source", "Reason"], cluster.supportingQueries.slice(0, 40).map((item) => [item.query, item.source, item.reason])));
  lines.push("");
  lines.push("## Excluded Queries");
  lines.push("");
  lines.push(cluster.excludedQueries.length ? mdTable(["Query", "Source", "Reason"], cluster.excludedQueries.map((item) => [item.query, item.source, item.reason])) : "- None.");
  lines.push("");
  lines.push("## Split Candidates");
  lines.push("");
  lines.push(cluster.splitCandidates.length ? mdTable(["Query", "Source", "Reason"], cluster.splitCandidates.map((item) => [item.query, item.source, item.reason])) : "- None.");
  lines.push("");
  lines.push("## Intent Groups");
  lines.push("");
  lines.push(mdTable(["Group", "Role", "Treatment", "Queries"], cluster.intentGroups.map((group) => [group.label, group.role, group.pageTreatment, group.queries.join("; ")])));
  lines.push("");
  lines.push("## Entity Groups");
  lines.push("");
  lines.push(mdTable(["Group", "Entities"], cluster.entityGroups.map((group) => [group.label, group.entities.join("; ")])));
  lines.push("");
  lines.push("## Coverage Requirements");
  lines.push("");
  lines.push(
    mdTable(
      ["Requirement", "Source", "Related queries"],
      cluster.coverageRequirements.map((item) => [item.requirement, item.source, item.relatedQueries.join("; ") || "-"]),
    ),
  );
  lines.push("");
  lines.push("## Raw SERP Signals");
  lines.push("");
  lines.push(
    cluster.rawSerpSignals?.length
      ? mdTable(
          ["Text", "Source", "Reason"],
          cluster.rawSerpSignals.slice(0, 30).map((item) => [item.text, item.source, item.reason]),
        )
      : "- None.",
  );
  lines.push("");
  lines.push("## Limitations");
  lines.push("");
  for (const item of cluster.limitations) lines.push(`- ${item}`);
  lines.push("");
  lines.push("## Rationale");
  lines.push("");
  for (const item of cluster.rationale) lines.push(`- ${item}`);
  lines.push("");
  return lines.join("\n");
}

async function writeCluster(cluster, date) {
  const slug = slugify(cluster.query, cluster.queryId);
  const jsonPath = path.join(clustersDir, `${cluster.queryId}-cluster.json`);
  const reportPath = path.join(reportsDir, `cluster-${slug}-${date}.md`);
  for (const filePath of [jsonPath, reportPath]) {
    const resolved = path.resolve(filePath);
    const root = path.resolve(rootDir);
    if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
      throw new Error(`Refusing to write outside workspace: ${resolved}`);
    }
  }
  await fs.mkdir(clustersDir, { recursive: true });
  await fs.mkdir(reportsDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(cluster, null, 2)}\n`, "utf8");
  await fs.writeFile(reportPath, renderCluster(cluster), "utf8");
  return { jsonPath, reportPath };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const analysisPath = args.analysis ? path.resolve(args.analysis) : fullAnalysisJsonPath;
  const matrixPath = args.matrix ? path.resolve(args.matrix) : parserMatrixPath;
  const analysis = JSON.parse(await fs.readFile(analysisPath, "utf8"));
  const matrix = await readJsonIfExists(matrixPath, { results: [] });
  const id = args.id || args._[0];
  const date = args.date || new Date().toISOString().slice(0, 10);
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

  const outputs = [];
  for (const query of selected) {
    const pages = (matrix.results || []).filter(
      (page) => page.queryId === query.queryId && ["good", "partial"].includes(page.extractionQuality),
    );
    const cluster = buildCluster(query, pages, { analysisPath, parserMatrixPath: matrixPath });
    outputs.push(await writeCluster(cluster, date));
  }

  console.log(
    JSON.stringify(
      {
        generated: outputs.map((item) => ({
          json: rel(item.jsonPath),
          report: rel(item.reportPath),
        })),
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
