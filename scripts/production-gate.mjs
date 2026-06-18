import fs from "node:fs/promises";
import path from "node:path";
import {
  clustersDir,
  fullAnalysisJsonPath,
  goldenQueriesPath,
  offlineBenchmarkJsonPath,
  parserMatrixPath,
  parserReportPath,
  publicationReviewJsonPath,
  publicationReviewReportPath,
  productionGateReportPath,
  rel,
  reportsDir,
  rootDir,
  sourceRefreshJsonPath,
  sourceRefreshReportPath,
} from "./lib/paths.mjs";

const checks = [];

async function exists(relativePath) {
  try {
    await fs.access(path.join(rootDir, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(rootDir, relativePath), "utf8"));
}

async function readJsonFile(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

function add(name, pass, evidence) {
  checks.push({ name, pass: Boolean(pass), evidence });
}

async function readText(relativePath) {
  return fs.readFile(path.join(rootDir, relativePath), "utf8");
}

async function listFiles(dir, result = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await listFiles(full, result);
    else result.push(full);
  }
  return result;
}

async function hasSecretLeak() {
  const secretPatterns = [
    /(?:key=|XMLRIVER_KEY=)(?!your_xmlriver_api_key)([A-Za-z0-9_-]{32,})/i,
  ];
  const files = await listFiles(rootDir);
  for (const file of files) {
    const rel = path.relative(rootDir, file);
    if (rel.includes("package-lock.json") || rel.toLowerCase().endsWith(".zip")) continue;
    const text = await fs.readFile(file, "utf8").catch(() => "");
    for (const pattern of secretPatterns) {
      if (pattern.test(text)) return { leak: true, file: rel };
    }
  }
  return { leak: false, file: null };
}

async function main() {
  const packageJson = await readJson("package.json");
  const scripts = packageJson.scripts || {};
  add("package renamed from prototype", !/prototype/i.test(packageJson.name), packageJson.name);
  add("fetch:serp script exists", Boolean(scripts["fetch:serp"]), scripts["fetch:serp"]);
  add("analyze:query script exists", Boolean(scripts["analyze:query"]), scripts["analyze:query"]);
  add("source:refresh script exists", Boolean(scripts["source:refresh"]), scripts["source:refresh"]);
  add("publication:review script exists", Boolean(scripts["publication:review"]), scripts["publication:review"]);
  add("cluster:query script exists", Boolean(scripts["cluster:query"]), scripts["cluster:query"]);
  add("brief:query script exists", Boolean(scripts["brief:query"]), scripts["brief:query"]);
  add("page:spec script exists", Boolean(scripts["page:spec"]), scripts["page:spec"]);
  add("score:brief script exists", Boolean(scripts["score:brief"]), scripts["score:brief"]);
  add("benchmark:offline script exists", Boolean(scripts["benchmark:offline"]), scripts["benchmark:offline"]);
  add("package:skill script exists", Boolean(scripts["package:skill"]), scripts["package:skill"]);
  add("validate:skill script exists", Boolean(scripts["validate:skill"]), scripts["validate:skill"]);
  add("validate:page-spec script exists", Boolean(scripts["validate:page-spec"]), scripts["validate:page-spec"]);
  add("production:gate script exists", Boolean(scripts["production:gate"]), scripts["production:gate"]);
  add("test script exists", Boolean(scripts.test), scripts.test);

  add(".env.example exists", await exists(".env.example"), ".env.example");
  const envExample = (await exists(".env.example")) ? await readText(".env.example") : "";
  add(
    "env example uses placeholders only",
    /XMLRIVER_USER=your_xmlriver_user_id/.test(envExample) &&
      /XMLRIVER_KEY=your_xmlriver_api_key/.test(envExample),
    "XMLRiver placeholders present",
  );

  add("generic analysis engine exists", await exists("scripts/lib/analysis-engine.mjs"), "scripts/lib/analysis-engine.mjs");
  const analysisEngineText = await readText("scripts/lib/analysis-engine.mjs");
  const clusterGeneratorText = await readText("scripts/generate-query-cluster.mjs");
  add(
    "brief generation has no query-specific hardcoded profiles",
    !/function\s+isBmiQuery|profileSpecialization\([^)]*\)\s*{[\s\S]{0,600}(?:ИМТ|BMI|развод|divorce)|divorceChildrenSynthetic|bmiSynthetic/i.test(
      `${analysisEngineText}\n${clusterGeneratorText}`,
    ),
    "active brief/cluster generators use archetypes and SERP signals, not niche profiles",
  );
  add("central path map exists", await exists("scripts/lib/paths.mjs"), "scripts/lib/paths.mjs");
  add("XMLRiver fetcher exists", await exists("scripts/fetch-serp.mjs"), "scripts/fetch-serp.mjs");
  add("query cluster generator exists", await exists("scripts/generate-query-cluster.mjs"), "scripts/generate-query-cluster.mjs");
  add("query brief generator exists", await exists("scripts/generate-query-brief.mjs"), "scripts/generate-query-brief.mjs");
  add("page spec generator exists", await exists("scripts/generate-page-spec.mjs"), "scripts/generate-page-spec.mjs");
  add("GitHub installer exists", await exists("install.ps1"), "install.ps1");
  add("human project map exists", await exists("README.md"), "README.md");
  add("GitHub install docs exist", await exists("docs/GITHUB-INSTALL.md"), "docs/GITHUB-INSTALL.md");
  add("data directory exists", await exists("data"), "data/");
  add("reports directory exists", await exists("reports"), "reports/");
  add("docs directory exists", await exists("docs"), "docs/");
  add("skills directory exists", await exists("skills"), "skills/");

  const benchmark = await readJsonFile(offlineBenchmarkJsonPath);
  add("offline benchmark gate passed", benchmark.gatePass === true, `${benchmark.passed}/${benchmark.total}; distinct=${benchmark.distinctArchetypes}`);

  const matrix = await readJsonFile(parserMatrixPath);
  add("parsed matrix has pages", matrix.summary?.totalPages > 0, matrix.summary?.totalPages);
  add("parsed matrix has usable extraction", matrix.summary?.goodOrPartial / matrix.summary?.totalPages >= 0.65, `${matrix.summary?.goodOrPartial}/${matrix.summary?.totalPages}`);
  add("parsed matrix includes metadata", Boolean(matrix.metadata) && Object.keys(matrix.metadata).length > 0, Object.keys(matrix.metadata || {}).join(", "));

  const fullAnalysis = await readJsonFile(fullAnalysisJsonPath);
  const totalChecks = fullAnalysis.queries.reduce((sum, q) => sum + q.qualityScore.total, 0);
  const totalPassed = fullAnalysis.queries.reduce((sum, q) => sum + q.qualityScore.passed, 0);
  add("full analysis checks passed", totalPassed === totalChecks, `${totalPassed}/${totalChecks}`);
  add("full analysis uses generic profiles", fullAnalysis.queries.every((q) => q.profileSource?.startsWith("generic_")), fullAnalysis.queries.map((q) => `${q.queryId}:${q.profileSource}`).join(", "));
  add("full analysis has business viability", fullAnalysis.queries.every((q) => q.businessViabilityNote && q.buildOnlyIf?.length), "businessViabilityNote + buildOnlyIf");
  add("full analysis has entity maps", fullAnalysis.queries.every((q) => q.entityMap?.primaryEntity && q.entityMap?.attributes?.length), "primaryEntity + attributes");
  add("full analysis has meta suggestions", fullAnalysis.queries.every((q) => q.metaSuggestions?.selected?.title && q.metaSuggestions?.selected?.description), "selected title + description");
  add("full analysis has query clusters", fullAnalysis.queries.every((q) => q.queryCluster?.decision && q.queryCluster?.primaryQuery), "decision + primaryQuery");
  add("full analysis has source plans", fullAnalysis.queries.every((q) => q.sourcePlan && Array.isArray(q.sourcePlan.facts)), "sourcePlan + facts array");
  add("full analysis has implementation contracts", fullAnalysis.queries.every((q) => q.implementationContract?.components?.length && q.implementationContract?.acceptanceTests?.length), "components + acceptanceTests");
  add("full analysis has SERP feature layer", fullAnalysis.queries.every((q) => q.serpFeatures?.providerDataMode && q.serpFeatures?.zeroClickRisk), "providerDataMode + zeroClickRisk");

  const clusterFiles = [];
  for (const query of fullAnalysis.queries) {
    const clusterPath = path.join(clustersDir, `${query.queryId}-cluster.json`);
    if (await exists(rel(clusterPath))) {
      clusterFiles.push(clusterPath);
    }
  }
  add("query cluster artifacts exist", clusterFiles.length === fullAnalysis.queries.length, `${clusterFiles.length}/${fullAnalysis.queries.length}`);
  const clusters = [];
  for (const file of clusterFiles) {
    clusters.push(await readJsonFile(file));
  }
  add(
    "query clusters have evidence modes",
    clusters.length > 0 && clusters.every((cluster) => cluster.evidenceMode?.length && cluster.externalKeywordDataUsed === false),
    clusters.map((cluster) => `${cluster.queryId}:${cluster.evidenceMode?.join("+")}`).join(", "),
  );
  add(
    "query clusters have include/support/scope",
    clusters.length > 0 &&
      clusters.every(
        (cluster) =>
          cluster.includedQueries?.length &&
          cluster.supportingQueries?.length &&
          cluster.intentGroups?.length &&
          cluster.coverageRequirements?.length,
      ),
    clusters.map((cluster) => `${cluster.queryId}:include=${cluster.includedQueries?.length || 0},support=${cluster.supportingQueries?.length || 0}`).join(", "),
  );
  add(
    "query clusters are scored",
    clusters.length > 0 && clusters.every((cluster) => cluster.qualityScore?.passed === cluster.qualityScore?.total),
    clusters.map((cluster) => `${cluster.queryId}:${cluster.qualityScore?.passed}/${cluster.qualityScore?.total}`).join(", "),
  );
  add(
    "query clusters separate raw SERP evidence",
    clusters.length > 0 &&
      clusters.every(
        (cluster) =>
          Array.isArray(cluster.rawSerpSignals) &&
          [...(cluster.includedQueries || []), ...(cluster.supportingQueries || [])].every((item) => !/[|]|\.\.\.|©|™|®/.test(item.query)),
      ),
    clusters.map((cluster) => `${cluster.queryId}:raw=${cluster.rawSerpSignals?.length || 0}`).join(", "),
  );

  const sourceRefreshExists = await exists(rel(sourceRefreshJsonPath));
  add("source refresh output state", true, sourceRefreshExists ? rel(sourceRefreshJsonPath) : "not run for current analysis");
  add(
    "source refresh report state",
    true,
    (await exists(rel(sourceRefreshReportPath))) ? rel(sourceRefreshReportPath) : "not run for current analysis",
  );
  const sourceRefresh = sourceRefreshExists ? await readJsonFile(sourceRefreshJsonPath) : { queries: [] };
  const refreshById = new Map((sourceRefresh.queries || []).map((query) => [query.queryId, query]));
  const requiredSourceQueries = fullAnalysis.queries.filter((query) => query.sourcePlan?.required);
  const currentSourceRefreshes = requiredSourceQueries.map((query) => refreshById.get(query.queryId)).filter(Boolean);
  add(
    "source refresh output matches current source-sensitive queries when run",
    !sourceRefreshExists || currentSourceRefreshes.length === requiredSourceQueries.length,
    sourceRefreshExists ? `${currentSourceRefreshes.length}/${requiredSourceQueries.length}` : "not run",
  );
  const gatedRequiredQueries = requiredSourceQueries.filter((query) => {
    const refreshed = refreshById.get(query.queryId);
    return (
      ["source_verified", "source_verified_reviewer_required", "source_search_required"].includes(refreshed?.status) ||
      /blocked|needs_refresh|source/i.test(query.sourcePlan?.publicationStatus || "")
    );
  });
  add(
    "required source plans are gated",
    gatedRequiredQueries.length === requiredSourceQueries.length,
    `${gatedRequiredQueries.length}/${requiredSourceQueries.length}`,
  );
  add(
    "reviewer gate remains explicit",
    requiredSourceQueries.every((query) => {
      const refreshed = refreshById.get(query.queryId);
      if (!query.sourcePlan?.reviewerRequired) return true;
      return (
        (refreshed?.status === "source_verified_reviewer_required" && refreshed?.reviewerRequired === true) ||
        query.sourcePlan?.reviewerRequired === true
      );
    }),
    "health/YMYL source verification does not bypass reviewer requirement",
  );

  const publicationReviewExists = await exists(rel(publicationReviewJsonPath));
  add("publication review output state", true, publicationReviewExists ? rel(publicationReviewJsonPath) : "not run for current analysis");
  add(
    "publication review report state",
    true,
    (await exists(rel(publicationReviewReportPath))) ? rel(publicationReviewReportPath) : "not run for current analysis",
  );
  const publicationReview = publicationReviewExists ? await readJsonFile(publicationReviewJsonPath) : { queries: [] };
  const publicationById = new Map((publicationReview.queries || []).map((query) => [query.queryId, query]));
  const currentPublicationReviews = fullAnalysis.queries.map((query) => publicationById.get(query.queryId)).filter(Boolean);
  add(
    "publication review output matches current queries when run",
    !publicationReviewExists || currentPublicationReviews.length === fullAnalysis.queries.length,
    publicationReviewExists ? `${currentPublicationReviews.length}/${fullAnalysis.queries.length}` : "not run",
  );
  add(
    "publication review statuses are explicit when run",
    (!publicationReviewExists && currentPublicationReviews.length === 0) ||
      (currentPublicationReviews.length === fullAnalysis.queries.length &&
        currentPublicationReviews.every((review) => Boolean(review.status) && Array.isArray(review.checks))),
    currentPublicationReviews.length ? `${currentPublicationReviews.length}/${fullAnalysis.queries.length}` : "not run for current analysis",
  );
  add(
    "expert review claim remains gated",
    fullAnalysis.queries.every((query) => {
      const review = publicationById.get(query.queryId);
      if (!query.sourcePlan?.reviewerRequired) return true;
      return (
        review?.status === "ready_for_publication_candidate_without_medical_review_claim" ||
        review?.status === "ready_for_publication_candidate_pending_expert_review" ||
        query.schemaGuidance?.some((item) => /MedicalWebPage.*не добавлять|MedicalWebPage.*after/i.test(item)) ||
        query.sourcePlan?.reviewerRequired === true
      );
    }),
    "YMYL can verify sources but cannot claim expert review unless a real reviewer exists",
  );

  const reportFiles = await listFiles(reportsDir);
  const queryBriefFiles = reportFiles.filter((file) => /^query-.+\.md$/i.test(path.basename(file)));
  add("query production brief generated", queryBriefFiles.length > 0, queryBriefFiles.map((file) => rel(file)).join(", "));
  const queryBriefTexts = [];
  for (const file of queryBriefFiles) {
    queryBriefTexts.push({ file, text: await fs.readFile(file, "utf8") });
  }
  const currentQueryIds = new Set(fullAnalysis.queries.map((query) => query.queryId));
  const currentQueryBriefTexts = queryBriefTexts.filter((item) =>
    [...currentQueryIds].some((queryId) => item.text.includes(`Query ID: \`${queryId}\``)),
  );
  const briefHasSections = (briefText) =>
    /query passport|паспорт запроса/i.test(briefText) &&
    /executive production decision|итоговое решение по странице/i.test(briefText) &&
    /cluster evidence mode|cluster artifact|кластер запроса/i.test(briefText) &&
    /source refresh|проверка источников/i.test(briefText) &&
    /publication review|публикационная проверка/i.test(briefText) &&
    /implementation contract|контракт разработки/i.test(briefText) &&
    /qa checklist|чеклист качества/i.test(briefText);
  add(
    "current query briefs have production workflow sections",
    currentQueryBriefTexts.length === fullAnalysis.queries.length && currentQueryBriefTexts.every((item) => briefHasSections(item.text)),
    currentQueryBriefTexts.length ? currentQueryBriefTexts.map((item) => rel(item.file)).join(", ") : "no current query brief",
  );
  const briefIsActionable = (briefText) =>
    /Рабочая структура|Actionable outline/i.test(briefText) &&
    /Цель блока|What to cover|Что раскрыть/i.test(briefText) &&
    /Факты для проверки|Facts to verify|Source gate/i.test(briefText) &&
    /Критерий приемки|Acceptance/i.test(briefText) &&
    /Спецификация компонентов|Component specs/i.test(briefText) &&
    /Задача автора|Author task/i.test(briefText) &&
    /Задача разработки|Development task/i.test(briefText);
  add(
    "current query briefs have actionable synthesis layer",
    currentQueryBriefTexts.length === fullAnalysis.queries.length && currentQueryBriefTexts.every((item) => briefIsActionable(item.text)),
    currentQueryBriefTexts.length ? currentQueryBriefTexts.map((item) => rel(item.file)).join(", ") : "no current query brief",
  );

  const pageSpecFiles = reportFiles.filter((file) => /^page-spec-.+\.md$/i.test(path.basename(file)));
  const pageSpecTexts = [];
  for (const file of pageSpecFiles) {
    pageSpecTexts.push({ file, text: await fs.readFile(file, "utf8") });
  }
  const currentPageSpecTexts = pageSpecTexts.filter((item) =>
    [...currentQueryIds].some((queryId) => item.text.includes(queryId)),
  );
  const pageSpecIsActionable = (text) =>
    /Page Spec/i.test(text) &&
    /Status:\s*`[^`]+`/i.test(text) &&
    /Source artifacts:/i.test(text) &&
    /First Screen|Первый экран/i.test(text) &&
    /Cluster And Coverage|Кластер и покрытие/i.test(text) &&
    /Component Contract|Контракт компонентов/i.test(text) &&
    /Block Specifications|Спецификация блоков/i.test(text) &&
    /Source And Fact Map|Карта источников и фактов/i.test(text) &&
    /QA Checklist/i.test(text);
  add(
    "current page specs generated from workflow",
    currentPageSpecTexts.length === fullAnalysis.queries.length && currentPageSpecTexts.every((item) => pageSpecIsActionable(item.text)),
    currentPageSpecTexts.length ? currentPageSpecTexts.map((item) => rel(item.file)).join(", ") : "no current page spec",
  );

  const parserReport = await fs.readFile(parserReportPath, "utf8");
  add("parser report says production smoke gate", /production smoke gate/.test(parserReport), rel(parserReportPath));

  add("skill SKILL.md exists", await exists("skills/seo-query-brief/SKILL.md"), "skills/seo-query-brief/SKILL.md");
  add("skill references exist", await exists("skills/seo-query-brief/references/brief-rubric.md") && await exists("skills/seo-query-brief/references/workflow.md"), "skills/seo-query-brief/references");
  add("skill scoring script exists", await exists("skills/seo-query-brief/scripts/score-brief.mjs"), "skills/seo-query-brief/scripts/score-brief.mjs");
  add("golden queries stay in data", await exists("data/benchmark/golden-queries.json"), rel(goldenQueriesPath));
  add("portable skill package exists", await exists("dist/seo-query-brief-portable/skills/seo-query-brief/SKILL.md"), "dist/seo-query-brief-portable/skills/seo-query-brief/SKILL.md");
  add("portable package includes installer", await exists("dist/seo-query-brief-portable/install.ps1"), "dist/seo-query-brief-portable/install.ps1");
  add("portable package has install guide", await exists("dist/seo-query-brief-portable/INSTALL.md"), "dist/seo-query-brief-portable/INSTALL.md");
  add("portable package has optional CLI kit", await exists("dist/seo-query-brief-portable/optional-cli-kit/package-snippet.json"), "dist/seo-query-brief-portable/optional-cli-kit/package-snippet.json");
  add("portable CLI includes query cluster generator", await exists("dist/seo-query-brief-portable/optional-cli-kit/scripts/generate-query-cluster.mjs"), "dist/seo-query-brief-portable/optional-cli-kit/scripts/generate-query-cluster.mjs");
  add("portable CLI includes query brief generator", await exists("dist/seo-query-brief-portable/optional-cli-kit/scripts/generate-query-brief.mjs"), "dist/seo-query-brief-portable/optional-cli-kit/scripts/generate-query-brief.mjs");
  add("portable CLI includes page spec generator", await exists("dist/seo-query-brief-portable/optional-cli-kit/scripts/generate-page-spec.mjs"), "dist/seo-query-brief-portable/optional-cli-kit/scripts/generate-page-spec.mjs");
  add("portable CLI includes page spec validator", await exists("dist/seo-query-brief-portable/optional-cli-kit/scripts/validate-page-spec.mjs"), "dist/seo-query-brief-portable/optional-cli-kit/scripts/validate-page-spec.mjs");
  add("portable CLI documents source catalog", await exists("dist/seo-query-brief-portable/optional-cli-kit/data/source-catalog/README.md"), "dist/seo-query-brief-portable/optional-cli-kit/data/source-catalog/README.md");
  add("portable package excludes SERP cache", !(await exists("dist/seo-query-brief-portable/optional-cli-kit/data/serp-cache")), "no SERP cache in portable package");
  add("portable package excludes real env", !(await exists("dist/seo-query-brief-portable/optional-cli-kit/.env")), "no .env in portable package");

  const secret = await hasSecretLeak();
  add("no provided XMLRiver key leaked into files", !secret.leak, secret.leak ? secret.file : "no leak found");

  const passed = checks.filter((check) => check.pass).length;
  const lines = [];
  lines.push("# Production Gate Report");
  lines.push("");
  lines.push(`Date: ${new Date().toISOString()}`);
  lines.push("");
  lines.push(`Passed: ${passed}/${checks.length}`);
  lines.push("");
  lines.push("| Check | Status | Evidence |");
  lines.push("|---|---|---|");
  for (const check of checks) {
    lines.push(`| ${check.name.replace(/\|/g, "\\|")} | ${check.pass ? "pass" : "fail"} | ${String(check.evidence ?? "").replace(/\|/g, "\\|")} |`);
  }
  lines.push("");
  const report = lines.join("\n");
  await fs.mkdir(reportsDir, { recursive: true });
  await fs.writeFile(productionGateReportPath, report, "utf8");
  console.log(report);

  if (passed !== checks.length) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
