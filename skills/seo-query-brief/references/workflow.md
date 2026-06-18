# SEO Query Brief Workflow

## Inputs

Minimum:

- primary query
- language/locale
- region/device if relevant
- business goal
- constraints and available assets

Optional:

- query cluster
- must-use sources
- forbidden claims
- conversion goal
- freshness requirement

## Evidence Modes

- `parsed_html` or `rendered_dom`: may support page type, module, heading, schema, and content-gap conclusions.
- `title_snippet_only`: may support intent and SERP format hints, but not DOM/schema/content-gap claims.
- `knowledge_draft`: offline reasoning only; must not be presented as SERP evidence.
- `provider_error`: stop or fall back explicitly; do not mix provider failures with real SERP cache.

## Page Archetypes

- `hybrid_tool_guide`: calculator or tool first, methodology and limits second.
- `interactive_converter`: live or cached conversion first, source and timestamp visible.
- `article_guide_definition`: short definition first, examples and related terms second.
- `how_to_guide`: steps, requirements, risks, update date.
- `comparison_page`: verdict, criteria, comparison table, scenarios.
- `commercial_comparison_page`: shortlist, methodology, pricing date, disclosure.
- `reference_database`: value/table, units, source, related entries.
- `local_service_page`: location, service area, contact, trust proof.
- `freshness_page`: current status, official sources, last checked date.
- `ymyl_medical_guide`: cautious explanation, red flags, sources, expert review.
- `hub_or_disambiguation`: split mixed intent into focused paths.

## Production Brief Structure

Return:

1. Query Passport
2. Executive Production Decision
3. SERP Interpretation
4. SERP Features
5. Entity Map
6. Query Cluster
7. Page Decision
8. Meta Suggestions
9. Source Plan
10. Source Refresh
11. Publication Review
12. Implementation Contract
13. Outline
14. Editor Brief
15. Frontend Brief
16. Trust and Schema
17. QA Checklist
18. Open Risks

## Page Spec Structure

The production brief explains the decision. The page spec is the implementation handoff.

Generate a separate page spec after the brief and before claiming implementation. It must include:

1. Query passport and production status
2. Source artifacts used
3. First-screen contract
4. Cluster and coverage application
5. Component contract
6. Block-by-block content requirements
7. Source and fact map
8. Editorial rules
9. Frontend rules and acceptance tests
10. Structured data guardrails
11. QA checklist
12. Open risks

If the optional CLI kit is present, run:

```powershell
npm.cmd run page:spec -- --id <queryId>
npm.cmd run validate:page-spec -- reports/page-spec-<slug>-<date>.md
```

Do not treat `reports/query-<slug>-<date>.md` as implemented work by itself. The implementation artifact is either a real page in the target project or `reports/page-spec-<slug>-<date>.md` when this repository is used as an analysis-only workspace.

## Final Synthesis Layer

The final brief is not a dump of rule-based analysis. It must convert evidence into a human handoff:

- executive page decision and content line;
- first-screen contract;
- actionable outline where every H2 has a job, coverage requirements, SERP signals, source-verification prompts, format, and acceptance criterion;
- editor instructions by section, not only generic style notes;
- frontend component specs, including states for interactive modules;
- explicit blocker when source refresh or reviewer approval is unresolved.

If the document only lists module names such as "short answer", "steps", or "requirements" without saying what each block must accomplish, the brief is not ready.

## SERP Features

Include:

- provider data mode
- whether complete SERP feature inventory is available
- direct answer status
- calculator/widget status
- People Also Ask status
- video/local/news indicators if available
- zero-click risk
- limitations when the provider only exposes organic URLs

Do not invent SERP features. If the provider does not expose them, say `unknown_provider_limited`.

## Entity Map

Include:

- primary entity
- synonyms and accepted variants
- attributes the page must cover
- actions the user wants to complete
- related entities that clarify scope
- authority entities such as official sources, standards, reviewers, or data providers
- risk entities where the page must avoid overclaiming
- excluded or limited entities that should not be treated as fully covered
- explicit relations, for example `entity -> attribute -> user interpretation`

