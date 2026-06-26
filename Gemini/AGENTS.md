# Gemini agent notes

## Main rule

Do not turn this project back into one large hand-edited HTML page.

`Gemini/src/pages/*.html` are page templates. They are the source layer for page content and structure.

The root files such as `Gemini/index.html`, `Gemini/category-divorce.html`, and `Gemini/article-divorce-without-consent.html` are generated browser entry points. They can be inspected, but persistent edits should be made in the source layer and rebuilt.

## How to work here

For page content and structure:

- edit `src/pages/*.html`;
- use `src/partials/` for shared header, footer, head, modals, breadcrumbs, and article blocks;
- use `src/data/` for repeated navigation/footer/page metadata;
- rebuild with `npm.cmd run gemini:build`.

For styles:

- edit files under `styles/`;
- keep ownership boundaries: header in `styles/04-header.css`, footer in `styles/05-footer.css`, page-specific rules in `styles/pages/`, reusable components in `styles/components/`;
- do not add permanent layout styles as inline `style` attributes or `<style>` blocks in generated HTML.

For scripts:

- edit files under `scripts/`;
- keep shared behavior in `scripts/components/` or `scripts/core/`;
- keep page-specific behavior in `scripts/pages/`.

For generated artifacts:

- `reports/` is temporary output and ignored;
- visual screenshots, smoke reports, and comparison JSON files should not be kept as source files;
- do not commit or preserve temporary review dumps unless the user explicitly asks.

## What to open in a browser

Open generated files from the root of `Gemini/`, for example:

```text
Gemini/index.html
Gemini/category-divorce.html
Gemini/article-divorce-without-consent.html
```

Do not open `Gemini/src/pages/index.html` directly. It contains build directives such as `@include` and `@render`, so it will look unstyled and incomplete in a browser.

## Verification

After source changes, run from repository root:

```powershell
npm.cmd run gemini:build
npm.cmd run gemini:audit-css
npm.cmd run gemini:verify
```

If `gemini:verify` creates `Gemini/reports/`, treat it as temporary output.

## Context7

When changing semantic HTML, accessibility, forms, or landmark structure, use Context7 first:

- MDN docs: `/mdn/content`
- WCAG 2.2 docs: `/websites/w3_wai_wcag22`

Keep native HTML semantics where possible. Do not add ARIA roles when a native element already provides the correct semantics.
