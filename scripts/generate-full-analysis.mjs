import fs from "node:fs/promises";
import path from "node:path";
import { analyzeMatrix, renderMarkdown } from "./lib/analysis-engine.mjs";
import {
  fullAnalysisJsonPath,
  fullAnalysisReportPath,
  goldenQueriesPath,
  parserMatrixPath,
  rel,
  serpManifestPath,
} from "./lib/paths.mjs";

async function readJsonIfExists(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return fallback;
    throw error;
  }
}

function metadataFromBenchmark(benchmark) {
  const result = {};
  for (const item of benchmark?.queries || []) {
    result[item.id] = {
      query: item.query,
      locale: item.locale,
      expectedPageType: item.expectedPageType,
      userTask: item.userTask,
    };
  }
  return result;
}

function metadataFromManifest(manifest) {
  const result = {};
  for (const [id, item] of Object.entries(manifest?.items || {})) {
    result[id] = {
      query: item.query,
      locale: item.locale,
      provider: item.provider,
      serpProviderStatus: item.serpProviderStatus,
      serpDataMode: item.serpDataMode,
    };
  }
  return result;
}

async function main() {
  const matrix = JSON.parse(await fs.readFile(parserMatrixPath, "utf8"));
  const benchmark = await readJsonIfExists(goldenQueriesPath, { queries: [] });
  const manifest = await readJsonIfExists(serpManifestPath, { items: {} });
  const metadataById = metadataFromBenchmark(benchmark);
  for (const [id, item] of Object.entries(metadataFromManifest(manifest))) {
    metadataById[id] = {
      ...(metadataById[id] || {}),
      ...Object.fromEntries(Object.entries(item).filter(([, value]) => value !== undefined && value !== "")),
    };
  }
  matrix.source = rel(parserMatrixPath);
  matrix.queryIds = matrix.queryIds || [...new Set((matrix.results || []).map((item) => item.queryId))];

  const analysis = analyzeMatrix(matrix, metadataById);
  const markdown = renderMarkdown(analysis);
  await fs.mkdir(path.dirname(fullAnalysisJsonPath), { recursive: true });
  await fs.mkdir(path.dirname(fullAnalysisReportPath), { recursive: true });
  await fs.writeFile(fullAnalysisJsonPath, JSON.stringify(analysis, null, 2), "utf8");
  await fs.writeFile(fullAnalysisReportPath, markdown, "utf8");
  console.log(markdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
