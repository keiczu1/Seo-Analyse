import { createServer } from 'node:http';
import { readFile, readdir, stat, mkdir, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const pagesPath = path.join(rootDir, 'src', 'data', 'pages.json');
const reportDir = path.join(rootDir, 'reports', 'refactor-smoke');
const buildScriptPath = path.join(rootDir, 'tools', 'build-pages.mjs');
const execFileAsync = promisify(execFile);

const widths = [1440, 768, 390];
const mobileMenuBreakpoint = 1024;
const textFileExtensions = new Set(['.css', '.html', '.js', '.json', '.mjs']);
const textCorruptionPatterns = [
  {
    label: 'replacement-character',
    pattern: /\uFFFD/u
  },
  {
    label: 'question-mark-run',
    pattern: /\?{3,}/u
  },
  {
    label: 'utf8-cp1251-mojibake',
    pattern: /[\u0420\u0421][\u00B0-\u00BF\u0402-\u040F\u0452-\u045F\u0491\u2018-\u201A\u201C-\u201E\u2020-\u2021\u2030\u2039]/u
  },
  {
    label: 'cp1251-punctuation-mojibake',
    pattern: /\u0432\u0402/u
  }
];

function contentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (filePath.endsWith('.png')) return 'image/png';
  if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) return 'image/jpeg';
  if (filePath.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return 'application/octet-stream';
}

