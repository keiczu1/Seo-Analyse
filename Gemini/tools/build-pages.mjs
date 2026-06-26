import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const pagesDir = path.join(srcDir, 'pages');
const partialsDir = path.join(srcDir, 'partials');
const dataDir = path.join(srcDir, 'data');
const pagesPath = path.join(dataDir, 'pages.json');

const includePattern = /<!--\s*@include\s+([^\s]+)\s*-->/g;
const renderPattern = /<!--\s*@render\s+([^\s]+)\s*-->/g;

function normalizeSlash(value) {
  return value.replace(/\\/g, '/');
}

async function readUtf8(filePath) {
  return readFile(filePath, 'utf8');
}

async function readJson(fileName) {
  return JSON.parse(await readUtf8(path.join(dataDir, fileName)));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderLinkAttributes(link) {
  const attributes = [`href="${escapeHtml(link.href)}"`];
  if (link.wpelLink) {
    attributes.push(`data-wpel-link="${escapeHtml(link.wpelLink)}"`);
  }
  return attributes.join(' ');
}

function renderPlainLink(link) {
  return `<a ${renderLinkAttributes(link)}>${escapeHtml(link.label)}</a>`;
}

function renderNavItem(item) {
  const hasChildren = Array.isArray(item.groups) && item.groups.length > 0;
  const classes = [
    'menu-item',
    'menu-item-type-custom',
    'menu-item-object-custom',
    hasChildren ? 'menu-item-has-children' : ''
  ].filter(Boolean).join(' ');
  const topLink = `<a ${renderLinkAttributes(item)}><span class="icon_text">${escapeHtml(item.label)}</span></a>`;
  if (!hasChildren) {
    return `            <li class="${classes}">\n              ${topLink}\n            </li>`;
  }
  const groups = item.groups.map((group) => {
    const links = group.map((link) => `                  <li>${renderPlainLink(link)}</li>`).join('\n');
    return `                <ul>\n${links}\n                </ul>`;
  }).join('\n');
  return [
    `            <li class="${classes}">`,
    `              ${topLink}`,
    '              <span class="arrow"></span>',
    '              <div class="sub">',
    groups,
    '              </div>',
    '            </li>'
  ].join('\n');
}

function renderNavPrimary(data) {
  return data.primary.map(renderNavItem).join('\n');
}

function renderFooterLinkList(links, listClass = '') {
  const classAttribute = listClass ? ` class="${listClass}"` : '';
  const items = links.map((link) => `          <li>${renderPlainLink(link)}</li>`).join('\n');
  return `        <ul${classAttribute}>\n${items}\n        </ul>`;
}

function renderFooterColumns(data) {
  return data.columns.map((column) => [
    '      <div class="footer-col footer-links">',
    `        <h4>${escapeHtml(column.title)}</h4>`,
    renderFooterLinkList(column.links),
    '      </div>'
  ].join('\n')).join('\n\n');
}

function renderFooterLegal(data) {
  return [
    `        <h4>${escapeHtml(data.legal.title)}</h4>`,
    renderFooterLinkList(data.legal.links, 'footer-legal-list')
  ].join('\n');
}

function renderPageBreadcrumbs(page) {
  if (!Array.isArray(page.breadcrumbs) || page.breadcrumbs.length === 0) {
    return '';
  }
  const items = page.breadcrumbs.map((item, index) => {
    const isLast = index === page.breadcrumbs.length - 1 || item.current;
    const content = isLast
      ? `<li aria-current="page" class="current">${escapeHtml(item.label)}</li>`
      : `<li><a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a></li>`;
    if (index === 0) {
      return `      ${content}`;
    }
    return `      <li class="separator">›</li>\n      ${content}`;
  }).join('\n');
  return [
    '  <nav class="breadcrumbs" aria-label="Хлебные крошки">',
    '    <ol class="breadcrumbs-list">',
    items,
    '    </ol>',
    '  </nav>'
  ].join('\n');
}

function renderHomeCategoryCard(card) {
  const questions = card.questions.map((question) => `        <li>${escapeHtml(question)}</li>`).join('\n');
  return [
    `      <a href="${escapeHtml(card.href)}" class="hp-category-card hp-reveal" data-category="${escapeHtml(card.key)}">`,
    '        <div class="hp-category-card-header">',
    '          <div class="hp-category-icon-wrapper">',
    card.iconHtml.split('\n').map((line) => `            ${line}`).join('\n'),
    '          </div>',
    `          <h3>${escapeHtml(card.title)}</h3>`,
    '        </div>',
    '        <ul class="hp-category-questions">',
    questions,
    '        </ul>',
    '        <div class="hp-category-card-action">',
    `          <span>${escapeHtml(card.actionLabel)}</span>`,
    '          <svg class="hp-category-action-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16">',
    '            <line x1="5" y1="12" x2="19" y2="12"></line>',
    '            <polyline points="12 5 19 12 12 19"></polyline>',
    '          </svg>',
    '        </div>',
    '      </a>'
  ].join('\n');
}

function renderHomeCategories(data) {
  return data.cards.map(renderHomeCategoryCard).join('\n\n');
}

function renderCheckSvg() {
  return [
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="12" height="12">',
    '              <polyline points="20 6 9 17 4 12"></polyline>',
    '            </svg>'
  ].join('\n');
}

function renderStarSvg() {
  return '<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>';
}

function renderQuoteSvg() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
}

