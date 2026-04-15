const HEADING_REGEX = /^(#{1,3})\s+(.+)$/gm;

/**
 * Estimates a token count using a word-count heuristic.
 *
 * @param {string} text - Text to estimate.
 * @returns {number} Estimated token count.
 */
export function estimateTokens(text) {
  if (!text || text.trim().length === 0) {
    return 0;
  }

  const words = text.split(/\s+/).filter(Boolean);
  return Math.ceil(words.length / 0.75);
}

/**
 * Chunks Markdown content along heading boundaries with optional size controls.
 *
 * @param {string} markdown - Markdown content to chunk.
 * @param {Object} [options]
 * @param {string} [options.source] - Source identifier (file path or URL).
 * @param {number} [options.maxTokens=500] - Maximum tokens per chunk.
 * @param {number} [options.minTokens=50] - Minimum tokens per chunk before merging.
 * @returns {{ text: string, metadata: { source: string | null, section: string[], index: number, tokenCount: number } }[]}
 */
export function chunkMarkdown(markdown, options = {}) {
  if (typeof markdown !== 'string' || markdown.trim().length === 0) {
    return [];
  }

  const { source = null, maxTokens = 500, minTokens = 50 } = options;
  const sections = _splitSections(markdown);
  const candidates = [];

  for (const section of sections) {
    if (!section.body || section.body.trim().length === 0) {
      continue;
    }

    let pieces = [section.body];
    if (estimateTokens(section.body) > maxTokens) {
      pieces = section.body.split('\n\n');
    }

    for (const piece of pieces) {
      if (!piece || piece.trim().length === 0) {
        continue;
      }

      candidates.push({
        text: piece,
        metadata: {
          source,
          section: section.section,
        },
      });
    }
  }

  const merged = [];
  let i = 0;

  while (i < candidates.length) {
    const current = {
      text: candidates[i].text,
      metadata: {
        source: candidates[i].metadata.source,
        section: candidates[i].metadata.section,
      },
    };

    let tokenCount = estimateTokens(current.text);
    while (tokenCount < minTokens && i + 1 < candidates.length) {
      current.text = `${current.text}\n\n${candidates[i + 1].text}`;
      tokenCount = estimateTokens(current.text);
      i += 1;
    }

    merged.push(current);
    i += 1;
  }

  return merged.map((chunk, index) => ({
    text: chunk.text,
    metadata: {
      source,
      section: chunk.metadata.section,
      index,
      tokenCount: estimateTokens(chunk.text),
    },
  }));
}

function _splitSections(markdown) {
  const matches = [...markdown.matchAll(HEADING_REGEX)];

  if (matches.length === 0) {
    return [{ section: [], body: markdown }];
  }

  const sections = [];
  let hierarchy = [];

  for (let i = 0; i < matches.length; i += 1) {
    const match = matches[i];
    const level = match[1].length;
    const title = match[2].trim();

    hierarchy = hierarchy.slice(0, level - 1);
    hierarchy[level - 1] = title;

    const bodyStart = match.index + match[0].length;
    const bodyEnd = matches[i + 1]?.index ?? markdown.length;
    let body = markdown.slice(bodyStart, bodyEnd);

    if (body.startsWith('\r\n')) {
      body = body.slice(2);
    } else if (body.startsWith('\n')) {
      body = body.slice(1);
    }

    sections.push({ section: [...hierarchy], body });
  }

  return sections;
}