function startServer() {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      const requested = url.pathname === '/' ? '/index.html' : url.pathname;
      const fullPath = path.resolve(rootDir, `.${decodeURIComponent(requested)}`);
      if (!fullPath.startsWith(rootDir)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      const fileStat = await stat(fullPath);
      if (!fileStat.isFile()) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const body = await readFile(fullPath);
      res.writeHead(200, { 'Content-Type': contentType(fullPath) });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function runBuild() {
  await execFileAsync(process.execPath, [buildScriptPath], { cwd: rootDir });
}

async function hashOutputs(pages) {
  const hash = createHash('sha256');
  for (const page of pages) {
    const html = await readFile(path.join(rootDir, page.output));
    hash.update(page.output);
    hash.update('\0');
    hash.update(html);
    hash.update('\0');
  }
  return hash.digest('hex');
}

function shouldSkipReference(value) {
  const trimmed = value.trim();
  return !trimmed
    || trimmed.includes('${')
    || trimmed.startsWith('#')
    || trimmed.startsWith('data:')
    || trimmed.startsWith('http://')
    || trimmed.startsWith('https://')
    || trimmed.startsWith('//')
    || trimmed.startsWith('mailto:')
    || trimmed.startsWith('tel:')
    || trimmed.startsWith('javascript:');
}

function shouldCheckReference(value) {
  const cleanValue = value.split('#')[0].split('?')[0];
  return /\.(?:css|js|png|jpe?g|webp|svg|ico|docx|pdf)$/i.test(cleanValue);
}

function resolveLocalReference(baseFilePath, value) {
  const cleanValue = value.split('#')[0].split('?')[0];
  if (cleanValue.startsWith('/')) {
    return path.resolve(rootDir, `.${cleanValue}`);
  }
  return path.resolve(path.dirname(baseFilePath), cleanValue);
}

async function fileExists(filePath) {
  try {
    const fileStat = await stat(filePath);
    return fileStat.isFile();
  } catch {
    return false;
  }
}

async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function collectReferences(filePath, text) {
  const references = [];
  const attrPattern = /\b(?:src|href)=["']([^"']+)["']/gi;
  const urlPattern = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;
  const jsAssetPattern = /["'`](assets\/[^"'`]+)["'`]/gi;
  const ext = path.extname(filePath).toLowerCase();

  let match;
  if (ext === '.html') {
    while ((match = attrPattern.exec(text)) !== null) {
      references.push({ filePath, baseFilePath: filePath, value: match[1] });
    }
  }
  if (ext === '.css') {
    while ((match = urlPattern.exec(text)) !== null) {
      references.push({ filePath, baseFilePath: filePath, value: match[1] });
    }
  }
  if (ext === '.js') {
    while ((match = jsAssetPattern.exec(text)) !== null) {
      references.push({ filePath, baseFilePath: path.join(rootDir, 'index.html'), value: match[1] });
    }
  }
  return references;
}

async function verifyMobileMenu(page, width) {
  if (width > mobileMenuBreakpoint) {
    return {
      checked: false,
      ok: true
    };
  }

  const hasToggle = await page.locator('.mobile-toggle').count();
  const hasNav = await page.locator('#headerNavRow').count();
  if (!hasToggle || !hasNav) {
    return {
      checked: true,
      ok: false,
      reason: 'missing mobile toggle or nav row'
    };
  }

  await page.locator('.mobile-toggle').click();
  await page.waitForTimeout(350);
  const opened = await page.evaluate(() => {
    const toggle = document.querySelector('.mobile-toggle');
    const nav = document.querySelector('#headerNavRow');
    if (!toggle || !nav) return false;
    const navRect = nav.getBoundingClientRect();
    const navStyle = window.getComputedStyle(nav);
    return toggle.classList.contains('active')
      && nav.classList.contains('active')
      && navStyle.display !== 'none'
      && navStyle.visibility !== 'hidden'
      && navRect.height > 0;
  });

  await page.locator('.mobile-toggle').click();
  await page.waitForTimeout(350);
  const closed = await page.evaluate(() => {
    const toggle = document.querySelector('.mobile-toggle');
    const nav = document.querySelector('#headerNavRow');
    return Boolean(toggle && nav && !toggle.classList.contains('active') && !nav.classList.contains('active'));
  });

  return {
    checked: true,
    ok: opened && closed,
    opened,
    closed
  };
}

async function verifyInteractiveFocus(page) {
  return page.evaluate(async () => {
    const selector = [
      '.hp-final-cta-btn',
      '.hp-consult-action-ask',
      '.hp-consult-action-read',
      '.hp-lawyer-link-profile',
      '.hp-lawyer-link-ask',
      '.hp-category-card-action',
      '.ask-submit',
      '.load-more-btn',
      '.category-filter-btn',
      '.mobile-toggle',
      'input',
      'textarea',
      'select',
      'button[type="submit"]'
    ].join(',');
    const isVisible = (element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0
        && rect.height > 0
        && style.display !== 'none'
        && style.visibility !== 'hidden'
        && style.opacity !== '0';
    };
    const textBoundsFor = (element) => {
      const range = document.createRange();
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          return node.nodeValue && node.nodeValue.trim()
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
        }
      });
      const rects = [];
      while (walker.nextNode()) {
        range.selectNodeContents(walker.currentNode);
        for (const rect of range.getClientRects()) {
          if (rect.width > 0 && rect.height > 0) {
            rects.push(rect);
          }
        }
      }
      range.detach();
      return rects;
    };
    const rectFits = (inner, outer) => (
      inner.left >= outer.left - 3
      && inner.right <= outer.right + 3
      && inner.top >= outer.top - 3
      && inner.bottom <= outer.bottom + 3
    );

    const issues = [];
    const elements = Array.from(document.querySelectorAll(selector)).filter(isVisible);
    const baseScrollWidth = document.documentElement.scrollWidth;

    for (const element of elements) {
      const label = [
        element.tagName.toLowerCase(),
        element.id ? `#${element.id}` : '',
        element.className && typeof element.className === 'string'
          ? `.${element.className.trim().split(/\s+/).slice(0, 3).join('.')}`
          : ''
      ].join('');

      element.focus({ preventScroll: true });
      await new Promise(resolve => requestAnimationFrame(resolve));

      const focusedRect = element.getBoundingClientRect();
      if (document.documentElement.scrollWidth > baseScrollWidth + 1) {
        issues.push({ element: label, reason: 'focus creates horizontal overflow' });
      }

      for (const rect of textBoundsFor(element)) {
        if (!rectFits(rect, focusedRect)) {
          issues.push({ element: label, reason: 'text escapes focused element bounds' });
          break;
        }
      }

      if (element.matches('a, button, .hp-final-cta-btn, .hp-consult-action-ask, .hp-consult-action-read')) {
        element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        await new Promise(resolve => requestAnimationFrame(resolve));
        const hoveredRect = element.getBoundingClientRect();
        if (document.documentElement.scrollWidth > baseScrollWidth + 1) {
          issues.push({ element: label, reason: 'hover creates horizontal overflow' });
        }
        for (const rect of textBoundsFor(element)) {
          if (!rectFits(rect, hoveredRect)) {
            issues.push({ element: label, reason: 'text escapes hovered element bounds' });
            break;
          }
        }
        element.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
      }
    }

    if (document.activeElement && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    return {
      ok: issues.length === 0,
      checked: elements.length,
      issues
    };
  });
}