function renderLawyerArrowSvg() {
  return [
    '<svg class="hp-lawyer-link-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14">',
    '              <line x1="5" y1="12" x2="19" y2="12"></line>',
    '              <polyline points="12 5 19 12 12 19"></polyline>',
    '            </svg>'
  ].join('\n');
}

function renderHomeLawyerCard(lawyer) {
  const categories = Array.isArray(lawyer.categories) ? lawyer.categories.join(' ') : '';
  const stars = Array.from({ length: 5 }, () => `            ${renderStarSvg()}`).join('\n');
  const stats = lawyer.stats.map((stat) => [
    '          <li class="hp-lawyer-stat-item">',
    `            <span class="hp-lawyer-stat-label">${escapeHtml(stat.label)}</span>`,
    `            ${escapeHtml(stat.value)}`,
    '          </li>'
  ].join('\n')).join('\n');
  const checkSvg = renderCheckSvg().split('\n').map((line) => `            ${line}`).join('\n');
  const profileArrowSvg = renderLawyerArrowSvg().split('\n').map((line) => `            ${line}`).join('\n');
  const askArrowSvg = renderLawyerArrowSvg().split('\n').map((line) => `            ${line}`).join('\n');

  return [
    `      <div class="hp-lawyer-card hp-reveal" data-categories="${escapeHtml(categories)}">`,
    '        <div class="hp-lawyer-card-top">',
    '          <div class="hp-lawyer-avatar-container">',
    `            <img src="${escapeHtml(lawyer.image.src)}" alt="${escapeHtml(lawyer.image.alt)}" class="hp-lawyer-avatar">`,
    `            <span class="hp-lawyer-status-indicator ${escapeHtml(lawyer.availability.className)}" title="${escapeHtml(lawyer.availability.title)}"></span>`,
    '          </div>',
    '          <div class="hp-lawyer-header-info">',
    '            <div class="hp-lawyer-meta-tags">',
    `              <span class="hp-lawyer-status">${escapeHtml(lawyer.badge)}</span>`,
    `              <span class="hp-lawyer-verified-tag" title="${escapeHtml(lawyer.verified.title)}">`,
    checkSvg,
    `                ${escapeHtml(lawyer.verified.label)}`,
    '              </span>',
    '            </div>',
    `            <h3 class="hp-lawyer-name">${escapeHtml(lawyer.name)}</h3>`,
    '            <div class="hp-lawyer-city-row">',
    '              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>',
    `              <span>${escapeHtml(lawyer.city)}</span>`,
    '            </div>',
    '          </div>',
    '        </div>',
    '',
    '        <div class="hp-lawyer-rating-row">',
    '          <div class="hp-lawyer-stars">',
    stars,
    '          </div>',
    `          <span class="hp-lawyer-rating-val">${escapeHtml(lawyer.rating)}</span>`,
    `          <span class="hp-lawyer-reviews-count">${escapeHtml(lawyer.reviewsText)}</span>`,
    '        </div>',
    '',
    `        <p class="hp-lawyer-desc">${escapeHtml(lawyer.description)}</p>`,
    '',
    '        <ul class="hp-lawyer-stats-list">',
    stats,
    '        </ul>',
    '',
    '        <div class="hp-lawyer-micro-review">',
    `          ${renderQuoteSvg()}`,
    `          <span>${lawyer.microReviewHtml}</span>`,
    '        </div>',
    '',
    '        <div class="hp-lawyer-actions-links">',
    `          <a href="${escapeHtml(lawyer.profileLink.href)}" class="hp-lawyer-link-profile">`,
    `            <span>${escapeHtml(lawyer.profileLink.label)}</span>`,
    profileArrowSvg,
    '          </a>',
    `          <a href="${escapeHtml(lawyer.askLink.href)}" class="hp-lawyer-link-ask" data-category="${escapeHtml(lawyer.askLink.category)}">`,
    `            <span>${escapeHtml(lawyer.askLink.label)}</span>`,
    askArrowSvg,
    '          </a>',
    '        </div>',
    '      </div>'
  ].join('\n');
}

function renderHomeLawyers(data) {
  return data.lawyers.map(renderHomeLawyerCard).join('\n\n');
}

