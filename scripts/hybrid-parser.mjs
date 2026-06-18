import fs from "node:fs/promises";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";
import * as cheerio from "cheerio";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { chromium } from "playwright";
import { VirtualConsole } from "jsdom";
import {
  goldenQueriesPath,
  parserMatrixPath,
  parserMatrixReportPath,
  parserPagesDir,
  serpDir,
  serpManifestPath,
} from "./lib/paths.mjs";

const MAX_PER_QUERY = Number(process.env.PARSER_MAX_PER_QUERY || "10");
const FETCH_TIMEOUT_MS = Number(process.env.PARSER_FETCH_TIMEOUT_MS || "20000");
const HEADLESS_TIMEOUT_MS = Number(process.env.PARSER_HEADLESS_TIMEOUT_MS || "25000");
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function textOf(value) {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return String(value).trim();
}

function normalizeText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function truncate(text, max = 5000) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

async function ensureDirs() {
  await fs.mkdir(parserPagesDir, { recursive: true });
}

async function readJsonIfExists(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return fallback;
    throw error;
  }
}

async function listCachedSerpIds() {
  const files = await fs.readdir(serpDir).catch(() => []);
  return files
    .filter((file) => file.toLowerCase().endsWith(".xml"))
    .map((file) => path.basename(file, ".xml"))
    .sort((a, b) => a.localeCompare(b));
}

async function loadQueryMetadata() {
  const manifest = await readJsonIfExists(serpManifestPath, { items: {} });
  const benchmark = await readJsonIfExists(goldenQueriesPath, { queries: [] });
  const metadata = {};
  for (const item of benchmark.queries || []) {
    metadata[item.id] = {
      query: item.query,
      locale: item.locale,
      expectedPageType: item.expectedPageType,
    };
  }
  for (const [id, item] of Object.entries(manifest.items || {})) {
    metadata[id] = {
      ...(metadata[id] || {}),
      query: item.query,
      locale: item.locale,
      provider: item.provider,
      serpProviderStatus: item.serpProviderStatus,
      serpDataMode: item.serpDataMode,
    };
  }
  return metadata;
}

async function readSerpFile(id, metadata = {}) {
  const file = path.join(serpDir, `${id}.xml`);
  const xml = await fs.readFile(file, "utf8");
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
  });
  const parsed = parser.parse(xml);
  const groups = asArray(
    parsed?.yandexsearch?.response?.results?.grouping?.group,
  );
  return groups
    .map((group, index) => {
      const doc = group?.doc;
      const passage = asArray(doc?.passages?.passage)
        .map(textOf)
        .filter(Boolean)
        .join(" ");
      return {
        queryId: id,
        query: metadata[id]?.query || "",
        locale: metadata[id]?.locale || "",
        serpProvider: metadata[id]?.provider || "xmlriver_google_cache",
        serpProviderStatus: metadata[id]?.serpProviderStatus || "cache",
        serpDataMode: metadata[id]?.serpDataMode || "title_snippet_only",
        position: index + 1,
        url: textOf(doc?.url),
        serpTitle: textOf(doc?.title),
        serpPassage: normalizeText(passage),
      };
    })
    .filter((item) => item.url);
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": USER_AGENT,
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "ru,en;q=0.9",
      },
    });
    const contentType = response.headers.get("content-type") || "";
    const html = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      finalUrl: response.url,
      contentType,
      html,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      finalUrl: url,
      contentType: "",
      html: "",
      error: error?.name === "AbortError" ? "fetch_timeout" : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function extractJsonLdTypes($) {
  const types = new Set();
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).text().trim();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      collectSchemaTypes(parsed, types);
    } catch {
      types.add("invalid_json_ld");
    }
  });
  return [...types].sort();
}

function collectSchemaTypes(value, types) {
  if (!value) return;
  if (Array.isArray(value)) {
    value.forEach((item) => collectSchemaTypes(item, types));
    return;
  }
  if (typeof value !== "object") return;
  if (value["@type"]) {
    asArray(value["@type"]).forEach((type) => types.add(String(type)));
  }
  if (value["@graph"]) collectSchemaTypes(value["@graph"], types);
  for (const key of ["mainEntity", "author", "publisher", "itemListElement"]) {
    if (value[key]) collectSchemaTypes(value[key], types);
  }
}

