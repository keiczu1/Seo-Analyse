# Semantic HTML Gemini - handoff for new chat

Date: 2026-06-26

## Completion status

Status: completed on 2026-06-26.

Implemented in the source layer under `Gemini/src/`, `Gemini/styles/`, and `Gemini/tools/`, then regenerated the root browser HTML files with `npm.cmd run gemini:build`.

Completed changes:

- Added an accessible name to the shared header navigation.
- Added exactly one `main` landmark to the home page and ask-question page.
- Kept category and article pages at one `main`; article pages still use `article`.
- Converted the home trust strip from a standalone `section` to a neutral container.
- Added accessible names for home/category search inputs and the category sort select.
- Normalized heading progression, including the home verification-stage headings as `h3`.
- Added reusable `.visually-hidden` utility styling.
- Extended `Gemini/tools/verify-pages.mjs` with semantic checks for landmarks, `main`, `h1`, form control names, repeated nav names, breadcrumbs, unnamed sections, and heading-level skips inside content sections.
- Preserved visual output: the final raw-pixel comparison reported `diff_pixels: 0` for all five pages on desktop and mobile.

Final verification commands passed:

```powershell
npm.cmd run gemini:build
npm.cmd run gemini:audit-css
npm.cmd run gemini:verify
git diff --check -- Gemini package.json
```

Temporary verification output lives under ignored `Gemini/reports/` and is not source.

## Copy-paste task prompt

Use this as the first message in a new Codex chat:

```text
cwd: D:\Git\Keiczu1\Seo Analyse

Task: semantic HTML refactor for Gemini static pages.

Read first, in this order:
1. AGENTS.md
2. Gemini/AGENTS.md
3. Gemini/SEMANTIC_HTML_GEMINI_TASK.md
4. Gemini/src/pages/README.md

Before editing semantic HTML, accessibility, forms, or landmarks, use Context7:
- /mdn/content for semantic HTML: header, nav, main, article, section, aside, footer, headings, forms.
- /websites/w3_wai_wcag22 for WCAG 2.2: landmarks, headings and labels, accessible names, name/role/value.

Implement the task from Gemini/SEMANTIC_HTML_GEMINI_TASK.md. Source of truth is Gemini/src, Gemini/styles, Gemini/scripts, Gemini/assets, Gemini/tools. Do not hand-edit generated root HTML except through npm.cmd run gemini:build.
```

## Non-negotiable local rules

- `Gemini/src/pages/*.html` are page templates and the source of truth for page structure.
- `Gemini/src/partials/**/*.html` own shared layout pieces: header, footer, head, modals, breadcrumbs.
- Root files such as `Gemini/index.html`, `Gemini/category-divorce.html`, and `Gemini/article-divorce-without-consent.html` are generated browser entry points.
- Persistent edits must happen in source files, then root HTML must be regenerated with `npm.cmd run gemini:build`.
- Do not turn the project back into one large hand-edited HTML file.
- Keep existing classes, ids, CSS contracts, and JS contracts unless a semantic fix absolutely requires a scoped adjustment.
- Do not add ARIA roles or attributes where native HTML already gives the correct semantics.
- Treat `Gemini/reports/` and screenshots as temporary verification evidence, not source.

## Context7 notes used for this handoff

Context7 was queried on 2026-06-26.

- `/mdn/content`: MDN examples use native `header`, `nav`, `main`, `article`, `aside`, and `footer`; `main` wraps the page's primary content; headings should use native `h1-h6`; native `form` should be preferred over ARIA role workarounds.
- `/websites/w3_wai_wcag22`: WCAG techniques show that repeated landmarks, especially multiple `nav` regions, need unique accessible names; form controls need a programmatically determined accessible name through `label`, `aria-label`, `aria-labelledby`, `title`, or equivalent native naming.

## Current state snapshot

This snapshot was produced with read-only inspection. I did not run `gemini:build`, `gemini:audit-css`, or `gemini:verify` during this handoff, because `gemini:verify` runs builds and writes reports.

