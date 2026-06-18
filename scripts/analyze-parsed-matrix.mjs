import fs from "node:fs/promises";
import path from "node:path";
import { buildProfile } from "./lib/analysis-engine.mjs";
import { parserMatrixPath, parserReportPath, rel } from "./lib/paths.mjs";

function groupBy(items, keyFn) {
  const groups = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return groups;
}

function count(items, keyFn) {
  const result = {};
  for (const item of items) {
    const key = keyFn(item);
    result[key] = (result[key] || 0) + 1;
  }
  return result;
}

function tableRow(cells) {
  return `| ${cells.map((cell) => String(cell).replace(/\|/g, "\\|")).join(" | ")} |`;
}

function scoreQuery(queryId, items, metadata = {}) {
  const goodOrPartial = items.filter((item) => ["good", "partial"].includes(item.extractionQuality));
  const pageTypes = count(goodOrPartial, (item) => item.detectedPageType);
  const renderModes = count(items, (item) => item.renderMode);
  const quality = count(items, (item) => item.extractionQuality);
  const profile = buildProfile(queryId, goodOrPartial, metadata);
  const notes = [];
  if (items.some((item) => item.renderMode === "headless")) notes.push("Headless fallback was exercised.");
  if (items.some((item) => ["poor", "blocked"].includes(item.extractionQuality))) {
    notes.push("Some URLs remain unsuitable for detailed gap analysis.");
  }
  if (goodOrPartial.length / Math.max(1, items.length) < 0.65) {
    notes.push("Usable extraction ratio is below production threshold.");
  }
  return {
    queryId,
    query: profile.query,
    profileSource: profile.profileSource,
    pageType: profile.archetype,
    testedUrls: items.length,
    usableUrls: goodOrPartial.length,
    quality,
    renderModes,
    pageTypes,
    confidence: Number(
      Math.min(0.95, 0.55 + (goodOrPartial.length / Math.max(1, items.length)) * 0.25 + (profile.serpArchetypeConfidence || 0.5) * 0.15).toFixed(2),
    ),
    notes,
  };
}

function scoreImplementation(summary, analyses) {
  const criteria = [
    {
      name: "SERP XML ingestion",
      pass: summary.totalPages > 0,
      evidence: `${summary.totalPages} pages parsed from cached SERP`,
    },
    {
      name: "Fast HTML extraction",
      pass: (summary.byRenderMode.fast_html || 0) > 0,
      evidence: JSON.stringify(summary.byRenderMode),
    },
    {
      name: "Headless fallback available",
      pass: Object.keys(summary.byRenderMode || {}).some((mode) => mode.includes("headless")),
      evidence: JSON.stringify(summary.byRenderMode),
    },
    {
      name: "Extraction quality scoring",
      pass: Object.keys(summary.byQuality || {}).length > 0,
      evidence: JSON.stringify(summary.byQuality),
    },
    {
      name: "At least 65% usable extraction",
      pass: summary.goodOrPartial / summary.totalPages >= 0.65,
      evidence: `${summary.goodOrPartial}/${summary.totalPages}`,
    },
    {
      name: "Generic page decisions preserved",
      pass: new Set(analyses.map((item) => item.pageType)).size >= Math.min(3, analyses.length),
      evidence: analyses.map((item) => `${item.queryId}:${item.pageType}`).join(", "),
    },
  ];
  return {
    passed: criteria.filter((item) => item.pass).length,
    total: criteria.length,
    criteria,
  };
}

async function main() {
  const matrix = JSON.parse(await fs.readFile(parserMatrixPath, "utf8"));
  const groups = groupBy(matrix.results, (item) => item.queryId);
  const analyses = [...groups.entries()].map(([queryId, items]) =>
    scoreQuery(queryId, items, matrix.metadata?.[queryId] || {}),
  );
  const implementationScore = scoreImplementation(matrix.summary, analyses);

  const lines = [];
  lines.push("# Parsed SERP Re-Analysis");
  lines.push("");
  lines.push(`Date: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("## 1. Input");
  lines.push("");
  lines.push(`- Source: \`${rel(parserMatrixPath)}\``);
  lines.push("- Mode: fast HTML + headless fallback");
  lines.push(`- Scope: cached SERP files ${[...groups.keys()].join(", ")}`);
  lines.push("- Decision engine: generic query + SERP profile builder");
  lines.push("");
  lines.push("## 2. Parser Summary");
  lines.push("");
  lines.push(`- Total pages: ${matrix.summary.totalPages}`);
  lines.push(`- Good/partial extraction: ${matrix.summary.goodOrPartial}`);
  lines.push(`- Blocked/poor extraction: ${matrix.summary.blockedOrPoor}`);
  lines.push(`- Render modes: ${JSON.stringify(matrix.summary.byRenderMode)}`);
  lines.push(`- Extraction quality: ${JSON.stringify(matrix.summary.byQuality)}`);
  lines.push("");
  lines.push("## 3. Query Re-Analysis");
  lines.push("");
  lines.push(tableRow(["ID", "Query", "Usable URLs", "Decision", "Confidence", "Notes"]));
  lines.push(tableRow(["---", "---", "---:", "---", "---:", "---"]));
  for (const item of analyses) {
    lines.push(
      tableRow([
        item.queryId,
        item.query,
        `${item.usableUrls}/${item.testedUrls}`,
        item.pageType,
        item.confidence,
        item.notes.join("; ") || "-",
      ]),
    );
  }
  lines.push("");
  lines.push("## 4. Implementation Score");
  lines.push("");
  lines.push(`Passed: ${implementationScore.passed}/${implementationScore.total}`);
  lines.push("");
  lines.push(tableRow(["Criterion", "Status", "Evidence"]));
  lines.push(tableRow(["---", "---", "---"]));
  for (const item of implementationScore.criteria) {
    lines.push(tableRow([item.name, item.pass ? "pass" : "fail", item.evidence]));
  }
  lines.push("");
  lines.push("## 5. Result Assessment");
  lines.push("");
  if (implementationScore.passed === implementationScore.total) {
    lines.push("Status: parser and generic decision engine pass the production smoke gate.");
  } else {
    lines.push("Status: parser or generic decision engine needs revision before production use.");
  }
  lines.push("");
  lines.push("The parser marks blocked pages honestly and the decision layer can classify any query ID present in the matrix. Detailed gap analysis must still exclude poor or blocked pages.");
  lines.push("");

  await fs.mkdir(path.dirname(parserReportPath), { recursive: true });
  await fs.writeFile(parserReportPath, lines.join("\n"), "utf8");
  console.log(lines.join("\n"));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