function extractWithCheerio(html, url) {
  const $ = cheerio.load(html);
  const schemaTypes = extractJsonLdTypes($);
  const hasJsonLd = $('script[type="application/ld+json"]').length > 0;
  $("script,style,noscript,svg").remove();

  const title = normalizeText($("title").first().text());
  const metaDescription = normalizeText(
    $('meta[name="description"]').attr("content") || "",
  );
  const canonical = $("link[rel='canonical']").attr("href") || "";
  const h1 = $("h1")
    .map((_, el) => normalizeText($(el).text()))
    .get()
    .filter(Boolean);
  const headings = $("h1,h2,h3,h4,h5,h6")
    .map((_, el) => ({
      level: el.tagName.toLowerCase(),
      text: normalizeText($(el).text()),
    }))
    .get()
    .filter((item) => item.text);

  const mainCandidates = ["main", "article", "[role='main']", ".content", "#content"];
  let mainText = "";
  for (const selector of mainCandidates) {
    const candidate = normalizeText($(selector).first().text());
    if (candidate.length > mainText.length) mainText = candidate;
  }
  const bodyText = normalizeText($("body").text());
  if (mainText.length < 500 && bodyText.length > mainText.length) {
    mainText = bodyText;
  }

  let readabilityText = "";
  let readabilityTitle = "";
  try {
    const virtualConsole = new VirtualConsole();
    virtualConsole.on("jsdomError", () => {});
    const dom = new JSDOM(html, { url, virtualConsole });
    const article = new Readability(dom.window.document).parse();
    if (article?.textContent) {
      readabilityText = normalizeText(article.textContent);
      readabilityTitle = normalizeText(article.title || "");
    }
  } catch {
    // Readability is best-effort. Cheerio extraction remains the fallback.
  }
  if (readabilityText.length > mainText.length) mainText = readabilityText;

  const tables = $("table")
    .map((_, el) => ({
      rows: $(el).find("tr").length,
      text: truncate(normalizeText($(el).text()), 600),
    }))
    .get()
    .filter((item) => item.text);
  const lists = $("ul,ol")
    .map((_, el) => ({
      tag: el.tagName.toLowerCase(),
      items: $(el).find("li").length,
      text: truncate(normalizeText($(el).text()), 500),
    }))
    .get()
    .filter((item) => item.items > 1 && item.text);
  const forms = $("form")
    .map((_, el) => ({
      inputs: $(el).find("input,select,textarea").length,
      buttons: $(el).find("button,input[type='submit']").length,
      text: truncate(normalizeText($(el).text()), 400),
    }))
    .get();
  const interactiveElements = {
    forms: $("form").length,
    inputs: $("input,select,textarea").length,
    buttons: $("button").length,
    details: $("details").length,
    iframes: $("iframe").length,
    canvas: $("canvas").length,
  };

  const lowerHtml = html.toLowerCase();
  const blockSignals = [];
  for (const marker of [
    "captcha",
    "access denied",
    "forbidden",
    "cloudflare",
    "enable javascript",
    "доступ ограничен",
    "проверка безопасности",
  ]) {
    if (lowerHtml.includes(marker)) blockSignals.push(marker);
  }

  return {
    title: readabilityTitle || title,
    metaDescription,
    canonical,
    h1,
    headings,
    mainText: truncate(mainText, 12000),
    mainTextLength: mainText.length,
    bodyTextLength: bodyText.length,
    tables,
    lists: lists.slice(0, 15),
    forms,
    interactiveElements,
    schemaTypes,
    hasMain: $("main,[role='main']").length > 0,
    hasArticle: $("article").length > 0,
    hasJsonLd,
    blockSignals,
  };
}

function scoreExtraction(fetchResult, extracted) {
  const reasons = [];
  let score = 0;

  if (fetchResult.status >= 200 && fetchResult.status < 300) score += 1;
  else reasons.push(`status_${fetchResult.status || "error"}`);

  if (fetchResult.html.length >= 5000) score += 1;
  else reasons.push("low_html_len");

  if (extracted.h1.length > 0) score += 1;
  else reasons.push("no_h1");

  if (extracted.mainTextLength >= 1500) score += 2;
  else if (extracted.mainTextLength >= 500) score += 1;
  else reasons.push("low_main_text");

  if (extracted.headings.length >= 3) score += 1;
  else reasons.push("few_headings");

  if (extracted.hasMain || extracted.hasArticle) score += 1;

  if (extracted.blockSignals.length > 0) reasons.push("block_signal");
  if (!fetchResult.ok && fetchResult.status >= 400) reasons.push("blocked_or_error");

  let quality = "poor";
  if (fetchResult.status === 401 || fetchResult.status === 403) quality = "blocked";
  else if (extracted.blockSignals.length > 0 && extracted.mainTextLength < 1000)
    quality = "blocked";
  else if (score >= 6) quality = "good";
  else if (score >= 4) quality = "partial";

  const headlessFallbackRequired =
    quality === "poor" ||
    quality === "blocked" ||
    reasons.includes("low_html_len") ||
    reasons.includes("low_main_text");

  return {
    score,
    quality,
    reasons: [...new Set(reasons)],
    headlessFallbackRequired,
  };
}