function renderDataTokens(html, siteData, page) {
  return html.replaceAll(renderPattern, (_, token) => {
    switch (token) {
      case 'nav.primary':
        return renderNavPrimary(siteData.navLinks);
      case 'footer.columns':
        return renderFooterColumns(siteData.footerLinks);
      case 'footer.legal':
        return renderFooterLegal(siteData.footerLinks);
      case 'home.categories':
        return renderHomeCategories(siteData.categories);
      case 'home.lawyers':
        return renderHomeLawyers(siteData.lawyers);
      case 'page.breadcrumbs':
        return renderPageBreadcrumbs(page);
      default:
        if (token.startsWith('page.')) {
          return _;
        }
        throw new Error(`Unknown render token: ${token}`);
    }
  });
}

async function renderIncludes(html, stack = []) {
  return html.replaceAll(includePattern, (_, includePath) => {
    const normalized = normalizeSlash(includePath);
    const fullPath = path.resolve(partialsDir, normalized);
    if (!fullPath.startsWith(partialsDir)) {
      throw new Error(`Include escapes partials directory: ${includePath}`);
    }
    if (stack.includes(fullPath)) {
      throw new Error(`Circular include: ${[...stack, fullPath].join(' -> ')}`);
    }
    return `%%INCLUDE:${fullPath}%%`;
  });
}

async function resolveIncludeTokens(html, stack = []) {
  let rendered = await renderIncludes(html, stack);
  const tokenPattern = /%%INCLUDE:([^%]+)%%/g;
  let match;
  while ((match = tokenPattern.exec(rendered)) !== null) {
    const fullPath = match[1];
    const partial = await readUtf8(fullPath);
    const resolved = await resolveIncludeTokens(partial, [...stack, fullPath]);
    rendered = rendered.replace(match[0], resolved);
    tokenPattern.lastIndex = 0;
  }
  return rendered;
}

function syncStyles(html, styles) {
  const styleTokenPattern = /^[ \t]*<!--\s*@render\s+page\.styles\s*-->[ \t]*\r?\n?/im;
  if (!Array.isArray(styles) || styles.length === 0) {
    return html
      .replace(/^[ \t]*<link\b(?=[^>]*\brel=["']stylesheet["'])[^>]*>[ \t]*\r?\n?/gim, '')
      .replace(styleTokenPattern, '');
  }
  const next = html.replace(/^[ \t]*<link\b(?=[^>]*\brel=["']stylesheet["'])[^>]*>[ \t]*\r?\n?/gim, '');
  const linkTags = styles.map((href) => `  <link rel="stylesheet" href="${href}">`).join('\n');
  if (styleTokenPattern.test(next)) {
    return next.replace(styleTokenPattern, `${linkTags}\n`);
  }
  return next.replace(/<\/head>/i, `${linkTags}\n</head>`);
}

function ensureNoindex(html, page) {
  if (!page.noindex) {
    return html;
  }
  if (/name=["']robots["']/i.test(html)) {
    return html.replace(/<meta[^>]+name=["']robots["'][^>]*>/i, '<meta name="robots" content="noindex, nofollow">');
  }
  return html.replace(/<\/head>/i, '  <meta name="robots" content="noindex, nofollow">\n</head>');
}

function ensureScripts(html, scripts) {
  if (!Array.isArray(scripts) || scripts.length === 0) {
    return html;
  }
  let next = html;
  for (const src of scripts) {
    const escaped = src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existing = new RegExp(`<script[^>]+src=["']${escaped}(?:\\?[^"']*)?["'][^>]*></script>`);
    if (existing.test(next)) {
      continue;
    }
    const scriptTag = `  <script src="${src}"></script>`;
    if (/<\/body>/i.test(next)) {
      next = next.replace(/\n?\s*<\/body>/i, `\n${scriptTag}\n</body>`);
    } else {
      next += `\n${scriptTag}\n`;
    }
  }
  return next;
}

async function main() {
  const pages = JSON.parse(await readUtf8(pagesPath));
  const siteData = {
    navLinks: await readJson('nav-links.json'),
    footerLinks: await readJson('footer-links.json'),
    categories: await readJson('categories.json'),
    lawyers: await readJson('lawyers.json')
  };
  for (const page of pages) {
    for (const field of ['source', 'output', 'route', 'layout', 'title', 'styles', 'scripts', 'public', 'noindex', 'sitemap']) {
      if (!(field in page)) {
        throw new Error(`Missing required page field "${field}" in ${JSON.stringify(page)}`);
      }
    }

    const sourcePath = path.resolve(pagesDir, page.source);
    const outputPath = path.resolve(rootDir, page.output);
    if (!sourcePath.startsWith(pagesDir)) {
      throw new Error(`Page source escapes pages directory: ${page.source}`);
    }
    if (!outputPath.startsWith(rootDir)) {
      throw new Error(`Page output escapes Gemini directory: ${page.output}`);
    }

    let html = await readUtf8(sourcePath);
    html = await resolveIncludeTokens(html);
    html = renderDataTokens(html, siteData, page);
    html = syncStyles(html, page.styles);
    html = ensureNoindex(html, page);
    html = ensureScripts(html, page.scripts);

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, html);
    console.log(`built ${normalizeSlash(path.relative(rootDir, outputPath))}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
