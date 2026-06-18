import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distRoot = path.join(rootDir, "dist");
const packageDir = path.join(distRoot, "seo-query-brief-portable");

const sourceSkillDir = path.join(rootDir, "skills", "seo-query-brief");
const targetSkillDir = path.join(packageDir, "skills", "seo-query-brief");
const targetCliDir = path.join(packageDir, "optional-cli-kit");

function assertInsideRoot(target) {
  const resolved = path.resolve(target);
  const root = path.resolve(rootDir);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Refusing to write outside workspace: ${resolved}`);
  }
  return resolved;
}

async function copyFileIfExists(from, to) {
  try {
    await fs.mkdir(path.dirname(to), { recursive: true });
    await fs.copyFile(from, to);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

async function copyDir(from, to) {
  await fs.cp(from, to, {
    recursive: true,
    force: true,
    filter: (source) => {
      if (source.includes(`${path.sep}node_modules${path.sep}`)) return false;
      if (source.endsWith(`${path.sep}production-gate.mjs`)) return false;
      if (source.endsWith(`${path.sep}package-skill.mjs`)) return false;
      if (source.endsWith(`${path.sep}validate-skill.mjs`)) return false;
      return true;
    },
  });
}

const packageSnippet = {
  scripts: {
    "fetch:serp": "node scripts/fetch-serp.mjs",
    "parse:serp": "node scripts/hybrid-parser.mjs",
    "analyze:parsed": "node scripts/analyze-parsed-matrix.mjs",
    "analyze:full": "node scripts/generate-full-analysis.mjs",
    "source:refresh": "node scripts/source-refresh.mjs",
    "publication:review": "node scripts/publication-review.mjs",
    "cluster:query": "node scripts/generate-query-cluster.mjs",
    "brief:query": "node scripts/generate-query-brief.mjs",
    "page:spec": "node scripts/generate-page-spec.mjs",
    "score:brief": "node skills/seo-query-brief/scripts/score-brief.mjs",
    "analyze:query": "node scripts/analyze-query.mjs",
    "benchmark:offline": "node scripts/benchmark-offline.mjs",
    "validate:page-spec": "node scripts/validate-page-spec.mjs",
    "test:seo-query-brief": "npm.cmd run benchmark:offline && npm.cmd run analyze:parsed && npm.cmd run analyze:full && npm.cmd run cluster:query && npm.cmd run brief:query && npm.cmd run page:spec",
  },
  dependencies: {
    "@mozilla/readability": "^0.6.0",
    cheerio: "^1.1.2",
    "fast-xml-parser": "^5.2.5",
    jsdom: "^26.1.0",
    playwright: "^1.54.2",
  },
};

const installMarkdown = `# SEO Query Brief Portable Package

This folder is a project-local, portable package. It does not install anything globally.

## One-Command GitHub Install

After this repository is published to GitHub, install into the current project with:

\`\`\`powershell
irm https://raw.githubusercontent.com/Keiczu1/Seo-Analyse/main/install.ps1 | iex
\`\`\`

If the repository slug is different:

\`\`\`powershell
iex "& { $(irm https://raw.githubusercontent.com/OWNER/REPO/main/install.ps1) } -Repo OWNER/REPO"
\`\`\`

By default this installs:

- project-local skill: \`skills/seo-query-brief/\`
- optional CLI kit: \`tools/seo-query-brief/\`
- npm scripts with the \`seo:\` prefix when \`package.json\` is available or can be created

Use \`-SkillOnly\` when only the skill folder is needed.

## Manual Install: Skill

Copy this folder into the target project:

\`\`\`text
skills/seo-query-brief/
\`\`\`

If the active Codex environment does not auto-discover project-local skills, invoke it explicitly:

\`\`\`text
Use the seo-query-brief skill at <project>/skills/seo-query-brief to analyze this query...
\`\`\`

## Manual Install: Optional CLI Kit

Use \`optional-cli-kit/\` only when the target project needs the same XMLRiver/cache/parser workflow.

Copy these into the target project:

\`\`\`text
optional-cli-kit/scripts/ -> scripts/
optional-cli-kit/data/benchmark/ -> data/benchmark/
optional-cli-kit/data/source-catalog/README.md -> data/source-catalog/README.md
optional-cli-kit/.env.example -> .env.example
\`\`\`

Then merge \`optional-cli-kit/package-snippet.json\` into the target project's \`package.json\`.

Do not copy \`node_modules\`, \`.env\`, SERP cache, parser output, reports, or real API keys.

## Validation

After copying the optional CLI kit, run:

\`\`\`powershell
npm.cmd install
npm.cmd run benchmark:offline
npm.cmd run analyze:query -- --id Q01 --query "your query" --locale ru-RU
npm.cmd run cluster:query -- --id Q01
npm.cmd run brief:query -- --id Q01
npm.cmd run page:spec -- --id Q01
\`\`\`

Run source refresh and publication review only for supported source-sensitive workflows:

\`\`\`powershell
New-Item -ItemType Directory -Force data/source-catalog
# Add data/source-catalog/<queryId>.json with official source candidates first.
npm.cmd run source:refresh
npm.cmd run publication:review
\`\`\`

For a generated brief, run:

\`\`\`powershell
node skills/seo-query-brief/scripts/score-brief.mjs path/to/brief.md
\`\`\`

For an implemented page spec, run:

\`\`\`powershell
node scripts/validate-page-spec.mjs path/to/page-spec.md
\`\`\`
`;

async function main() {
  assertInsideRoot(packageDir);
  await fs.rm(packageDir, { recursive: true, force: true });
  await fs.mkdir(packageDir, { recursive: true });

  await copyDir(sourceSkillDir, targetSkillDir);
  await copyFileIfExists(path.join(rootDir, "install.ps1"), path.join(packageDir, "install.ps1"));
  await copyDir(path.join(rootDir, "scripts"), path.join(targetCliDir, "scripts"));
  await copyFileIfExists(path.join(rootDir, ".env.example"), path.join(targetCliDir, ".env.example"));
  await copyFileIfExists(
    path.join(rootDir, "data", "benchmark", "golden-queries.json"),
    path.join(targetCliDir, "data", "benchmark", "golden-queries.json"),
  );
  await copyFileIfExists(
    path.join(rootDir, "data", "source-catalog", "README.md"),
    path.join(targetCliDir, "data", "source-catalog", "README.md"),
  );

  await fs.writeFile(
    path.join(targetCliDir, "package-snippet.json"),
    `${JSON.stringify(packageSnippet, null, 2)}\n`,
    "utf8",
  );
  await fs.writeFile(path.join(packageDir, "INSTALL.md"), installMarkdown, "utf8");

  const manifest = {
    name: "seo-query-brief-portable",
    generatedAt: new Date().toISOString(),
    contains: {
      skill: "skills/seo-query-brief",
      optionalCliKit: "optional-cli-kit",
    },
    excludes: ["node_modules", ".env", "data/serp-cache", "data/parser-output", "data/analysis", "data/clusters", "reports"],
  };
  await fs.writeFile(path.join(packageDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log(`Built ${path.relative(rootDir, packageDir).split(path.sep).join("/")}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
