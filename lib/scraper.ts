// ─── Article Scraping Utility ──────────────────────────────────────────────────
// Server-side only. Fetches a URL and extracts the main article text using Cheerio.

import * as cheerio from 'cheerio';

const FETCH_TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5 MB

/** Elements that are never part of article body */
const NOISE_SELECTORS = [
  'script', 'style', 'noscript', 'iframe', 'svg',
  'nav', 'header', 'footer', 'aside',
  '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
  '[role="complementary"]',
  '.sidebar', '.nav', '.navbar', '.menu', '.footer', '.header',
  '.cookie-banner', '.cookie-consent', '.cookies',
  '.advertisement', '.ad', '.ads', '.adsbygoogle',
  '.social-share', '.share-buttons', '.sharing',
  '.comments', '.comment-section', '#comments',
  '.related-posts', '.recommended', '.read-more',
  '.newsletter-signup', '.subscribe', '.popup', '.modal',
].join(', ');

/** Selectors likely to contain the main article content, in priority order */
const ARTICLE_SELECTORS = [
  'article',
  '[role="main"] article',
  'main article',
  '[role="main"]',
  'main',
  '.post-content', '.article-content', '.entry-content',
  '.post-body', '.article-body', '.story-body',
  '.content', '#content', '.post',
];

export interface ScrapeResult {
  title: string;
  text: string;
  wordCount: number;
}

/**
 * Validate and normalise a URL string.
 * Throws if the URL is malformed or not http(s).
 */
function validateUrl(raw: string): URL {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error('URL is required.');

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error('Invalid URL format. Please enter a complete URL starting with https://');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Only http:// and https:// URLs are supported.');
  }

  return url;
}

/**
 * Fetch the HTML content of a URL with timeout and size limits.
 */
async function fetchHtml(url: URL): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ContentRepurposerBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    if (!res.ok) {
      if (res.status === 403 || res.status === 401) {
        throw new Error('Access denied. This site may require login or block automated access.');
      }
      if (res.status === 404) {
        throw new Error('Page not found (404). Please check the URL and try again.');
      }
      throw new Error(`Failed to fetch the page (HTTP ${res.status}).`);
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      throw new Error('The URL does not point to an HTML page. Please provide a link to an article or blog post.');
    }

    // Read with size limit
    const reader = res.body?.getReader();
    if (!reader) throw new Error('Failed to read page content.');

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_RESPONSE_BYTES) {
        reader.cancel();
        throw new Error('Page is too large to process. Please paste the article text manually.');
      }
      chunks.push(value);
    }

    const decoder = new TextDecoder('utf-8');
    return chunks.map((c) => decoder.decode(c, { stream: true })).join('') + decoder.decode();
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        throw new Error('Request timed out. The site took too long to respond.');
      }
      throw err;
    }
    throw new Error('An unexpected error occurred while fetching the page.');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Clean extracted text: collapse whitespace, remove empty lines, trim.
 */
function cleanText(raw: string): string {
  return raw
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')           // collapse multiple spaces
    .replace(/\n[ \t]+/g, '\n')         // trim leading whitespace on lines
    .replace(/[ \t]+\n/g, '\n')         // trim trailing whitespace on lines
    .replace(/\n{3,}/g, '\n\n')         // collapse 3+ newlines to 2
    .trim();
}

/**
 * Scrape an article from a URL and return the extracted title and text.
 *
 * @throws Error with a user-friendly message on failure.
 */
export async function scrapeArticle(rawUrl: string): Promise<ScrapeResult> {
  const url = validateUrl(rawUrl);
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  // Remove noise elements
  $(NOISE_SELECTORS).remove();

  // Extract title: prefer og:title → <title> → first <h1>
  let title =
    $('meta[property="og:title"]').attr('content')?.trim() ||
    $('title').first().text().trim() ||
    $('h1').first().text().trim() ||
    '';

  // Strip common title suffixes like " | Site Name" or " - Blog"
  title = title.replace(/\s*[|–—-]\s*[^|–—-]+$/, '').trim();

  // Try to find the main article content using semantic selectors
  let articleText = '';

  for (const selector of ARTICLE_SELECTORS) {
    const el = $(selector).first();
    if (el.length) {
      // Get text from paragraphs, headings, and list items within the container
      const blocks: string[] = [];
      el.find('p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, figcaption').each((_, elem) => {
        const text = $(elem).text().trim();
        if (text.length > 0) {
          const tag = (elem as cheerio.Element).tagName?.toLowerCase() || '';
          if (tag.startsWith('h')) {
            blocks.push(`\n${text}\n`);
          } else if (tag === 'li') {
            blocks.push(`• ${text}`);
          } else if (tag === 'blockquote') {
            blocks.push(`"${text}"`);
          } else {
            blocks.push(text);
          }
        }
      });

      articleText = blocks.join('\n');
      if (articleText.length > 100) break; // good enough, stop looking
    }
  }

  // Fallback: if nothing found via selectors, grab all <p> tags from body
  if (articleText.length < 100) {
    const paragraphs: string[] = [];
    $('body p').each((_, elem) => {
      const text = $(elem).text().trim();
      if (text.length > 30) {
        paragraphs.push(text);
      }
    });
    articleText = paragraphs.join('\n\n');
  }

  const cleaned = cleanText(articleText);

  if (cleaned.length < 50) {
    throw new Error(
      'Could not extract enough article content from this page. The page might be behind a paywall, require JavaScript to load, or use an unusual layout. Try pasting the article text manually instead.'
    );
  }

  const wordCount = cleaned.split(/\s+/).filter(Boolean).length;

  return {
    title: title || 'Untitled Article',
    text: cleaned,
    wordCount,
  };
}
