import fs from "node:fs/promises";
import path from "node:path";
import {
  fullAnalysisJsonPath,
  publicationReviewJsonPath,
  publicationReviewReportPath,
  rel,
  reportsDir,
  sourceRefreshJsonPath,
} from "./lib/paths.mjs";

const FORBIDDEN_PUBLICATION_PATTERNS = [
  {
    pattern: /постав(?:ит|ляет|ить)\s+диагноз|диагностирует|\bdiagnoses\b|\bwill diagnose\b|\bdiagnose you\b/i,
    label: "diagnosis claim",
    domains: ["medical"],
  },
  {
    pattern: /назнач(?:ит|ает|ить)\s+лечени|подбер(?:ет|ёт|ает)\s+лечени|\bprescribes\b|\bwill prescribe\b|\brecommends treatment\b|\btreatment plan\b/i,
    label: "treatment recommendation",
    domains: ["medical"],
  },
  {
    pattern: /гарантирован|гарантируем|точно\s+получите|100%\s+результат|guaranteed|will win/i,
    label: "guarantee claim",
  },
  {
    pattern: /проверено\s+врач|medically reviewed/i,
    label: "medical review claim",
    domains: ["medical"],
  },
  {
    pattern: /проверено\s+юрист|проверено\s+адвокат|юридически\s+проверено|lawyer reviewed|attorney reviewed|legal review(?:ed)?/i,
    label: "legal review claim",
    domains: ["legal"],
  },
  {
    pattern: /суд\s+обязательно\s+удовлетворит|обязательно\s+выиграете|гарантия\s+решения\s+суда/i,
    label: "legal outcome promise",
    domains: ["legal"],
  },
];

function textFromQuery(query) {
  return [
    query.query,
    query.userTask,
    query.searchExpectation,
    query.metaSuggestions?.selected?.title,
    query.metaSuggestions?.selected?.description,
    ...(query.editorBrief || []),
    ...(query.frontendBrief || []),
    ...(query.trustRequirements || []),
    ...(query.schemaGuidance || []),
    ...(query.implementationContract?.acceptanceTests || []),
    ...(query.implementationContract?.schemaDependencies || []),
  ]
    .filter(Boolean)
    .join("\n");
}

function hasRequiredComponent(query, id) {
  return Boolean(query.implementationContract?.components?.some((component) => component.id === id && component.visible));
}

function detectRiskDomain(query) {
  const text = textFromQuery(query).toLowerCase();
  const risk = String(query.sourcePlan?.riskLevel || "").toLowerCase();
  if (/health|medical|ymyl_medical|симптом|болезн|диабет|имт|индекс[а]? массы тела|ожирен|диагноз|лечени|врач|здоров/.test(`${risk}\n${text}`)) {
    return "medical";
  }
  if (/развод|развест|расторж|алимент|иск|суд|подсудн|опек|родительск|брак|загс|юрид|адвокат|law|legal/.test(text)) {
    return "legal";
  }
  if (/ипотек|кредит|налог|банк|страх|инвест|финанс|стоимост|цена|price|fee|tax|loan|mortgage|bank/.test(text)) {
    return "financial";
  }
  if (query.sourcePlan?.required) return "sensitive";
  return "standard";
}

function findForbiddenClaims(query) {
  const text = textFromQuery(query);
  const domain = detectRiskDomain(query);
  return FORBIDDEN_PUBLICATION_PATTERNS.filter((item) => {
    const domains = item.domains || ["all"];
    return (domains.includes("all") || domains.includes(domain)) && item.pattern.test(text);
  }).map((item) => item.label);
}

function domainBoundaryPresent(query, domain) {
  const text = textFromQuery(query);
  if (domain === "standard") return true;
  if (domain === "medical") {
    return (
      hasRequiredComponent(query, "medical_disclaimer") ||
      /дисклеймер|not a substitute|не диагноз|не заменяет консультац|обратитесь к врачу|health care provider/i.test(text)
    );
  }
  if (domain === "legal") {
    return (
      hasRequiredComponent(query, "when_to_get_help") ||
      /когда нужен специалист|юрист|адвокат|не имитировать консультац|не заменяет консультац|границ[аы]|ограничен/i.test(text)
    );
  }
  if (domain === "financial") {
    return /не является финансовой рекомендац|не заменяет консультац|специалист|ограничен|риск|disclaimer|not financial advice/i.test(text);
  }
  return /не заменяет консультац|специалист|ограничен|риск|disclaimer|boundary/i.test(text);
}

