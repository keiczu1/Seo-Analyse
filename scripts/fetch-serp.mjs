import fs from "node:fs/promises";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";
import { goldenQueriesPath, rel, rootDir, serpDir, serpErrorsDir, serpManifestPath } from "./lib/paths.mjs";

async function loadLocalEnv() {
  const envPath = path.join(rootDir, ".env");
  let text;
  try {
    text = await fs.readFile(envPath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, name, rawValue] = match;
    if (process.env[name] !== undefined) continue;
    process.env[name] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}

await loadLocalEnv();

const DEFAULT_ENDPOINT = "http://xmlriver.com/search/xml";
const DEFAULT_ATTEMPTS = Number(process.env.XMLRIVER_ATTEMPTS || "3");
const DEFAULT_STALE_DAYS = Number(process.env.XMLRIVER_STALE_DAYS || "7");

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
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

async function readJsonIfExists(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return fallback;
    throw error;
  }
}

function localeToLr(locale) {
  if (!locale) return "en";
  return String(locale).toLowerCase().startsWith("ru") ? "ru" : "en";
}

function redactUrl(url) {
  const parsed = new URL(url);
  if (parsed.searchParams.has("key")) parsed.searchParams.set("key", "[redacted]");
  return parsed.toString();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildUrl({ endpoint, user, key, query, locale, groupby = "10", domain = "10", device = "desktop" }) {
  const url = new URL(endpoint);
  url.searchParams.set("user", user);
  url.searchParams.set("key", key);
  url.searchParams.set("query", query);
  url.searchParams.set("groupby", groupby);
  url.searchParams.set("domain", domain);
  url.searchParams.set("device", device);
  url.searchParams.set("lr", localeToLr(locale));
  return url;
}

function inspectXml(xml) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
  });
  let parsed;
  try {
    parsed = parser.parse(xml);
  } catch (error) {
    return {
      ok: false,
      serpProviderStatus: "invalid_xml",
      urlCount: 0,
      error: String(error),
    };
  }
  const response = parsed?.yandexsearch?.response;
  const errorNode = response?.error || parsed?.yandexsearch?.request?.error;
  if (errorNode) {
    const code = errorNode?.["@_code"] || errorNode?.code || "";
    const message = typeof errorNode === "string" ? errorNode : errorNode?.["#text"] || JSON.stringify(errorNode);
    return {
      ok: false,
      serpProviderStatus: code === "15" || code === "32" ? "quota_or_auth_error" : "temporary_error",
      urlCount: 0,
      error: `${code ? `code=${code}; ` : ""}${message}`,
    };
  }
  const groups = response?.results?.grouping?.group;
  const groupArray = Array.isArray(groups) ? groups : groups ? [groups] : [];
  return {
    ok: groupArray.length > 0,
    serpProviderStatus: groupArray.length > 0 ? "ok" : "empty",
    urlCount: groupArray.length,
    error: groupArray.length > 0 ? null : "No organic groups in XML response.",
  };
}

async function fetchWithRetry(url, attempts) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          accept: "application/xml,text/xml;q=0.9,*/*;q=0.8",
          "user-agent": "SeoAnalyseProductionBot/1.0 (+local analysis workflow)",
        },
      });
      const text = await response.text();
      if (!response.ok) {
        lastError = {
          serpProviderStatus: response.status === 401 || response.status === 403 ? "quota_or_auth_error" : "temporary_error",
          error: `HTTP ${response.status}`,
          text,
        };
      } else {
        return { text, httpStatus: response.status };
      }
    } catch (error) {
      lastError = { serpProviderStatus: "temporary_error", error: String(error), text: "" };
    }
    if (attempt < attempts) await sleep(750 * 2 ** (attempt - 1));
  }
  throw Object.assign(new Error(lastError?.error || "XMLRiver request failed"), lastError || {});
}

function isFresh(entry, staleDays) {
  if (!entry?.fetchedAt) return false;
  const fetchedAt = new Date(entry.fetchedAt).getTime();
  if (!Number.isFinite(fetchedAt)) return false;
  return Date.now() - fetchedAt < staleDays * 24 * 60 * 60 * 1000;
}