async function renderWithHeadless(browser, url) {
  const page = await browser.newPage({
    userAgent: USER_AGENT,
    viewport: { width: 1366, height: 900 },
    locale: "ru-RU",
  });
  try {
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: HEADLESS_TIMEOUT_MS,
    });
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1000);
    const html = await page.content();
    return {
      ok: response?.ok() ?? true,
      status: response?.status() ?? 0,
      finalUrl: page.url(),
      contentType: response?.headers()?.["content-type"] || "",
      html,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      finalUrl: url,
      contentType: "",
      html: "",
      error: String(error),
    };
  } finally {
    await page.close().catch(() => {});
  }
}

function detectPageType(extracted, serpTitle = "") {
  const text = `${serpTitle} ${extracted.title} ${extracted.h1.join(" ")}`.toLowerCase();
  if (/calculator|калькулятор|convert|converter|конвертер|курс|exchange/.test(text)) {
    return "tool_or_interactive";
  }
  if (/ vs |versus|compare|comparison|сравнен|notion.+obsidian|obsidian.+notion/.test(text)) {
    return "comparison";
  }
  if (/what is|что такое|guide|как работает|простыми словами|\bapi\b|апи|wikipedia|википедия/.test(text)) {
    return "definition_or_guide";
  }
  if (/how to|как /.test(text)) return "how_to";
  return "unknown";
}

function compactPageResult(item, renderMode, fetchResult, extracted, quality) {
  return {
    queryId: item.queryId,
    query: item.query,
    locale: item.locale,
    serpProvider: item.serpProvider,
    serpProviderStatus: item.serpProviderStatus,
    serpDataMode: item.serpDataMode,
    position: item.position,
    url: item.url,
    finalUrl: fetchResult.finalUrl,
    status: fetchResult.status,
    renderMode,
    fetchError: fetchResult.error,
    contentType: fetchResult.contentType,
    htmlLength: fetchResult.html.length,
    extractionQuality: quality.quality,
    extractionScore: quality.score,
    extractionReasons: quality.reasons,
    extractionConfidence: Number(Math.min(1, quality.score / 7).toFixed(2)),
    detectedPageType: detectPageType(extracted, item.serpTitle),
    serpTitle: item.serpTitle,
    serpPassage: item.serpPassage,
    title: extracted.title,
    metaDescription: extracted.metaDescription,
    canonical: extracted.canonical,
    h1: extracted.h1,
    headings: extracted.headings.slice(0, 80),
    mainTextLength: extracted.mainTextLength,
    mainTextSample: truncate(extracted.mainText, 1200),
    tableCount: extracted.tables.length,
    listCount: extracted.lists.length,
    formCount: extracted.forms.length,
    interactiveElements: extracted.interactiveElements,
    schemaTypes: extracted.schemaTypes,
    hasMain: extracted.hasMain,
    hasArticle: extracted.hasArticle,
    hasJsonLd: extracted.hasJsonLd,
    blockSignals: extracted.blockSignals,
    limitations:
      quality.quality === "good"
        ? []
        : [
            "Do not use this page for detailed content-gap/schema-gap conclusions without review.",
          ],
  };
}

async function parseOne(item, browserRef) {
  const fastFetch = await fetchHtml(item.url);
  let fastExtracted = extractWithCheerio(fastFetch.html, fastFetch.finalUrl || item.url);
  let fastQuality = scoreExtraction(fastFetch, fastExtracted);

  if (!fastQuality.headlessFallbackRequired) {
    return compactPageResult(item, "fast_html", fastFetch, fastExtracted, fastQuality);
  }

  if (!browserRef.browser) {
    browserRef.browser = await chromium.launch({ headless: true });
  }
  const renderedFetch = await renderWithHeadless(browserRef.browser, item.url);
  const renderedExtracted = extractWithCheerio(
    renderedFetch.html,
    renderedFetch.finalUrl || item.url,
  );
  const renderedQuality = scoreExtraction(renderedFetch, renderedExtracted);

  if (renderedQuality.score >= fastQuality.score) {
    return compactPageResult(
      item,
      "headless",
      renderedFetch,
      renderedExtracted,
      renderedQuality,
    );
  }

  const result = compactPageResult(item, "fast_html_failed_headless_worse", fastFetch, fastExtracted, fastQuality);
  result.limitations.push("Headless fallback did not improve extraction.");
  result.headlessFallbackAttempted = true;
  result.headlessStatus = renderedFetch.status;
  result.headlessError = renderedFetch.error;
  result.headlessScore = renderedQuality.score;
  return result;
}

