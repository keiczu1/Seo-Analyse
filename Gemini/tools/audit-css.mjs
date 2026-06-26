import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const cssFiles = [
  'styles/main.css',
  'styles/00-tokens.css',
  'styles/01-reset.css',
  'styles/02-base.css',
  'styles/03-layout.css',
  'styles/04-header.css',
  'styles/05-footer.css',
  'styles/06-forms.css',
  'styles/components/buttons.css',
  'styles/components/cards.css',
  'styles/components/article-link.css',
  'styles/components/summary-card.css',
  'styles/components/tables.css',
  'styles/components/toc.css',
  'styles/components/documents.css',
  'styles/components/callouts.css',
  'styles/components/process-blocks.css',
  'styles/components/legal-blocks.css',
  'styles/components/choice-cards.css',
  'styles/components/faq.css',
  'styles/components/author-review.css',
  'styles/components/relink.css',
  'styles/components/modals.css',
  'styles/pages/home.css',
  'styles/pages/article.css',
  'styles/pages/category.css',
  'styles/pages/ask-form.css',
  'styles/pages/ui-kit.css',
  'styles/utilities/responsive.css',
  'styles/utilities/visibility.css'
];

const componentOwnerRules = [
  {
    owner: 'styles/components/summary-card.css',
    pattern: /\.summary-card(?![-\w])/,
    label: 'summary-card'
  },
  {
    owner: 'styles/components/tables.css',
    pattern: /\.(?:table-container|table-wide|risk-table)(?![-\w])/,
    label: 'tables'
  },
  {
    owner: 'styles/components/toc.css',
    pattern: /\.(?:toc|toc-sidebar)(?![-\w])/,
    label: 'toc'
  },
  {
    owner: 'styles/components/documents.css',
    pattern: /\.(?:doc-template|doc-header|doc-header-left|doc-badge|doc-body|doc-footer|doc-meta-header|doc-title-main|doc-title-request|doc-content-text|doc-signature|doc-download-block|download-preview-section|preview-group|preview-group--spaced|preview-title)(?![-\w])/,
    label: 'documents'
  },
  {
    owner: 'styles/components/callouts.css',
    pattern: /\.callout(?:-|$|\s|[.:#{>,+~[])/,
    label: 'callouts'
  },
  {
    owner: 'styles/components/process-blocks.css',
    pattern: /\.(?:steps|checklist|timeline)(?![-\w])/,
    label: 'process-blocks'
  },
  {
    owner: 'styles/components/legal-blocks.css',
    pattern: /\.(?:disclaimer|court-practice|practice-case|risk-high|risk-medium|risk-low|law-base|case|scenario)(?![-\w])/,
    label: 'legal-blocks'
  },
  {
    owner: 'styles/components/choice-cards.css',
    pattern: /\.choice-cards(?![-\w])/,
    label: 'choice-cards'
  },
  {
    owner: 'styles/components/author-review.css',
    pattern: /\.auth-v9-/,
    label: 'author-review'
  },
  {
    owner: 'styles/components/modals.css',
    pattern: /\.hp-modal-/,
    label: 'modals'
  }
];

async function exists(filePath) {
  try {
    await readFile(filePath, 'utf8');
    return true;
  } catch {
    return false;
  }
}

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function getCurrentContext(stack) {
  return stack
    .filter((item) => item.type === 'at-rule')
    .map((item) => item.name)
    .join(' > ') || 'root';
}

function getLineNumber(value, index) {
  return value.slice(0, index).split(/\r?\n/).length;
}

function addSelectorContext(selectors, selector, context, line) {
  const contexts = selectors.get(selector) || new Map();
  const entry = contexts.get(context) || { count: 0, lines: [] };
  entry.count += 1;
  entry.lines.push(line);
  contexts.set(context, entry);
  selectors.set(selector, contexts);
}

function collectSelectors(css) {
  const selectors = new Map();
  const cleanCss = stripComments(css);
  const stack = [];
  let blockStart = 0;

  for (let index = 0; index < cleanCss.length; index += 1) {
    const char = cleanCss[index];
    if (char === '}') {
      stack.pop();
      blockStart = index + 1;
      continue;
    }
    if (char !== '{') {
      continue;
    }

    const raw = cleanCss.slice(blockStart, index).trim();
    blockStart = index + 1;
    if (!raw) {
      stack.push({ type: 'rule' });
      continue;
    }
    if (raw.startsWith('@')) {
      stack.push({ type: 'at-rule', name: raw.replace(/\s+/g, ' ') });
      continue;
    }

    const context = getCurrentContext(stack);
    const line = getLineNumber(cleanCss, index);
    stack.push({ type: 'rule' });
    if (raw.includes('%') || raw.startsWith('from') || raw.startsWith('to')) {
      continue;
    }
    for (const selector of raw.split(',').map((item) => item.trim()).filter(Boolean)) {
      addSelectorContext(selectors, selector, context, line);
    }
  }
  return selectors;
}

function summarizeSelectorContexts(contexts) {
  const result = {};
  for (const [context, entry] of contexts) {
    result[context] = entry;
  }
  return result;
}

function countSelectorContexts(contexts) {
  return [...contexts.values()].reduce((total, entry) => total + entry.count, 0);
}

function hasRepeatedSelectorContext(owner) {
  return Object.values(owner.contexts).some((entry) => entry.count > 1);
}

async function listHtmlFiles() {
  const entries = await readdir(rootDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) => entry.name);
}

async function listFilesRecursive(directory, extension) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFilesRecursive(fullPath, extension));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(extension)) {
      files.push(path.relative(rootDir, fullPath).replace(/\\/g, '/'));
    }
  }
  return files;
}