async function verifySemanticStructure(page) {
  return page.evaluate(() => {
    const issues = [];
    const isVisible = (element) => {
      if (element instanceof HTMLInputElement && element.type === 'hidden') {
        return false;
      }
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0
        && rect.height > 0
        && style.display !== 'none'
        && style.visibility !== 'hidden';
    };
    const textFrom = (element) => (element?.textContent || '').replace(/\s+/g, ' ').trim();
    const nameFrom = (element) => {
      const ariaLabel = element.getAttribute('aria-label');
      if (ariaLabel && ariaLabel.trim()) {
        return ariaLabel.trim();
      }
      const labelledBy = element.getAttribute('aria-labelledby');
      if (labelledBy) {
        const label = labelledBy
          .split(/\s+/)
          .map((id) => textFrom(document.getElementById(id)))
          .filter(Boolean)
          .join(' ')
          .trim();
        if (label) {
          return label;
        }
      }
      if ('labels' in element && element.labels?.length) {
        const label = [...element.labels].map(textFrom).filter(Boolean).join(' ').trim();
        if (label) {
          return label;
        }
      }
      const title = element.getAttribute('title');
      return title?.trim() || '';
    };
    const labelFor = (element) => [
      element.tagName.toLowerCase(),
      element.id ? `#${element.id}` : '',
      element.className && typeof element.className === 'string'
        ? `.${element.className.trim().split(/\s+/).slice(0, 3).join('.')}`
        : ''
    ].join('');

    document.querySelectorAll('[aria-label]').forEach((element) => {
      if (!element.getAttribute('aria-label')?.trim()) {
        issues.push({ element: labelFor(element), reason: 'empty aria-label' });
      }
    });

    const mainCount = document.querySelectorAll('main').length;
    if (mainCount !== 1) {
      issues.push({ element: 'main', reason: `expected exactly one main landmark, found ${mainCount}` });
    }
    if (!document.querySelector('header.site-header')) {
      issues.push({ element: 'header.site-header', reason: 'missing site header landmark' });
    }
    if (!document.querySelector('footer.site-footer')) {
      issues.push({ element: 'footer.site-footer', reason: 'missing site footer landmark' });
    }

    const h1Count = document.querySelectorAll('h1').length;
    if (h1Count !== 1) {
      issues.push({ element: 'h1', reason: `expected exactly one h1, found ${h1Count}` });
    }

    const controls = [...document.querySelectorAll('input, textarea, select')].filter(isVisible);
    controls.forEach((control) => {
      if (!nameFrom(control)) {
        issues.push({ element: labelFor(control), reason: 'visible form control has no accessible name' });
      }
    });

    const navs = [...document.querySelectorAll('nav')].filter(isVisible);
    if (navs.length > 1) {
      navs.forEach((nav) => {
        if (!nameFrom(nav)) {
          issues.push({ element: labelFor(nav), reason: 'repeated navigation landmark has no accessible name' });
        }
      });
    }

    const breadcrumb = document.querySelector('.breadcrumbs');
    if (breadcrumb && !document.querySelector('nav.breadcrumbs[aria-label="Хлебные крошки"]')) {
      issues.push({ element: '.breadcrumbs', reason: 'breadcrumbs must remain a named nav landmark' });
    }

    document.querySelectorAll('section').forEach((section) => {
      if (!section.querySelector('h1, h2, h3, h4, h5, h6') && !nameFrom(section)) {
        issues.push({ element: labelFor(section), reason: 'section has no heading or accessible name' });
      }
      const headings = [...section.querySelectorAll('h1, h2, h3, h4, h5, h6')]
        .filter((heading) => !heading.closest('aside, footer, header, nav'));
      headings.reduce((previousLevel, heading) => {
        const currentLevel = Number(heading.tagName.slice(1));
        if (previousLevel && currentLevel > previousLevel + 1) {
          issues.push({
            element: labelFor(heading),
            reason: `heading level skips from h${previousLevel} to h${currentLevel}`
          });
        }
        return currentLevel;
      }, 0);
    });

    return {
      ok: issues.length === 0,
      mainCount,
      h1Count,
      navCount: navs.length,
      checkedControlCount: controls.length,
      issues
    };
  });
}