The working tree is not clean. There are existing modified/generated/deleted Gemini files, a modified `package.json`, new `AGENTS.md` files, new `Gemini/README.md`, new `Gemini/src/pages/README.md`, new `Gemini/tools/generate-docx.mjs`, and the known `output/seo-brief-pipeline` gitlink anomaly. Do not revert unrelated changes.

Current page inventory from `Gemini/src/data/pages.json` and files:

- `index.html`
- `zadat-vopros.html`
- `category-divorce.html`
- `article-divorce-without-consent.html`
- `article-ui-kit.html`

## Fresh semantic findings

### Shared layout

- `Gemini/src/partials/layout/header.html:1` already uses `<header class="site-header" id="siteHeader">`.
- `Gemini/src/partials/layout/header.html:81` has the main navigation as `<nav class="header-nav-row header-nav-row--primary">`, but it has no accessible name.
- Because article/category pages also have breadcrumbs and TOC navigation, the shared header nav should get a clear label such as `aria-label="Основная навигация"`.
- `Gemini/src/partials/layout/footer.html:1` already uses `<footer class="site-footer" id="footer">`.
- `Gemini/tools/build-pages.mjs:116` renders breadcrumbs as `<nav class="breadcrumbs" aria-label="Хлебные крошки">`; keep this contract.

### `Gemini/src/pages/index.html`

- Missing `<main>`: read-only DOM count is `main: 0` in both source template and current generated `Gemini/index.html`.
- One `h1` is present at `Gemini/src/pages/index.html:121`.
- The page has 13 `<section>` elements. Most are meaningful home blocks.
- `Gemini/src/pages/index.html:276` has `<section class="hp-trust-section" id="trust-section">` without an accessible heading. Decide whether it is a true standalone section. If it remains `section`, give it a heading or `aria-labelledby`; if it is only a trust strip, consider a neutral container.
- `Gemini/src/pages/index.html:538` has `input#categoriesSearchInput` without an accessible name. Add a visible or visually hidden label, or a precise `aria-label` if a visible label would change the design.
- The heading outline currently starts `h1 > h3 > h3 > h2...` because the channels block card titles are `h3` before the next `h2`. Review whether the channels block needs a section `h2` or whether those card headings should be adjusted.

### `Gemini/src/pages/zadat-vopros.html`

- Missing `<main>`: read-only DOM count is `main: 0` in both source template and current generated `Gemini/zadat-vopros.html`.
- One `h1` is present at `Gemini/src/pages/zadat-vopros.html:59`.
- Existing form controls have labels in the source template and were not flagged by the read-only accessible-name check.
- Wrap the page's primary form/card content in one `<main>`, preserving existing wrapper classes and ids.

### `Gemini/src/pages/category-divorce.html`

- Already has one `<main class="main" id="top">` at `Gemini/src/pages/category-divorce.html:73`.
- One `h1` is present at `Gemini/src/pages/category-divorce.html:82`.
- `Gemini/src/pages/category-divorce.html:117` has `input#searchInput` without an accessible name.
- `Gemini/src/pages/category-divorce.html:134` has `select#sortSelect` without an accessible name. The nearby visible text "Сортировка:" is not currently programmatically associated.
- Heading outline starts `h1 > h3...` before later `h2` sections. The catalog section at `Gemini/src/pages/category-divorce.html:110` and tools section at `Gemini/src/pages/category-divorce.html:420` should be reviewed for logical `h2/h3` structure.
- Existing TOC nav at `Gemini/src/pages/category-divorce.html:615` has `aria-label="Разделы категории"`.

### Article pages

- `Gemini/src/pages/article-divorce-without-consent.html` has one `<main>`, one `<article>`, one `h1`, semantic content sections, and existing asides.
- `Gemini/src/pages/article-ui-kit.html` has one `<main>`, one `<article>`, one `h1`, semantic content sections, and existing asides.
- Do not churn article pages mechanically. Only adjust if heading order, nav names, or verify checks expose concrete failures.

