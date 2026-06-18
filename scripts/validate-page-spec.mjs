import fs from "node:fs/promises";
import path from "node:path";

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

function add(checks, name, pass, evidence) {
  checks.push({ name, pass: Boolean(pass), evidence });
}

function countMatches(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

function hasAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function hasAll(text, patterns) {
  return patterns.every((pattern) => pattern.test(text));
}

const args = parseArgs(process.argv.slice(2));
const file = args.file || args._[0];
if (!file) {
  console.error("Usage: node scripts/validate-page-spec.mjs <page-spec.md>");
  process.exit(2);
}

const filePath = path.resolve(file);
const text = await fs.readFile(filePath, "utf8");
const checks = [];
const isSourceSensitive =
  /source refresh status:\s*`(?!not_run|not_required)[^`]+`/i.test(text) ||
  /source_verified|source_search_required|reviewer_required|pending_expert_review/i.test(text);
const isReviewerRequired = /reviewerRequired|Reviewer[^|\n]*yes|pending_expert_review|source_verified_reviewer_required|reviewer required/i.test(text);

add(checks, "file is substantial", text.length > 5000, `${text.length} chars`);
add(checks, "starts as page spec", /^#\s+Page Spec:/m.test(text), "Page Spec heading");
add(checks, "has explicit status", /Status:\s*`[^`]+`/i.test(text), "status present");
add(checks, "links source artifacts", /Source artifacts:\s*`[^`]+full-analysis-output\.json`/i.test(text), "analysis artifact linked");
add(checks, "has query passport", /##\s+(Query Passport|Паспорт запроса)/i.test(text), "query passport");
add(checks, "has production decision", /##\s+(Production Decision|Итоговое решение)/i.test(text), "production decision");
add(checks, "has SEO meta", /##\s+SEO Meta[\s\S]+Title:[\s\S]+Description:/i.test(text), "title + description");
add(checks, "has first screen contract", /##\s+(First Screen|Первый экран)[\s\S]+H1:/i.test(text), "first screen + H1");
add(checks, "has cluster coverage", /##\s+(Cluster And Coverage|Кластер и покрытие)[\s\S]+(Coverage requirements|Coverage|coverage|покрыт|требован)/i.test(text), "cluster coverage");
add(checks, "has component contract", /##\s+(Component Contract|Контракт компонентов)[\s\S]+\| Component \|/i.test(text), "component table");
add(checks, "has block specifications", /##\s+(Block Specifications|Спецификация блоков)[\s\S]+###\s+1\./i.test(text), "block specs");
add(checks, "block specs include content requirements", hasAny(text, [/What it must contain:/i, /Что должно быть внутри:/i]), "content requirements");
add(checks, "block specs include source gates", /Source gate:/i.test(text), "source gate");
add(checks, "block specs include acceptance", hasAny(text, [/Acceptance:/i, /Критерий приемки:/i]), "acceptance");
add(checks, "has enough component sections", countMatches(text, /^###\s+\d+\./gm) >= 4, `${countMatches(text, /^###\s+\d+\./gm)} component sections`);
add(checks, "has source and fact map", /##\s+(Source And Fact Map|Карта источников и фактов)[\s\S]+Source refresh status:/i.test(text), "source/fact map");
add(checks, "has publication review status", /Publication review status:\s*`[^`]+`/i.test(text), "publication review status");
add(checks, "has editorial rules", /##\s+(Editorial Rules|Редакционные правила)/i.test(text), "editorial rules");
add(checks, "has frontend rules", /##\s+(Frontend Rules|Frontend правила)/i.test(text), "frontend rules");
add(checks, "has structured data guardrails", /##\s+Structured Data[\s\S]+(Article|HowTo|schema|Structured data|видимое|visible)/i.test(text), "structured data");
add(checks, "has QA checklist", /##\s+QA Checklist[\s\S]+\| Check \|/i.test(text), "QA table");
add(checks, "has open risks", /##\s+(Open Risks|Открытые риски)/i.test(text), "open risks");
add(checks, "source-sensitive specs expose fact statuses", !isSourceSensitive || /`[^`]+`\s*\|\s*[^|\n]*\|\s*`(?:verified|verified_pending_reviewer|source_search_required|needs_refresh|not_checked)/i.test(text), "fact status rows");
add(checks, "source-sensitive specs expose verified sources or blocker", !isSourceSensitive || /(Verified sources|Проверенные источники)[\s\S]+(https?:\/\/|Source refresh не прошел|No verified source)/i.test(text), "verified sources or blocker");
add(
  checks,
  "reviewer boundary is visible when required",
  !isReviewerRequired || /(не заменяет|не является консультацией|expert review is required|qualified expert|профильную консультацию|экспертн)/i.test(text),
  "reviewer boundary",
);
add(
  checks,
  "no fake expert review claim",
  !/(проверено\s+(?:юристом|адвокатом|врачом|экспертом)|юридически\s+проверено|медицински\s+проверено|lawyer reviewed|attorney reviewed|doctor reviewed|expert reviewed)/i.test(text),
  "no unsupported review claim",
);
add(
  checks,
  "no guaranteed outcome",
  !/(гарантированн|гарантируем|суд\s+обязательно\s+удовлетворит|обязательно\s+выиграете|100%\s+результат|guaranteed outcome|guaranteed result)/i.test(text),
  "no guarantees",
);
add(
  checks,
  "not a thin analysis dump",
  hasAll(text, [/First Screen|Первый экран/i, /Component Contract|Контракт компонентов/i, /Block Specifications|Спецификация блоков/i, /QA Checklist/i]) &&
    countMatches(text, /^##\s+/gm) >= 10,
  `${countMatches(text, /^##\s+/gm)} H2 sections`,
);

const passed = checks.filter((check) => check.pass).length;
const result = {
  file,
  passed,
  total: checks.length,
  pass: passed === checks.length,
  checks,
};

console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exit(1);
