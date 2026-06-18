# Project Integration

Use this reference when the user wants to use `seo-query-brief` in another project.

## What Is Portable

The skill itself is portable:

- `SKILL.md`
- `references/workflow.md`
- `references/brief-rubric.md`
- `references/project-integration.md`
- `scripts/score-brief.mjs`
- `agents/openai.yaml`

These files are enough for Codex to produce evidence-labeled SEO page briefs in any repository.

## What Is Not Assumed

Do not assume the target project has:

- XMLRiver credentials
- a SERP cache
- a Playwright parser
- a specific source workspace's npm scripts
- existing `data/`, `reports/`, or `docs/` folders

Inspect the target project first. If no SERP/parser tooling exists, produce `knowledge_draft` or use user-provided evidence.

## Optional CLI Workflow

If the target project also receives the optional CLI kit, look for:

- `package.json` scripts such as `fetch:serp`, `parse:serp`, `analyze:query`, `benchmark:offline`
- `cluster:query` or `seo:cluster` for generating `data/clusters/<id>-cluster.json` and `reports/cluster-<slug>-<date>.md`
- `brief:query` or `seo:brief` for generating the final `reports/query-<slug>-<date>.md` production brief
- `page:spec` or `seo:page-spec` for generating the implementation handoff `reports/page-spec-<slug>-<date>.md`
- `scripts/lib/paths.mjs`
- `.env.example` with XMLRiver placeholders
- `data/benchmark/golden-queries.json`

Only run those commands when the files exist in the target project. Never invent commands from this reference.

Expected one-query CLI flow:

```powershell
npm.cmd run analyze:query -- --id Q01 --query "your query" --locale ru-RU
```

or, after GitHub installation with prefixed scripts:

```powershell
npm.cmd run seo:analyze:query -- --id Q01 --query "your query" --locale ru-RU
```

The command should run SERP fetch, parsing, full analysis, query clustering, and brief generation. The cluster should be written to:

```text
data/clusters/<id>-cluster.json
reports/cluster-<slug>-<date>.md
```

The final brief should be written to:

```text
reports/query-<slug>-<date>.md
```

If only the current analysis needs to be re-rendered:

```powershell
npm.cmd run cluster:query -- --id Q01
npm.cmd run brief:query -- --id Q01
npm.cmd run page:spec -- --id Q01
```

Without external keyword services, cluster evidence must be labeled `parsed_serp_cluster + synthetic_cluster` or `synthetic_cluster`, not keyword-volume evidence.

## Recommended Installation Shape

For a project-local installation, place the skill folder at:

```text
skills/seo-query-brief/
```

If the active Codex environment does not auto-discover project-local skills, the user or agent can still invoke it explicitly by path:

```text
Use the seo-query-brief skill at <project>/skills/seo-query-brief to analyze this query...
```

For global auto-discovery, the same folder can be copied into the user's Codex skills directory, but do this only when the user explicitly asks.