The entity map is not a keyword dump. It is the semantic contract that drives modules, outline, metadata, schema, and editorial guardrails.

## Query Cluster

Include:

- primary query
- decision: `single_page`, `single_page_with_explicit_exclusions`, `hub_or_split`, `merge_to_existing`, or `do_not_build`
- canonical intent
- included queries
- excluded queries
- split candidates with reasons
- rationale tied to SERP evidence and entity scope
- raw SERP signals separately from normalized query candidates

The cluster layer decides what one URL is allowed to cover. It prevents broad pages from absorbing intents that need a different URL.

Do not treat every competitor heading as a keyword. Raw SERP titles, headings, slogans, typos, brand suffixes, and snippets are evidence signals first. Promote them into included/supporting queries only after normalization and intent checks.

## Meta Suggestions

Generate title and description variants after the page type and entity map are known.

Each variant must include:

- title
- title character count
- meta description
- description character count
- basis: which entity, intent, SERP pattern, module, or trust constraint produced it

Rules:

- Metadata must describe visible page content.
- Metadata must be unique to the URL and not a list of keywords.
- For YMYL pages, avoid diagnosis, treatment, financial, legal, or safety promises.
- The selected variant should prioritize task completion and primary entity clarity over maximal keyword stuffing.

## Source Plan

Include:

- whether source refresh is required
- risk level
- publication status
- reviewer-required flag
- fact list with claim, preferred sources, status, last checked date, and reviewer requirement
- visible blocks required for publication

For YMYL, legal, financial, pricing, converter, and freshness-sensitive pages, a production brief is not ready when the source plan is empty.

## Source Refresh

Run source refresh before calling a brief final.

Include:

- the catalog file used, usually `data/source-catalog/<queryId>.json`
- checked official URLs for each required fact
- source authority type
- HTTP/fetch status or provider status
- checked date and source page date when available
- fact status: `verified`, `verified_pending_reviewer`, `source_search_required`, or `not_required`
- reviewer requirement
- publication status after refresh

Rules:

- Prefer official sources, standards bodies, regulators, primary documentation, or vendor pages depending on topic.
- Do not treat competitor pages as source refresh for facts that need official support.
- Keep query-specific official URLs in `data/source-catalog/<queryId>.json`, not hardcoded in the source-refresh script.
- For medical/YMYL topics, source refresh can verify facts but must not bypass reviewer approval.
- If no official source can be checked, keep the brief in `source_search_required`.

## Publication Review

Run automated publication review after source refresh.

Include:

- source refresh status
- required source/trust blocks
- disclaimer and limitation checks
- forbidden-claim checks for diagnosis, treatment, guarantees, and fake review claims
- schema guardrails
- final candidate status

Status rules:

- `ready_for_publication_candidate`: Codex can proceed to final page spec and implementation.
- `ready_for_publication_candidate_without_medical_review_claim`: Codex can proceed for an informational source-backed page, but the site must not claim human medical review or add medical-review schema.
- `ready_for_publication_candidate_pending_expert_review`: official sources and automated guardrails passed, but a qualified expert must review before final publication or expert-review claims.
- `needs_revision_before_publication_candidate`: fix missing sources, disclaimers, limitations, schema guardrails, or unsafe claims.

A real qualified expert is required when the site wants to claim expert review, add expert-only schema, or publish diagnosis/treatment/legal/financial recommendations. Otherwise, Codex should complete official-source verification and conservative publication review itself, while keeping the reviewer gate visible.

## Implementation Contract

Include:

- visible components
- fields, units, validation, and result states when the page is interactive
- required trust/source/disclaimer blocks
- acceptance tests
- schema dependencies

The implementation contract is the machine-readable bridge from SEO decision to frontend build. It is required even when the user does not ask to implement the page immediately.

The brief is ready only when the page type, first screen, modules, trust requirements, source requirements, and implementation contract are specific enough for implementation.
