import { JSDOM, VirtualConsole } from 'jsdom';
import { Readability, isProbablyReaderable } from '@mozilla/readability';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

/**
 * Fetches a URL, extracts the article content using Readability, and converts it to Markdown.
 *
 * @param {string} url - HTTP/HTTPS URL to fetch.
 * @param {Object} [options]
 * @param {number} [options.timeout=15000] - Fetch timeout in milliseconds.
 * @param {string} [options.userAgent='Mozilla/5.0 (compatible; OpenClawBot/1.0)'] - User-Agent header.
 * @returns {Promise<{ title: string, content: string, author: string|null, excerpt: string|null, url: string }>}
 * @throws {Error} On HTTP error, timeout, non-HTML content, or unreadable page.
 */
export async function fetchUrl(url, options = {}) {
  const timeout = options.timeout ?? 15000;
  const userAgent = options.userAgent ?? 'Mozilla/5.0 (compatible; OpenClawBot/1.0)';

  let response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(timeout),
      redirect: 'follow',
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,*/*',
      },
    });
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      throw new Error('Fetch failed: timeout');
    }
    throw new Error(`Fetch failed: ${error.message}`);
  }

  if (!response.ok) {
    throw new Error(`Fetch failed: HTTP ${response.status}`);
  }

  // Check Content-Type
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
    throw new Error(`Unsupported content type: ${contentType}`);
  }

  const html = await response.text();
  const finalUrl = response.url || url;

  // Parse with JSDOM + Readability
  const virtualConsole = new VirtualConsole(); // suppress JSDOM noise
  const dom = new JSDOM(html, { url: finalUrl, virtualConsole });

  if (!isProbablyReaderable(dom.window.document)) {
    throw new Error('Content extraction failed: not a readable page');
  }

  const article = new Readability(dom.window.document).parse();

  if (!article || !article.content) {
    throw new Error('Content extraction failed: not a readable page');
  }

  // Convert HTML → Markdown
  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
  });
  turndown.use(gfm);
  const markdown = turndown.turndown(article.content);

  return {
    title: article.title || '',
    content: markdown,
    author: article.byline || null,
    excerpt: article.excerpt || null,
    url: finalUrl,
  };
}