const selectorOwners = new Map();
const forbiddenFooterOwners = [];
const forbiddenHeaderOwners = [];
const componentOwnerViolations = [];

for (const relative of cssFiles) {
  const fullPath = path.join(rootDir, relative);
  if (!(await exists(fullPath))) {
    continue;
  }
  const css = await readFile(fullPath, 'utf8');
  const cssWithoutComments = stripComments(css);
  const selectors = collectSelectors(css);
  for (const [selector, contexts] of selectors) {
    const ownerList = selectorOwners.get(selector) || [];
    ownerList.push({
      file: relative,
      count: countSelectorContexts(contexts),
      contexts: summarizeSelectorContexts(contexts)
    });
    selectorOwners.set(selector, ownerList);
  }
  if (relative !== 'styles/05-footer.css' && /\.(?:site-footer|footer-|hp-footer)/.test(css)) {
    forbiddenFooterOwners.push(relative);
  }
  if (relative !== 'styles/04-header.css' && /\.(?:site-header|header-|top_menu|mobile-toggle)|\.hp-header/.test(css)) {
    forbiddenHeaderOwners.push(relative);
  }
  for (const rule of componentOwnerRules) {
    if (relative !== rule.owner && rule.pattern.test(cssWithoutComments)) {
      componentOwnerViolations.push({
        component: rule.label,
        expectedOwner: rule.owner,
        foundIn: relative
      });
    }
  }
}

const duplicateSelectors = [...selectorOwners.entries()]
  .filter(([, owners]) => owners.length > 1 || owners.some(hasRepeatedSelectorContext))
  .sort((a, b) => a[0].localeCompare(b[0]));
const crossFileDuplicateSelectors = duplicateSelectors
  .filter(([, owners]) => owners.length > 1);
const internalDuplicateSelectors = duplicateSelectors
  .filter(([, owners]) => owners.some(hasRepeatedSelectorContext));

const htmlFiles = await listHtmlFiles();
let inlineStyleCount = 0;
let styleBlockCount = 0;
for (const file of htmlFiles) {
  const html = await readFile(path.join(rootDir, file), 'utf8');
  inlineStyleCount += (html.match(/\sstyle="/g) || []).length;
  styleBlockCount += (html.match(/<style[\s>]/g) || []).length;
}

const scriptFiles = await listFilesRecursive(path.join(rootDir, 'scripts'), '.js');
let scriptInlineStyleTemplateCount = 0;
for (const file of scriptFiles) {
  const js = await readFile(path.join(rootDir, file), 'utf8');
  scriptInlineStyleTemplateCount += (js.match(/\sstyle=["'`]/g) || []).length;
}

console.log(JSON.stringify({
  cssFiles,
  duplicateSelectorCount: duplicateSelectors.length,
  internalDuplicateSelectorCount: internalDuplicateSelectors.length,
  crossFileDuplicateSelectorCount: crossFileDuplicateSelectors.length,
  duplicateSelectors: duplicateSelectors.slice(0, 50).map(([selector, owners]) => ({ selector, owners })),
  crossFileDuplicateSelectors: crossFileDuplicateSelectors.map(([selector, owners]) => ({ selector, owners })),
  inlineStyleCount,
  scriptInlineStyleTemplateCount,
  styleBlockCount,
  forbiddenFooterOwners,
  forbiddenHeaderOwners,
  componentOwnerViolations
}, null, 2));

if (forbiddenFooterOwners.length > 0) {
  console.error(`Footer selectors must be owned by styles/05-footer.css only: ${forbiddenFooterOwners.join(', ')}`);
  process.exit(1);
}

if (forbiddenHeaderOwners.length > 0) {
  console.error(`Header selectors must be owned by styles/04-header.css only: ${forbiddenHeaderOwners.join(', ')}`);
  process.exit(1);
}

if (crossFileDuplicateSelectors.length > 0) {
  console.error(`Selectors must have one CSS owner: ${crossFileDuplicateSelectors.map(([selector]) => selector).join(', ')}`);
  process.exit(1);
}

if (componentOwnerViolations.length > 0) {
  console.error(`Component selectors must stay in their component CSS files: ${componentOwnerViolations.map((violation) => `${violation.component} in ${violation.foundIn}`).join(', ')}`);
  process.exit(1);
}

if (styleBlockCount > 0) {
  console.error(`Permanent layout styles must live in CSS modules, found ${styleBlockCount} <style> blocks in generated HTML.`);
  process.exit(1);
}

if (inlineStyleCount > 0) {
  console.error(`Permanent layout styles must live in CSS modules, found ${inlineStyleCount} inline style attributes in generated HTML.`);
  process.exit(1);
}

if (scriptInlineStyleTemplateCount > 0) {
  console.error(`Permanent layout styles must live in CSS modules, found ${scriptInlineStyleTemplateCount} inline style attributes in JS templates.`);
  process.exit(1);
}