async function verifyLocalReferences(pages) {
  const filesToScan = new Set();
  for (const page of pages) {
    filesToScan.add(path.join(rootDir, page.output));
    for (const stylePath of page.styles || []) {
      filesToScan.add(path.join(rootDir, stylePath));
    }
    for (const scriptPath of page.scripts || []) {
      filesToScan.add(path.join(rootDir, scriptPath));
    }
  }

  const failures = [];
  for (const filePath of filesToScan) {
    const text = await readFile(filePath, 'utf8');
    for (const reference of collectReferences(filePath, text)) {
      if (shouldSkipReference(reference.value)) {
        continue;
      }
      if (!shouldCheckReference(reference.value)) {
        continue;
      }
      const targetPath = resolveLocalReference(reference.baseFilePath, reference.value);
      if (!targetPath.startsWith(rootDir) || !(await fileExists(targetPath))) {
        failures.push({
          file: path.relative(rootDir, filePath).replace(/\\/g, '/'),
          value: reference.value,
          resolved: path.relative(rootDir, targetPath).replace(/\\/g, '/')
        });
      }
    }
  }

  return {
    ok: failures.length === 0,
    failures
  };
}

async function listTextFilesRecursive(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listTextFilesRecursive(fullPath));
      continue;
    }
    if (entry.isFile() && textFileExtensions.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }
  return files;
}

async function verifyNoTextCorruption(pages) {
  const filesToScan = new Set();
  for (const page of pages) {
    filesToScan.add(path.join(rootDir, page.output));
  }
  for (const directory of ['src', 'scripts', 'styles', 'tools']) {
    const directoryPath = path.join(rootDir, directory);
    if (await pathExists(directoryPath)) {
      for (const filePath of await listTextFilesRecursive(directoryPath)) {
        filesToScan.add(filePath);
      }
    }
  }

  const failures = [];
  for (const filePath of filesToScan) {
    const text = await readFile(filePath, 'utf8');
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const { label, pattern } of textCorruptionPatterns) {
        if (pattern.test(line)) {
          failures.push({
            file: path.relative(rootDir, filePath).replace(/\\/g, '/'),
            line: index + 1,
            pattern: label,
            snippet: line.trim().slice(0, 160)
          });
          break;
        }
      }
    });
  }

  return {
    ok: failures.length === 0,
    failures
  };
}

async function verifyBuildIdempotency(pages) {
  await runBuild();
  const firstHash = await hashOutputs(pages);
  await runBuild();
  const secondHash = await hashOutputs(pages);
  return {
    ok: firstHash === secondHash,
    firstHash,
    secondHash
  };
}

const pages = JSON.parse(await readFile(pagesPath, 'utf8'));
const idempotency = await verifyBuildIdempotency(pages);
const localReferences = await verifyLocalReferences(pages);
const textCorruption = await verifyNoTextCorruption(pages);
const server = await startServer();
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}`;
const browser = await chromium.launch();
const results = [];
let failed = false;

try {
  for (const pageMeta of pages) {
    for (const width of widths) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const consoleErrors = [];
      page.on('console', (message) => {
        if (message.type() === 'error') {
          consoleErrors.push(message.text());
        }
      });
      await page.route('**/*', async (route) => {
        const requestUrl = new URL(route.request().url());
        if (requestUrl.origin !== baseUrl) {
          await route.fulfill({ status: 204, body: '' });
          return;
        }
        await route.continue();
      });
      const response = await page.goto(`${baseUrl}${pageMeta.route}`, { waitUntil: 'networkidle' });
      const status = response?.status() || 0;
      const mobileMenu = await verifyMobileMenu(page, width);
      const interactiveFocus = await verifyInteractiveFocus(page);
      const semanticStructure = await verifySemanticStructure(page);
      const metrics = await page.evaluate(() => ({
        title: document.title,
        overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        footerVisible: Boolean(document.querySelector('.site-footer')),
        mobileToggleVisible: Boolean(document.querySelector('.mobile-toggle')),
        bodyWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth
      }));
      const ok = status >= 200
        && status < 400
        && !metrics.overflowX
        && metrics.footerVisible
        && mobileMenu.ok
        && interactiveFocus.ok
        && semanticStructure.ok
        && consoleErrors.length === 0;
      if (!ok) {
        failed = true;
      }
      results.push({
        page: pageMeta.output,
        route: pageMeta.route,
        width,
        status,
        ok,
        ...metrics,
        mobileMenu,
        interactiveFocus,
        semanticStructure,
        consoleErrors
      });
      await page.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}

await mkdir(reportDir, { recursive: true });
const summary = {
  idempotency,
  localReferences,
  textCorruption,
  pages: results
};

await writeFile(path.join(reportDir, 'latest-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));

if (failed || !idempotency.ok || !localReferences.ok || !textCorruption.ok) {
  process.exit(1);
}
