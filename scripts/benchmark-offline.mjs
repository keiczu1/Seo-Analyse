import fs from "node:fs/promises";
import path from "node:path";
import { buildProfile } from "./lib/analysis-engine.mjs";
import { goldenQueriesPath, offlineBenchmarkJsonPath, offlineBenchmarkReportPath } from "./lib/paths.mjs";

function mdTable(headers, rows) {
  const safe = (value) => String(value ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
  return [
    `| ${headers.map(safe).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(safe).join(" | ")} |`),
  ].join("\n");
}

function renderMarkdown(result) {
  const lines = [];
  lines.push("# Offline Benchmark Report");
  lines.push("");
  lines.push(`Date: ${result.generatedAt}`);
  lines.push("");
  lines.push(`Passed: ${result.passed}/${result.total}`);
  lines.push("");
  lines.push(
    mdTable(
      ["ID", "Query", "Expected", "Actual", "Status", "Profile"],
      result.items.map((item) => [
        item.id,
        item.query,
        item.expectedPageType,
        item.actualPageType,
        item.pass ? "pass" : "fail",
        item.profileSource,
      ]),
    ),
  );
  lines.push("");
  lines.push("Gate:");
  lines.push("- At least 11/12 query-only classifications must match the expected archetype.");
  lines.push("- The set must produce at least 7 distinct page archetypes.");
  lines.push("- No query may return a universal generic article template when a stronger archetype is expected.");
  lines.push("");
  return lines.join("\n");
}

async function main() {
  const benchmark = JSON.parse(await fs.readFile(goldenQueriesPath, "utf8"));
  const items = benchmark.queries.map((item) => {
    const profile = buildProfile(item.id, [], item);
    return {
      id: item.id,
      query: item.query,
      expectedPageType: item.expectedPageType,
      actualPageType: profile.archetype,
      profileSource: profile.profileSource,
      pass: profile.archetype === item.expectedPageType,
    };
  });
  const passed = items.filter((item) => item.pass).length;
  const distinctArchetypes = new Set(items.map((item) => item.actualPageType)).size;
  const gatePass = passed >= 11 && distinctArchetypes >= 7;
  const result = {
    generatedAt: new Date().toISOString(),
    total: items.length,
    passed,
    distinctArchetypes,
    gatePass,
    items,
  };
  await fs.mkdir(path.dirname(offlineBenchmarkJsonPath), { recursive: true });
  await fs.mkdir(path.dirname(offlineBenchmarkReportPath), { recursive: true });
  await fs.writeFile(offlineBenchmarkJsonPath, JSON.stringify(result, null, 2), "utf8");
  await fs.writeFile(offlineBenchmarkReportPath, renderMarkdown(result), "utf8");
  console.log(renderMarkdown(result));
  if (!gatePass) {
    console.error(`Offline benchmark failed: passed=${passed}/${items.length}, distinct=${distinctArchetypes}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
