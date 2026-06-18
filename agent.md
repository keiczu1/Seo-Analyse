# Agent Rules

This project is a universal SEO query analysis and production-brief workflow. Keep it portable and query-agnostic.

## Core Principle

- Do not add hardcoded brief, outline, source, or cluster logic for a specific query, niche, site, or example.
- Build briefs from evidence: query intent, SERP data, parsed competitor pages, entity map, topic coverage, query cluster, source risk, and page archetype.
- Page archetypes are allowed. Niche-specific templates are not.

## Standard Workflow

Use this order when generating a final brief:

1. `npm.cmd run fetch:serp -- --id <id> --query "<query>" --locale <locale>` when fresh SERP data is needed.
2. `npm.cmd run parse:serp -- --id <id>`.
3. `npm.cmd run analyze:parsed`.
4. `npm.cmd run analyze:full`.
5. `npm.cmd run cluster:query -- --id <id>`.
6. `npm.cmd run brief:query -- --id <id>`.
7. `npm.cmd run score:brief -- reports\<brief-file>.md`.
8. `npm.cmd test` or at least `npm.cmd run production:gate` after code changes.

`analyze:query` may run the normal chain for one query. If cluster generation was rerun, rerun `brief:query` after it so the final brief reads the latest cluster artifact.

The final `brief:query` output must include a synthesis layer. Do not treat `full-analysis-output.json` or a section dump as the final production brief.

## Artifacts

- Final production briefs: `reports/query-<slug>-<date>.md`.
- Query cluster reports: `reports/cluster-<slug>-<date>.md`.
- Cluster JSON: `data/clusters/<queryId>-cluster.json`.
- Parser output: `data/parser-output/`.
- Full analysis JSON: `data/analysis/full-analysis-output.json`.
- Portable package: `dist/seo-query-brief-portable/`.

## Query Cluster Rules

- Keep normalized query candidates separate from raw SERP evidence.
- Raw titles, snippets, headings, slogans, typos, competitor brand text, and source suffixes are evidence signals first.
- Promote raw SERP text into included/supporting queries only after normalization and intent checks.
- Do not claim external keyword-volume evidence unless an external keyword service was actually used.
- If no external keyword service is used, mark the cluster accordingly.

## Brief Quality Rules

- The final brief must be usable by an editor and frontend developer without reading internal code.
- The final brief must have an Executive Production Decision, actionable outline, section-level writing requirements, source-verification prompts, component specs, and acceptance criteria.
- Title and description must be based on visible page content, page type, entity, user task, and trust limits.
- Do not put internal module IDs such as `quick_answer` in title, description, or outline text.
- Outline must be generated from the selected page archetype, required visible modules, topic gaps, and SERP signals. It must not be a universal article template.
- Raw competitor headings may inform the outline, but do not copy competitor structure blindly.
- Required modules should show human-readable labels and implementation purpose.
- For Russian queries, generated human-facing brief text should be in Russian where practical.

## Source And Publication Rules

- For source-sensitive, YMYL, legal, financial, medical, pricing, converter, and freshness pages, the brief is not publication-ready until source refresh is completed or explicitly remains blocked.
- Competitor pages are not official sources for source-sensitive facts.
- Source Plan should list concrete fact groups, statuses, preferred source types, reviewer flags, and required visible blocks.
- Source Refresh should verify official URLs from `data/source-catalog/<queryId>.json`; keep query-specific URLs in data, not in source-refresh code.
- Source Refresh and Publication Review artifacts must match the current `full-analysis-output.json` query IDs. Do not reuse stale output from another query.
- Do not call a brief final when `source refresh required` is unresolved.
- Publication Review must be domain-aware. Legal/financial YMYL should not be forced through medical-only checks.
- Do not claim expert or medical/legal/financial review unless a real qualified reviewer exists.
- Structured data must describe visible, truthful content only.

## Implementation Rules

- Keep the optional CLI kit portable. Do not rely on neighboring projects or global installs.
- Do not copy real API keys, `.env`, SERP cache, parser output, reports, or `node_modules` into the portable package.
- After changing scripts or skill files, run `npm.cmd run package:skill` so `dist/seo-query-brief-portable/` is refreshed.
- Keep `production:gate` as the main readiness gate.
- Keep `score:brief` strict enough to fail machine artifacts, raw SERP-as-keywords, generic source plans, missing synthesis layer, outline-only H2 lists, and internal IDs in user-facing sections.

## Project Boundaries

- Work only inside this project unless the user explicitly asks otherwise.
- Do not inspect neighboring projects.
- No git repository is currently assumed here; report file changes directly rather than relying on git status.
