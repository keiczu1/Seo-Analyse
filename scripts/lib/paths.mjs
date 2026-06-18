import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const rootDir = path.resolve(__dirname, "../..");

export const dataDir = path.join(rootDir, "data");
export const docsDir = path.join(rootDir, "docs");
export const reportsDir = path.join(rootDir, "reports");
export const skillsDir = path.join(rootDir, "skills");
export const distDir = path.join(rootDir, "dist");

export const serpDir = path.join(dataDir, "serp-cache");
export const serpErrorsDir = path.join(serpDir, "errors");
export const serpManifestPath = path.join(serpDir, "manifest.json");

export const parserOutputDir = path.join(dataDir, "parser-output");
export const parserPagesDir = path.join(parserOutputDir, "pages");
export const parserMatrixPath = path.join(parserOutputDir, "parsed-matrix.json");
export const parserMatrixReportPath = path.join(parserOutputDir, "parsed-matrix.md");

export const benchmarkDir = path.join(dataDir, "benchmark");
export const goldenQueriesPath = path.join(benchmarkDir, "golden-queries.json");
export const offlineBenchmarkJsonPath = path.join(benchmarkDir, "offline-benchmark-output.json");

export const analysisDataDir = path.join(dataDir, "analysis");
export const clustersDir = path.join(dataDir, "clusters");
export const sourceCatalogDir = path.join(dataDir, "source-catalog");
export const fullAnalysisJsonPath = path.join(analysisDataDir, "full-analysis-output.json");
export const sourceRefreshJsonPath = path.join(analysisDataDir, "source-refresh-output.json");
export const publicationReviewJsonPath = path.join(analysisDataDir, "publication-review-output.json");

export const offlineBenchmarkReportPath = path.join(reportsDir, "offline-benchmark-report.md");
export const parserReportPath = path.join(reportsDir, "parser-analysis-2026-06-04.md");
export const fullAnalysisReportPath = path.join(reportsDir, "full-analysis-2026-06-04.md");
export const sourceRefreshReportPath = path.join(reportsDir, "source-refresh-report.md");
export const publicationReviewReportPath = path.join(reportsDir, "publication-review-report.md");
export const productionGateReportPath = path.join(reportsDir, "production-gate-report.md");

export const seoQueryBriefSkillDir = path.join(skillsDir, "seo-query-brief");
export const portableSkillPackageDir = path.join(distDir, "seo-query-brief-portable");

export function rel(filePath) {
  return path.relative(rootDir, filePath).split(path.sep).join("/");
}