async function fetchOne(item, options) {
  await fs.mkdir(serpDir, { recursive: true });
  await fs.mkdir(serpErrorsDir, { recursive: true });
  const manifest = await readJsonIfExists(serpManifestPath, { updatedAt: null, items: {} });
  const existing = manifest.items[item.id];
  const cacheFile = path.join(serpDir, `${item.id}.xml`);
  const staleDays = Number(options.staleDays || DEFAULT_STALE_DAYS);

  if (!options.force && isFresh(existing, staleDays)) {
    return {
      id: item.id,
      query: item.query,
      skipped: true,
      reason: `fresh cache < ${staleDays} days`,
      cacheFile,
    };
  }

  const user = options.user || process.env.XMLRIVER_USER;
  const key = options.key || process.env.XMLRIVER_KEY;
  if (!user || !key) {
    throw new Error("Set XMLRIVER_USER and XMLRIVER_KEY, or pass --user and --key. Keys are never written to cache or reports.");
  }

  const endpoint = options.endpoint || process.env.XMLRIVER_ENDPOINT || DEFAULT_ENDPOINT;
  const url = buildUrl({
    endpoint,
    user,
    key,
    query: item.query,
    locale: item.locale,
    groupby: options.groupby || "10",
    domain: options.domain || "10",
    device: options.device || "desktop",
  });
  const fetchedAt = new Date().toISOString();
  try {
    const response = await fetchWithRetry(url, Number(options.attempts || DEFAULT_ATTEMPTS));
    const inspection = inspectXml(response.text);
    if (!inspection.ok) {
      const errorRecord = {
        id: item.id,
        query: item.query,
        locale: item.locale,
        provider: "xmlriver_google",
        serpProviderStatus: inspection.serpProviderStatus,
        error: inspection.error,
        fetchedAt,
        requestUrl: redactUrl(url),
      };
      await fs.writeFile(
        path.join(serpErrorsDir, `${item.id}-${fetchedAt.replace(/[:.]/g, "-")}.json`),
        JSON.stringify(errorRecord, null, 2),
        "utf8",
      );
      manifest.items[item.id] = {
        ...errorRecord,
        serpDataMode: "provider_error",
        cacheFile: rel(cacheFile),
      };
      manifest.updatedAt = new Date().toISOString();
      await fs.writeFile(serpManifestPath, JSON.stringify(manifest, null, 2), "utf8");
      throw new Error(`XMLRiver provider error for ${item.id}: ${inspection.error}`);
    }

    await fs.writeFile(cacheFile, response.text, "utf8");
    manifest.items[item.id] = {
      id: item.id,
      query: item.query,
      locale: item.locale,
      provider: "xmlriver_google",
      serpProviderStatus: "ok",
      serpDataMode: "title_snippet_only",
      cacheFile: rel(cacheFile),
      fetchedAt,
      urlCount: inspection.urlCount,
      request: {
        endpoint,
        groupby: options.groupby || "10",
        domain: options.domain || "10",
        device: options.device || "desktop",
        lr: localeToLr(item.locale),
      },
    };
    manifest.updatedAt = new Date().toISOString();
    await fs.writeFile(serpManifestPath, JSON.stringify(manifest, null, 2), "utf8");
    return {
      id: item.id,
      query: item.query,
      skipped: false,
      status: "ok",
      urlCount: inspection.urlCount,
      cacheFile,
    };
  } catch (error) {
    if (error.serpProviderStatus) {
      const errorRecord = {
        id: item.id,
        query: item.query,
        locale: item.locale,
        provider: "xmlriver_google",
        serpProviderStatus: error.serpProviderStatus,
        error: error.error || String(error),
        fetchedAt,
        requestUrl: redactUrl(url),
      };
      await fs.writeFile(
        path.join(serpErrorsDir, `${item.id}-${fetchedAt.replace(/[:.]/g, "-")}.json`),
        JSON.stringify(errorRecord, null, 2),
        "utf8",
      );
    }
    throw error;
  }
}

async function loadBenchmarkItems(ids) {
  const benchmark = await readJsonIfExists(goldenQueriesPath, { queries: [] });
  if (!ids.length) return benchmark.queries;
  const wanted = new Set(ids);
  return benchmark.queries.filter((item) => wanted.has(item.id));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let items = [];
  if (args.query) {
    items = [
      {
        id: args.id || `Q${Date.now()}`,
        query: args.query,
        locale: args.locale || "en-US",
      },
    ];
  } else {
    const ids = args._.length ? args._ : args.id ? [args.id] : [];
    items = await loadBenchmarkItems(ids);
  }
  if (!items.length) {
    throw new Error("No queries to fetch. Pass --query, --id, or golden query IDs.");
  }

  const results = [];
  for (const item of items) {
    console.log(`[fetch-serp] ${item.id} ${item.query}`);
    const result = await fetchOne(item, args);
    results.push(result);
    console.log(`  -> ${result.skipped ? result.reason : `${result.status}; urls=${result.urlCount}`}`);
  }
  console.log(JSON.stringify({ total: results.length, results }, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