function limitationsPresent(query, domain) {
  const text = textFromQuery(query);
  if (hasRequiredComponent(query, "risks") || hasRequiredComponent(query, "limitations_children_pregnancy_athletes")) return true;
  const generic = /ограничен|лимит|risk|риски?|исключен|ошибк|нельзя|когда нужен|специалист|review boundary|границ/i.test(text);
  if (domain === "medical") return generic || /children|pregnancy|athletes|детей|беремен|врач/i.test(text);
  if (domain === "legal") return generic || /спор|суд|юрист|адвокат|не имитировать консультац/i.test(text);
  return generic;
}

function schemaGuardrailsPresent(query, domain) {
  const schemaText = [
    ...(query.schemaGuidance || []),
    ...(query.implementationContract?.schemaDependencies || []),
  ].join("\n");
  if (!schemaText.trim()) return false;
  if (domain === "medical") {
    return /MedicalWebPage.*(не добавлять|after|после)|Article/i.test(schemaText);
  }
  if (domain === "legal") {
    return /HowTo.*(видим|visible)|Article/i.test(schemaText) && !/LegalService|Review|Rating/i.test(schemaText);
  }
  return !/Review|Rating|MedicalWebPage|LegalService/i.test(schemaText) || /только|only|видим|visible|после|after|Article|WebPage/i.test(schemaText);
}

function constraintsForDomain(domain) {
  const shared = [
    "Do not diagnose, prescribe treatment, guarantee legal/financial/medical outcomes, or overstate certainty.",
    "Publish sensitive pages only with checked sources, visible date, limitations, and disclaimer/boundary text where needed.",
  ];
  if (domain === "medical") {
    return [
      "Do not claim the page was medically reviewed unless a real qualified reviewer approves it.",
      "Do not add MedicalWebPage schema without real medical review and matching visible content.",
      ...shared,
    ];
  }
  if (domain === "legal") {
    return [
      "Do not claim the page was reviewed by a lawyer unless a real qualified reviewer approves it.",
      "Do not guarantee a court outcome or replace jurisdiction-specific legal advice.",
      "Use Article or visible-step HowTo schema only when it matches visible content.",
      ...shared,
    ];
  }
  if (domain === "financial") {
    return [
      "Do not claim financial review unless a real qualified reviewer approves it.",
      "Do not guarantee savings, approval, returns, prices, or tax outcomes.",
      ...shared,
    ];
  }
  return shared;
}

function readyStatus(domain, reviewerRequired) {
  if (!reviewerRequired) return "ready_for_publication_candidate";
  if (domain === "medical") return "ready_for_publication_candidate_without_medical_review_claim";
  return "ready_for_publication_candidate_pending_expert_review";
}

function reviewQuery(query, sourceRefresh) {
  const domain = detectRiskDomain(query);
  const forbiddenClaims = findForbiddenClaims(query);
  const sourceRequired = Boolean(query.sourcePlan?.required);
  const sourceStatus = sourceRefresh?.status || (sourceRequired ? "missing_source_refresh" : "not_required");
  const sourceVerified = !sourceRequired || ["source_verified", "source_verified_reviewer_required"].includes(sourceStatus);
  const requiredBlocks = query.sourcePlan?.requiredVisibleBlocks || [];
  const visibleBlockResults = requiredBlocks.map((block) => ({
    block,
    present:
      hasRequiredComponent(query, block) ||
      query.implementationContract?.components?.some((component) => String(component.id).includes(block)) ||
      query.trustRequirements?.some((item) => String(item).includes(block)),
  }));
  const visibleBlocksPass = visibleBlockResults.every((item) => item.present);
  const hasDomainBoundary = domainBoundaryPresent(query, domain);
  const hasLimitations = limitationsPresent(query, domain);
  const hasSchemaGuardrails = schemaGuardrailsPresent(query, domain);
  const noForbiddenClaims = forbiddenClaims.length === 0;
  const reviewerGatePreserved = !sourceRefresh?.reviewerRequired || hasDomainBoundary;

  const checks = [
    { name: "source_refresh_verified", pass: sourceVerified, evidence: sourceStatus },
    {
      name: "required_visible_blocks_present",
      pass: visibleBlocksPass,
      evidence: `${visibleBlockResults.filter((item) => item.present).length}/${visibleBlockResults.length}`,
    },
    { name: `${domain}_boundary_present`, pass: hasDomainBoundary, evidence: hasDomainBoundary ? "present" : "missing" },
    { name: "limitations_present", pass: hasLimitations, evidence: hasLimitations ? "present" : "missing" },
    { name: "no_forbidden_claims", pass: noForbiddenClaims, evidence: forbiddenClaims.join(", ") || "none" },
    {
      name: "reviewer_gate_preserved",
      pass: reviewerGatePreserved,
      evidence: sourceRefresh?.reviewerRequired ? "reviewer required; no fake review claim allowed" : "not required",
    },
    { name: "schema_guardrails_present", pass: hasSchemaGuardrails, evidence: hasSchemaGuardrails ? "present" : "missing" },
  ];

  const passed = checks.filter((check) => check.pass).length;
  const allPass = passed === checks.length;
  const status = allPass ? readyStatus(domain, sourceRefresh?.reviewerRequired) : "needs_revision_before_publication_candidate";

  return {
    queryId: query.queryId,
    query: query.query,
    riskDomain: domain,
    sourceStatus,
    status,
    checks,
    passed,
    total: checks.length,
    constraints: constraintsForDomain(domain),
  };
}

