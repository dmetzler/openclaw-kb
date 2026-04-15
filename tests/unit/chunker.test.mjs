import { describe, it, expect } from 'vitest';
import { chunkMarkdown, estimateTokens } from '../../src/chunker.mjs';

describe('estimateTokens', () => {
  it('returns Math.ceil(wordCount / 0.75) for normal text', () => {
    const text = 'one two three';
    expect(estimateTokens(text)).toBe(Math.ceil(3 / 0.75));
  });

  it('returns 0 for empty or whitespace-only input', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('   ')).toBe(0);
    expect(estimateTokens('\n\t')).toBe(0);
  });
});

describe('chunkMarkdown', () => {
  it('returns empty array for empty/null/undefined input', () => {
    expect(chunkMarkdown('')).toEqual([]);
    expect(chunkMarkdown('   ')).toEqual([]);
    expect(chunkMarkdown('\n\n\n')).toEqual([]);
    expect(chunkMarkdown(null)).toEqual([]);
    expect(chunkMarkdown(undefined)).toEqual([]);
  });

  it('handles content with no headings', () => {
    const markdown = 'Just some text.\n\nAnother paragraph.';
    const chunks = chunkMarkdown(markdown, { minTokens: 1 });

    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe(markdown);
    expect(chunks[0].metadata.section).toEqual([]);
  });

  it('splits on headings and preserves hierarchy with source metadata', () => {
    const markdown = `# Chapter 1
Intro text.

## Section 1.1
Section text.

### Subsection 1.1.1
Subsection text.

## Section 1.2
More text.

# Chapter 2
Chapter text.`;

    const chunks = chunkMarkdown(markdown, {
      source: 'docs/guide.md',
      minTokens: 1,
    });

    expect(chunks).toHaveLength(5);

    const sections = chunks.map((chunk) => chunk.metadata.section);
    expect(sections).toEqual([
      ['Chapter 1'],
      ['Chapter 1', 'Section 1.1'],
      ['Chapter 1', 'Section 1.1', 'Subsection 1.1.1'],
      ['Chapter 1', 'Section 1.2'],
      ['Chapter 2'],
    ]);

    chunks.forEach((chunk, index) => {
      expect(chunk.metadata).toEqual({
        source: 'docs/guide.md',
        section: sections[index],
        index,
        tokenCount: estimateTokens(chunk.text),
      });
    });
  });

  it('splits oversized sections on paragraph boundaries', () => {
    const paragraphOne = Array.from({ length: 20 }, (_, i) => `word${i + 1}`).join(' ');
    const paragraphTwo = Array.from({ length: 20 }, (_, i) => `term${i + 1}`).join(' ');
    const markdown = `# Big Section
${paragraphOne}

${paragraphTwo}`;

    const chunks = chunkMarkdown(markdown, { maxTokens: 50, minTokens: 10 });

    expect(chunks).toHaveLength(2);
    expect(chunks[0].text).toBe(paragraphOne);
    expect(chunks[1].text).toBe(paragraphTwo);
    expect(chunks[0].metadata.section).toEqual(['Big Section']);
    expect(chunks[1].metadata.section).toEqual(['Big Section']);
    expect(chunks.map((chunk) => chunk.metadata.index)).toEqual([0, 1]);
  });

  it('merges undersized chunks with the following chunk', () => {
    const smallText = 'tiny chunk';
    const largerText =
      'This chunk has enough words to exceed the minimum token threshold.';
    const markdown = `# Tiny
${smallText}

# Next
${largerText}`;

    const chunks = chunkMarkdown(markdown, { maxTokens: 50, minTokens: 10 });

    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe(`${smallText}\n\n\n\n${largerText}`);
    expect(chunks[0].metadata.section).toEqual(['Tiny']);
    expect(chunks[0].metadata.index).toBe(0);
    expect(chunks[0].metadata.tokenCount).toBe(estimateTokens(chunks[0].text));
  });
});