## Required implementation plan

1. Re-check baseline before edits:
   - `git status --short --untracked-files=all`
   - inspect generated root pages only as browser output;
   - capture temporary baseline full-page screenshots for desktop and mobile if visual comparison is required.

2. Fix shared landmarks:
   - add an accessible name to the main header nav in `Gemini/src/partials/layout/header.html`;
   - keep `header.site-header` and `footer.site-footer`;
   - keep breadcrumbs as `nav aria-label="Хлебные крошки"`.

3. Add exactly one `<main>` where missing:
   - wrap the home page primary content in `Gemini/src/pages/index.html`;
   - wrap the ask form page primary content in `Gemini/src/pages/zadat-vopros.html`;
   - preserve existing classes and ids so CSS and scripts keep working.

4. Normalize home sections carefully:
   - do not replace `div` with `section` mechanically;
   - keep real standalone home blocks as `section`;
   - ensure each standalone `section` has a visible heading or an accessible heading association;
   - handle `#trust-section` explicitly.

5. Fix accessible names for form controls:
   - `#categoriesSearchInput` on home;
   - `#searchInput` on category;
   - `#sortSelect` on category;
   - use `label` or `aria-labelledby` when there is visible text; use `aria-label` only when needed to avoid visual changes.

6. Review heading structure:
   - exactly one `h1` per page;
   - `h2` for major page sections;
   - `h3` for cards/subsections under the nearest `h2`;
   - avoid changing visual style by preserving classes and adjusting CSS only if an element type change affects inherited styles.

7. Extend `Gemini/tools/verify-pages.mjs`:
   - one `<main>` per page;
   - presence of `header`, `main`, `footer`;
   - `header.site-header` and `footer.site-footer`;
   - no empty `aria-label`;
   - all visible `input`, `textarea`, and `select` controls have accessible names;
   - one `h1` per page;
   - repeated navigation landmarks have accessible names;
   - breadcrumbs stay `nav[aria-label="Хлебные крошки"]` when present;
   - existing text corruption checks remain active for question-mark runs, `U+FFFD`, and mojibake;
   - existing Playwright horizontal overflow check remains active.

8. Rebuild and verify:
   - `npm.cmd run gemini:build`
   - `npm.cmd run gemini:audit-css`
   - `npm.cmd run gemini:verify`
   - `git diff --check -- Gemini package.json`

9. Visual acceptance:
   - compare full-page screenshots desktop and mobile before/after;
   - confirm no visible content loss, header/footer shifts, broken mobile menu, broken form controls, or horizontal overflow;
   - keep screenshots/reports temporary unless explicitly asked to preserve them.

## Suggested acceptance criteria

- Every generated root HTML page has exactly one `<main>`.
- Every generated root HTML page has `header.site-header`, one `main`, and `footer.site-footer`.
- Header navigation has a clear accessible name.
- Breadcrumbs remain `<nav aria-label="Хлебные крошки">`.
- Article pages still use `<article>` for article content.
- Sidebars, TOC, author/review/disclaimer/relink widgets remain semantically appropriate; use `<aside>` only for complementary content.
- Home standalone blocks are real `section` elements only when they have an accessible heading.
- No empty `aria-label`.
- No visible form control lacks an accessible name.
- One `h1` per page and logical `h2/h3` progression.
- No extra ARIA replaces native semantics.
- `npm.cmd run gemini:build`, `npm.cmd run gemini:audit-css`, and `npm.cmd run gemini:verify` pass.
- Desktop/mobile visual screenshots show no design regression.

## Notes for the next agent

- Older modular-refactor notes are intentionally not part of this handoff. Treat this document plus the local `AGENTS.md` files as the current task source, and rerun gates after this task.
- `Gemini/README.md` and `Gemini/src/pages/README.md` are useful local orientation docs; PowerShell may display Cyrillic oddly depending on terminal encoding, but Node readback shows normal UTF-8 text.
- Keep the change scoped. This is not a redesign, not a CSS architecture refactor, and not a content rewrite.