function renderReport(result) {
  const lines = [];
  lines.push("# Publication Review Report");
  lines.push("");
  lines.push(`Date: ${result.generatedAt}`);
  lines.push("");
  lines.push(`Full analysis: \`${result.fullAnalysis}\``);
  lines.push(`Source refresh: \`${result.sourceRefresh}\``);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("| Query | Domain | Status | Checks | Source status |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const query of result.queries) {
    lines.push(`| ${query.queryId} | ${query.riskDomain} | \`${query.status}\` | ${query.passed}/${query.total} | \`${query.sourceStatus}\` |`);
  }
  lines.push("");

  for (const query of result.queries) {
    lines.push(`## ${query.queryId}. ${query.query}`);
    lines.push("");
    lines.push(`Status: \`${query.status}\``);
    lines.push("");
    lines.push("| Check | Status | Evidence |");
    lines.push("| --- | --- | --- |");
    for (const check of query.checks) {
      lines.push(`| ${check.name} | ${check.pass ? "pass" : "fail"} | ${String(check.evidence).replace(/\|/g, "\\|")} |`);
    }
    lines.push("");
    lines.push("Constraints:");
    lines.push("");
    for (const item of query.constraints) {
      lines.push(`- ${item}`);
    }
    lines.push("");
  }

  lines.push("## Meaning");
  lines.push("");
  lines.push("- `ready_for_publication_candidate_without_medical_review_claim` means Codex can complete the evidence and safety review for an informational page, but the page must not claim human medical review.");
  lines.push("- `ready_for_publication_candidate_pending_expert_review` means official sources and automated guardrails passed, but the page still needs a qualified expert before final publication or expert-review claims.");
  lines.push("- A real human expert is required if the site wants to claim expert review, add specialized schema that requires it, or publish diagnostic/treatment/legal/financial recommendations.");
  lines.push("- Final built pages still need post-build QA against the generated page spec.");
  lines.push("");
  return lines.join("\n");
}

async function readJsonIfExists(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return fallback;
    throw error;
  }
}

async function main() {
  const analysis = await readJsonIfExists(fullAnalysisJsonPath, { queries: [] });
  const sourceRefresh = await readJsonIfExists(sourceRefreshJsonPath, { queries: [] });
  const sourceById = new Map((sourceRefresh.queries || []).map((query) => [query.queryId, query]));
  const queries = (analysis.queries || []).map((query) => reviewQuery(query, sourceById.get(query.queryId)));

  const result = {
    generatedAt: new Date().toISOString(),
    fullAnalysis: rel(fullAnalysisJsonPath),
    sourceRefresh: rel(sourceRefreshJsonPath),
    queries,
  };

  await fs.mkdir(path.dirname(publicationReviewJsonPath), { recursive: true });
  await fs.mkdir(reportsDir, { recursive: true });
  await fs.writeFile(publicationReviewJsonPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  const report = renderReport(result);
  await fs.writeFile(publicationReviewReportPath, report, "utf8");
  console.log(report);

  const failed = queries.filter((query) => !query.status.startsWith("ready_for_publication_candidate"));
  if (failed.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
