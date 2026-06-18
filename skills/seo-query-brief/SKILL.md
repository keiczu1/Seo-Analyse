---
name: seo-query-brief
description: Build evidence-based SEO page briefs from a search query, SERP data, parsed competitor pages, or cached SERP artifacts. Use when Codex needs to decide what page to create, choose an outline archetype, prepare editor and frontend briefs, evaluate SERP intent, package SEO analysis, or avoid generic SEO article templates.
---

# SEO Query Brief

Use this skill to turn a query or query cluster into a production page brief. Start from the user task and SERP evidence, not from a universal article template.

## Workflow

1. Normalize the input: primary query, locale, region/device, business goal, constraints, and freshness/YMYL risk.
2. Get SERP evidence when accuracy matters. Prefer a SERP API/cache. If no SERP is available, label the result `knowledge_draft`.
3. Parse competitor pages when page structure, modules, schema, headings, or content gaps are being claimed. Do not infer DOM/schema gaps from title/snippet-only data.
4. Classify the page archetype from intent plus SERP feedback: tool, converter, definition guide, how-to, comparison, commercial comparison, reference database, local service, freshness page, medical/YMYL guide, or hub/disambiguation.
5. Build the semantic layer before writing page recommendations: primary entity, synonyms, attributes, actions, related entities, authority/risk entities, excluded entities, and the key relations between them.
6. Produce a separate Query Cluster artifact before the final brief: included queries, supporting queries, excluded queries, split candidates, intent groups, entity groups, coverage requirements, cluster decision, evidence mode, and limitations. If the optional CLI kit is present, run `cluster:query`; the expected outputs are `data/clusters/<id>-cluster.json` and `reports/cluster-<slug>-<date>.md`.
7. Decide the query cluster scope: one page, hub/split, explicit exclusions, and split candidates. Keep normalized query candidates separate from raw SERP headings, slogans, titles, typos, and competitor brand text. Without external keyword services, label the cluster `parsed_serp_cluster + synthetic_cluster` or `synthetic_cluster`, not keyword-volume evidence.
8. Add a SERP feature layer. If the provider only exposes organic title/snippet URLs, mark feature data as provider-limited instead of inventing features.
9. Generate title and meta description variants from the entity map, dominant intent, selected page type, visible modules, trust limits, and SERP patterns. Do not generate metadata as standalone copywriting.
10. Add a Source Plan for YMYL, legal, financial, pricing, converter, and freshness-sensitive pages.
11. Run Source Refresh for every required source fact: search or verify official sources, record URLs, checked dates, matched facts, and reviewer requirements. If the active project has the optional CLI kit, add official-source candidates to `data/source-catalog/<queryId>.json`, then run `npm.cmd run source:refresh` after `analyze:full`.
12. Run automated Publication Review. If the page is source-verified and conservative, Codex may mark medical pages as `ready_for_publication_candidate_without_medical_review_claim` or legal/financial/sensitive pages as `ready_for_publication_candidate_pending_expert_review`. A real human expert is required when the site wants to claim expert review, add expert-only schema, or publish diagnostic/treatment/legal/financial recommendations.
13. Add an Implementation Contract: visible components, fields/states where relevant, acceptance tests, and schema dependencies.
14. Add a final synthesis layer before calling the document a production brief: executive page decision, content line, actionable outline, section-level writing requirements, source-verification prompts, component specs, and acceptance criteria. This is the handoff layer for editors and developers.
15. Produce a Production Brief with: Query Passport, Executive Production Decision, SERP Interpretation, SERP Features, Entity Map, Query Cluster, Page Decision, Meta Suggestions, Source Plan, Source Refresh, Publication Review, Implementation Contract, Outline, Editor Brief, Frontend Brief, Trust/Schema, QA Checklist, and Open Risks. If the optional CLI kit is present, `analyze:query` should write the final brief to `reports/query-<slug>-<date>.md`; `brief:query` can re-render it from the current full analysis and cluster artifact.
16. Produce a separate Page Spec before saying the brief has been implemented. This is the build handoff for editors/developers: first screen, cluster application, component contract, block-by-block content requirements, source/fact map, structured data, frontend rules, QA checks, and open risks. If the optional CLI kit is present, run `page:spec`; the expected output is `reports/page-spec-<slug>-<date>.md`.
17. Run the rubric in `references/brief-rubric.md` or `scripts/score-brief.mjs` before calling the brief ready. Run `validate:page-spec` before calling the page spec implemented.

## Hard Rules

- Never promise ranking growth from schema, ARIA, FAQ blocks, word count, or a single module.
- Never use one outline for all query types.
- Never add niche-specific hardcoded page briefs or cluster expansions to the universal workflow. Use archetypes, SERP evidence, entity analysis, and explicit project inputs instead.
- Never mark fallback or offline analysis as equivalent to parsed SERP evidence.
- Never treat synthetic cluster expansion as keyword-volume data.
- Never produce title/description without tying them to the selected page type, primary entity, visible modules, and trust limits.
- Never treat a technical analysis dump as the final brief. The final brief must say what to build, what each section must cover, which facts must be verified, and how the result will be accepted.
- Never treat the production brief itself as implementation. Implementation starts when a page spec or real page is created from the brief and validated.
- Exclude blocked or poor-extraction pages from detailed content-gap conclusions.
- For YMYL, legal, financial, medical, and real-time facts, require official-source refresh and expert review when needed.
- Do not call a source-sensitive brief final until source refresh has checked official URLs or explicitly marks the remaining status as `source_search_required`.
- Do not claim human medical review, diagnostic accuracy, or treatment advice unless a real qualified reviewer exists. Without that, publish only as an official-source-backed informational page.
- Structured data must describe visible, truthful content only.

## Portable Use

This skill must work without assuming a specific repository. First inspect the current project for existing SERP, parser, content, or SEO tooling. Use local project commands only when they are present and safe to run.

If no project tooling exists, still produce a brief from the available inputs, but label the evidence mode honestly:

- `parsed_html` or `rendered_dom` when page HTML/DOM was actually parsed.
- `title_snippet_only` when only SERP titles/snippets are available.
- `knowledge_draft` when reasoning from model knowledge or user-provided context only.
- `provider_error` when a SERP/API provider failed.

When the user asks to validate a generated brief, run the bundled scorer:

```bash
node <path-to-this-skill>/scripts/score-brief.mjs <brief.md>
```

Read `references/workflow.md` for the full evidence rules. Read `references/project-integration.md` when adapting the skill or optional CLI workflow into another project.
