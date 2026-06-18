import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fullAnalysisReportPath, rel, rootDir, serpDir } from "./lib/paths.mjs";

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

function runNode(script, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd: rootDir,
      stdio: "inherit",
      shell: false,
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${script} exited with code ${code}`));
    });
  });
}

async function cacheExists(id) {
  try {
    await fs.access(path.join(serpDir, `${id}.xml`));
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const id = args.id || args._[0];
  if (!id && !args.query) {
    throw new Error("Usage: npm.cmd run analyze:query -- --id G01 OR --query \"...\" --locale ru-RU --id Q01");
  }
  const queryId = id || `Q${Date.now()}`;
  const fetchArgs = [];

  if (args.query) {
    fetchArgs.push("--id", queryId, "--query", args.query, "--locale", args.locale || "en-US");
  } else {
    fetchArgs.push(queryId);
  }
  if (args.force) fetchArgs.push("--force");
  for (const key of ["user", "key", "endpoint", "groupby", "domain", "device", "attempts", "stale-days"]) {
    if (args[key]) fetchArgs.push(`--${key}`, args[key]);
  }

  const hasCache = await cacheExists(queryId);
  if (args.fetch || args.query || !hasCache) {
    await runNode("scripts/fetch-serp.mjs", fetchArgs);
  } else {
    console.log(`[analyze-query] using existing SERP cache for ${queryId}`);
  }

  await runNode("scripts/hybrid-parser.mjs", [queryId]);
  await runNode("scripts/analyze-parsed-matrix.mjs", []);
  await runNode("scripts/generate-full-analysis.mjs", []);
  await runNode("scripts/generate-query-cluster.mjs", ["--id", queryId]);
  if (args["source-refresh"] || args["with-source-refresh"] || args["publication-review"] || args["with-publication-review"]) {
    await runNode("scripts/source-refresh.mjs", []);
  }
  if (args["publication-review"] || args["with-publication-review"]) {
    await runNode("scripts/publication-review.mjs", []);
  }
  await runNode("scripts/generate-query-brief.mjs", ["--id", queryId]);
  console.log(`[analyze-query] done: ${rel(fullAnalysisReportPath)}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
