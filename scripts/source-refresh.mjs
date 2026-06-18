import fs from "node:fs/promises";
import path from "node:path";
import {
  fullAnalysisJsonPath,
  rel,
  reportsDir,
  sourceCatalogDir,
  sourceRefreshJsonPath,
  sourceRefreshReportPath,
} from "./lib/paths.mjs";

const FETCH_TIMEOUT_MS = 15000;

function charsetFromContentType(contentType) {
  const match = String(contentType || "").match(/charset=([^;\s]+)/i);
  return match ? match[1].trim().replace(/^["']|["']$/g, "") : null;
}

function charsetFromHtml(buffer) {
  const preview = new TextDecoder("windows-1251").decode(buffer.slice(0, 4096));
  const match =
    preview.match(/<meta[^>]+charset=["']?\s*([^"'\s/>]+)/i) ||
    preview.match(/<meta[^>]+content=["'][^"']*charset=([^"';\s]+)/i);
  return match ? match[1].trim() : null;
}

function decodeBody(buffer, contentType) {
  const charset = charsetFromContentType(contentType) || charsetFromHtml(buffer) || "utf-8";
  try {
    return new TextDecoder(charset).decode(buffer);
  } catch {
    return new TextDecoder("utf-8").decode(buffer);
  }
}

function normalizeText(text) {
  return String(text || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&sup2;/gi, " squared ")
    .replace(/\]\s*2\b/g, "] squared")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function firstDate(text) {
  const markedRuDate = text.match(/(?:опубликовано|обновлено|размещено|дата\s+публикации)[:\s]+(\d{2}\.\d{2}\.20\d{2})/i);
  if (markedRuDate) return markedRuDate[1];
  const markedEnDate = text.match(
    /(?:published|updated|last updated)[:\s]+((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4})/i,
  );
  if (markedEnDate) return markedEnDate[1];
  const monthDate = text.match(
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b/i,
  );
  if (monthDate) return monthDate[0];
  const ruNumericDate = text.match(/\b\d{2}\.\d{2}\.20\d{2}\b/);
  if (ruNumericDate) return ruNumericDate[0];
  const ruMonthDate = text.match(
    /\b\d{1,2}\s+(?:января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\s+20\d{2}\b/i,
  );
  if (ruMonthDate) return ruMonthDate[0];
  const isoDate = text.match(/\b20\d{2}-\d{2}-\d{2}\b/);
  return isoDate ? isoDate[0] : null;
}

function matchedTermGroups(text, groups) {
  return groups.map((group) => {
    const matched = group.find((term) => text.includes(term.toLowerCase()));
    return { group, matched: matched || null, pass: Boolean(matched) };
  });
}

async function readJsonIfExists(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return fallback;
    throw error;
  }
}

function factEntriesFromCatalog(catalog) {
  return catalog?.facts || catalog || {};
}

function catalogEntryFor(sourceCatalogs, queryId, factId) {
  const queryCatalog = factEntriesFromCatalog(sourceCatalogs.queryCatalogs.get(queryId));
  const defaultCatalog = factEntriesFromCatalog(sourceCatalogs.defaultCatalog);
  return queryCatalog[factId] || defaultCatalog[factId] || null;
}

function normalizeCatalogEntry(entry) {
  if (!entry) return null;
  return {
    minimumVerifiedSources: Math.max(1, Number(entry.minimumVerifiedSources || 1)),
    candidates: (entry.candidates || [])
      .filter((candidate) => candidate?.url && candidate?.termGroups?.length)
      .map((candidate) => ({
        ...candidate,
        termGroups: candidate.termGroups.map((group) => (Array.isArray(group) ? group : [group]).filter(Boolean)),
      })),
  };
}

async function loadSourceCatalogs(queryIds) {
  const defaultCatalogPath = path.join(sourceCatalogDir, "default.json");
  const defaultCatalog = await readJsonIfExists(defaultCatalogPath, {});
  const queryCatalogs = new Map();
  const loaded = [];

  if (Object.keys(factEntriesFromCatalog(defaultCatalog)).length) {
    loaded.push(rel(defaultCatalogPath));
  }

  for (const queryId of queryIds) {
    const catalogPath = path.join(sourceCatalogDir, `${queryId}.json`);
    const catalog = await readJsonIfExists(catalogPath, null);
    if (catalog) {
      queryCatalogs.set(queryId, catalog);
      loaded.push(rel(catalogPath));
    }
  }

  return { defaultCatalog, queryCatalogs, loaded };
}

async function fetchSource(url, cache) {
  if (cache.has(url)) return cache.get(url);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "seo-query-brief-source-refresh/1.0",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    const body = decodeBody(await response.arrayBuffer(), response.headers.get("content-type"));
    const text = normalizeText(body);
    const result = {
      ok: response.ok,
      status: response.status,
      finalUrl: response.url,
      sourceDate: firstDate(body),
      text,
      error: null,
    };
    cache.set(url, result);
    return result;
  } catch (error) {
    const result = {
      ok: false,
      status: null,
      finalUrl: url,
      sourceDate: null,
      text: "",
      error: error?.name === "AbortError" ? "fetch_timeout" : String(error?.message || error),
    };
    cache.set(url, result);
    return result;
  } finally {
    clearTimeout(timer);
  }
}

async function verifyFact(fact, query, sourceCatalogs, fetchCache) {
  const catalogEntry = normalizeCatalogEntry(catalogEntryFor(sourceCatalogs, query.queryId, fact.id));
  if (!catalogEntry) {
    return {
      ...fact,
      refreshStatus: "source_search_required",
      verifiedSources: [],
      checkedSources: [],
      notes: ["No official-source catalog entry exists for this fact id."],
    };
  }

  const checkedSources = [];
  const verifiedSources = [];

  for (const candidate of catalogEntry.candidates) {
    const fetched = await fetchSource(candidate.url, fetchCache);
    const groups = matchedTermGroups(fetched.text, candidate.termGroups);
    const matched = fetched.ok && groups.every((group) => group.pass);
    const sourceResult = {
      id: candidate.id,
      source: candidate.source,
      authorityType: candidate.authorityType,
      url: candidate.url,
      finalUrl: fetched.finalUrl,
      httpStatus: fetched.status,
      sourceDate: fetched.sourceDate,
      matched,
      matchedTerms: groups.filter((group) => group.pass).map((group) => group.matched),
      missingGroups: groups.filter((group) => !group.pass).map((group) => group.group),
      error: fetched.error,
    };
    checkedSources.push(sourceResult);
    if (matched) verifiedSources.push(sourceResult);
  }

  const verified = verifiedSources.length >= catalogEntry.minimumVerifiedSources;
  const reviewerRequired = Boolean(fact.reviewerRequired);
  return {
    ...fact,
    status: verified ? "verified" : "needs_refresh",
    refreshStatus: verified ? (reviewerRequired ? "verified_pending_reviewer" : "verified") : "source_search_required",
    lastChecked: new Date().toISOString(),
    minimumVerifiedSources: catalogEntry.minimumVerifiedSources,
    verifiedSources,
    checkedSources,
    notes: verified
      ? ["Official source terms matched. Use checked source URLs and dates in the final page spec."]
      : ["Official sources were checked, but the required claim terms did not match enough sources."],
  };
}

async function refreshQuery(query, sourceCatalogs, fetchCache) {
  const sourcePlan = query.sourcePlan || { required: false, facts: [] };
  if (!sourcePlan.required) {
    return {
      queryId: query.queryId,
      query: query.query,
      required: false,
      status: "not_required",
      reviewerRequired: false,
      verifiedFacts: 0,
      totalFacts: 0,
      facts: [],
    };
  }

  const facts = [];
  for (const fact of sourcePlan.facts || []) {
    facts.push(await verifyFact(fact, query, sourceCatalogs, fetchCache));
  }

  const requiredFacts = facts.filter((fact) => fact.requiredForPublication !== false);
  const allVerified = requiredFacts.length > 0 && requiredFacts.every((fact) => fact.status === "verified");
  const reviewerRequired = Boolean(sourcePlan.reviewerRequired || facts.some((fact) => fact.reviewerRequired));
  const status = allVerified
    ? reviewerRequired
      ? "source_verified_reviewer_required"
      : "source_verified"
    : "source_search_required";

  return {
    queryId: query.queryId,
    query: query.query,
    required: true,
    status,
    riskLevel: sourcePlan.riskLevel,
    reviewerRequired,
    verifiedFacts: requiredFacts.filter((fact) => fact.status === "verified").length,
    totalFacts: requiredFacts.length,
    facts,
  };
}

function renderReport(result) {
  const lines = [];
  lines.push("# Source Refresh Report");
  lines.push("");
  lines.push(`Date: ${result.generatedAt}`);
  lines.push("");
  lines.push(`Source analysis: \`${result.sourceAnalysis}\``);
  lines.push(`Source catalogs: ${result.sourceCatalogs.length ? result.sourceCatalogs.map((item) => `\`${item}\``).join(", ") : "`none`"}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("| Query | Required | Status | Facts | Reviewer |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const query of result.queries) {
    lines.push(
      `| ${query.queryId} | ${query.required ? "yes" : "no"} | \`${query.status}\` | ${query.verifiedFacts}/${query.totalFacts} | ${query.reviewerRequired ? "yes" : "no"} |`,
    );
  }
  lines.push("");

  for (const query of result.queries) {
    lines.push(`## ${query.queryId}. ${query.query}`);
    lines.push("");
    lines.push(`Status: \`${query.status}\``);
    lines.push("");
    if (!query.required) {
      lines.push("Source refresh is not required for this query.");
      lines.push("");
      continue;
    }

    lines.push("| Fact | Claim status | Verified sources | Reviewer | Notes |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const fact of query.facts) {
      const sources = fact.verifiedSources.map((source) => `${source.source}: ${source.url}`).join("<br>") || "-";
      lines.push(
        `| \`${fact.id}\` | \`${fact.refreshStatus}\` | ${sources} | ${fact.reviewerRequired ? "yes" : "no"} | ${fact.notes.join(" ")} |`,
      );
    }
    lines.push("");

    lines.push("### Checked Sources");
    lines.push("");
    lines.push("| Fact | Source | HTTP | Matched | Source date | URL |");
    lines.push("| --- | --- | ---: | --- | --- | --- |");
    for (const fact of query.facts) {
      for (const source of fact.checkedSources) {
        lines.push(
          `| \`${fact.id}\` | ${source.source} | ${source.httpStatus ?? "-"} | ${source.matched ? "yes" : "no"} | ${source.sourceDate || "-"} | ${source.url} |`,
        );
      }
    }
    lines.push("");
  }

  lines.push("## Publication Rule");
  lines.push("");
  lines.push("- `source_verified` means required facts have official-source matches.");
  lines.push("- `source_verified_reviewer_required` means source refresh is complete, but publication still needs expert review.");
  lines.push("- `source_search_required` means the final page spec must not be treated as publication-ready.");
  lines.push("");
  return lines.join("\n");
}

async function main() {
  const analysis = JSON.parse(await fs.readFile(fullAnalysisJsonPath, "utf8"));
  const queryIds = (analysis.queries || []).map((query) => query.queryId);
  const sourceCatalogs = await loadSourceCatalogs(queryIds);
  const fetchCache = new Map();
  const queries = [];
  for (const query of analysis.queries || []) {
    queries.push(await refreshQuery(query, sourceCatalogs, fetchCache));
  }

  const result = {
    generatedAt: new Date().toISOString(),
    sourceAnalysis: rel(fullAnalysisJsonPath),
    sourceCatalogs: sourceCatalogs.loaded,
    queries,
  };

  await fs.mkdir(path.dirname(sourceRefreshJsonPath), { recursive: true });
  await fs.mkdir(reportsDir, { recursive: true });
  await fs.writeFile(sourceRefreshJsonPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  const report = renderReport(result);
  await fs.writeFile(sourceRefreshReportPath, report, "utf8");
  console.log(report);

  const failedRequired = queries.filter((query) => query.required && query.status === "source_search_required");
  if (failedRequired.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