function summarize(results) {
  const byQuality = {};
  const byRenderMode = {};
  const byPageType = {};
  for (const item of results) {
    byQuality[item.extractionQuality] = (byQuality[item.extractionQuality] || 0) + 1;
    byRenderMode[item.renderMode] = (byRenderMode[item.renderMode] || 0) + 1;
    byPageType[item.detectedPageType] = (byPageType[item.detectedPageType] || 0) + 1;
  }
  return {
    totalPages: results.length,
    byQuality,
    byRenderMode,
    byPageType,
    goodOrPartial: results.filter((r) =>
      ["good", "partial"].includes(r.extractionQuality),
    ).length,
    blockedOrPoor: results.filter((r) =>
      ["blocked", "poor"].includes(r.extractionQuality),
    ).length,
  };
}

function toMarkdown(results, summary) {
  const lines = [];
  lines.push("# Hybrid Parser Run");
  lines.push("");
  lines.push(`Дата: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Total pages: ${summary.totalPages}`);
  lines.push(`- Good/partial extraction: ${summary.goodOrPartial}`);
  lines.push(`- Blocked/poor extraction: ${summary.blockedOrPoor}`);
  lines.push(`- Render modes: ${JSON.stringify(summary.byRenderMode)}`);
  lines.push(`- Extraction quality: ${JSON.stringify(summary.byQuality)}`);
  lines.push(`- Detected page types: ${JSON.stringify(summary.byPageType)}`);
  lines.push("");
  lines.push("## Page Matrix");
  lines.push("");
  lines.push("| Query | Pos | Render | Quality | Score | Type | H1 | Text | Tables | Forms | Schema | URL |");
  lines.push("|---|---:|---|---|---:|---|---|---:|---:|---:|---|---|");
  for (const item of results) {
    lines.push(
      [
        item.queryId,
        item.position,
        item.renderMode,
        item.extractionQuality,
        item.extractionScore,
        item.detectedPageType,
        item.h1[0] || item.title || "-",
        item.mainTextLength,
        item.tableCount,
        item.formCount,
        item.schemaTypes.join(", ") || "-",
        item.url,
      ]
        .map((cell) => String(cell).replace(/\|/g, "\\|").replace(/\n/g, " "))
        .join(" | ")
        .replace(/^/, "| ")
        .replace(/$/, " |"),
    );
  }
  lines.push("");
  lines.push("## Limitations");
  lines.push("");
  lines.push("- `good` and `partial` pages can support page-type and module analysis.");
  lines.push("- `poor` or `blocked` pages must not be used for detailed content-gap conclusions.");
  lines.push("- Headless fallback proves renderability, not ranking causality.");
  lines.push("");
  return lines.join("\n");
}

async function main() {
  await ensureDirs();
  const metadata = await loadQueryMetadata();
  const ids = process.argv.slice(2);
  const targetIds = ids.length ? ids : await listCachedSerpIds();
  if (!targetIds.length) {
    throw new Error("No SERP XML files found. Run scripts/fetch-serp.mjs or place XML files in data/serp-cache/.");
  }

  const serpItems = [];
  for (const id of targetIds) {
    const items = await readSerpFile(id, metadata);
    serpItems.push(...items.slice(0, MAX_PER_QUERY));
  }

  const results = [];
  const browserRef = { browser: null };
  try {
    for (const item of serpItems) {
      console.log(`[parse] ${item.queryId} #${item.position} ${item.url}`);
      const result = await parseOne(item, browserRef);
      results.push(result);
      const pageFile = path.join(
        parserPagesDir,
        `${item.queryId}-${String(item.position).padStart(2, "0")}.json`,
      );
      await fs.writeFile(pageFile, JSON.stringify(result, null, 2), "utf8");
      console.log(
        `  -> ${result.renderMode} ${result.extractionQuality} score=${result.extractionScore} type=${result.detectedPageType}`,
      );
    }
  } finally {
    if (browserRef.browser) await browserRef.browser.close().catch(() => {});
  }

  const summary = summarize(results);
  await fs.writeFile(
    parserMatrixPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), queryIds: targetIds, metadata, summary, results }, null, 2),
    "utf8",
  );
  await fs.writeFile(
    parserMatrixReportPath,
    toMarkdown(results, summary),
    "utf8",
  );
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
