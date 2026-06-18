import fs from "node:fs/promises";
import path from "node:path";

const skillDir = process.argv[2];
if (!skillDir) {
  console.error("Usage: node scripts/validate-skill.mjs <skill-directory>");
  process.exit(2);
}

const resolved = path.resolve(skillDir);
const skillPath = path.join(resolved, "SKILL.md");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return null;
  const result = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (pair) result[pair[1]] = pair[2].trim();
  }
  return result;
}

async function exists(file) {
  try {
    await fs.access(path.join(resolved, file));
    return true;
  } catch {
    return false;
  }
}

const text = await fs.readFile(skillPath, "utf8").catch((error) => {
  fail(`Missing SKILL.md: ${error.message}`);
});
const frontmatter = parseFrontmatter(text);
if (!frontmatter) fail("SKILL.md must start with YAML frontmatter.");
if (frontmatter.name !== "seo-query-brief") fail(`Unexpected skill name: ${frontmatter.name || "<missing>"}`);
if (!frontmatter.description || frontmatter.description.length < 80) fail("Description is missing or too short.");
if (!/^[a-z0-9-]+$/.test(frontmatter.name)) fail("Skill name must be lowercase letters, digits, and hyphens only.");
if (!(await exists("references/workflow.md"))) fail("Missing references/workflow.md");
if (!(await exists("references/brief-rubric.md"))) fail("Missing references/brief-rubric.md");
if (!(await exists("references/project-integration.md"))) fail("Missing references/project-integration.md");
if (!(await exists("scripts/score-brief.mjs"))) fail("Missing scripts/score-brief.mjs");
if (!(await exists("agents/openai.yaml"))) fail("Missing agents/openai.yaml");

console.log(JSON.stringify({ skillDir: path.relative(process.cwd(), resolved) || ".", pass: true }, null, 2));
