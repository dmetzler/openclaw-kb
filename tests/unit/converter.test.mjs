import { describe, it, expect, afterEach } from 'vitest';
import { writeFileSync, unlinkSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  detectFormat,
  convertDocument,
  isDoclingAvailable,
} from '../../src/converter.mjs';

const fixturesDir = join(process.cwd(), 'tests', 'fixtures');
const sampleMdPath = join(fixturesDir, 'sample.md');

let tempTxtPath = null;
let tempUnsupportedPath = null;
let tempMdPath = null;

afterEach(() => {
  if (tempTxtPath && existsSync(tempTxtPath)) {
    unlinkSync(tempTxtPath);
  }
  if (tempMdPath && existsSync(tempMdPath)) {
    unlinkSync(tempMdPath);
  }
  if (tempUnsupportedPath && existsSync(tempUnsupportedPath)) {
    unlinkSync(tempUnsupportedPath);
  }
  tempTxtPath = null;
  tempMdPath = null;
  tempUnsupportedPath = null;
});

describe('detectFormat', () => {
  it('returns correct formats for supported extensions', () => {
    expect(detectFormat('document.pdf')).toBe('pdf');
    expect(detectFormat('document.docx')).toBe('docx');
    expect(detectFormat('document.pptx')).toBe('pptx');
    expect(detectFormat('image.png')).toBe('image');
    expect(detectFormat('image.jpg')).toBe('image');
    expect(detectFormat('image.jpeg')).toBe('image');
    expect(detectFormat('image.tiff')).toBe('image');
    expect(detectFormat('notes.md')).toBe('markdown');
    expect(detectFormat('notes.txt')).toBe('text');
  });

  it('handles case-insensitive extensions', () => {
    expect(detectFormat('REPORT.PDF')).toBe('pdf');
    expect(detectFormat('README.Md')).toBe('markdown');
    expect(detectFormat('NOTES.TXT')).toBe('text');
  });

  it('throws for unsupported extensions', () => {
    expect(() => detectFormat('data.csv')).toThrow(
      'Unsupported file format: .csv. Supported: .pdf, .docx, .pptx, .png, .jpg, .jpeg, .tiff, .md, .txt',
    );
    expect(() => detectFormat('page.html')).toThrow(
      'Unsupported file format: .html. Supported: .pdf, .docx, .pptx, .png, .jpg, .jpeg, .tiff, .md, .txt',
    );
    expect(() => detectFormat('file.xyz')).toThrow(
      'Unsupported file format: .xyz. Supported: .pdf, .docx, .pptx, .png, .jpg, .jpeg, .tiff, .md, .txt',
    );
  });
});

describe('convertDocument', () => {
  it('passes through markdown content for .md files', async () => {
    const expected = readFileSync(sampleMdPath, 'utf8');
    const result = await convertDocument(sampleMdPath);

    expect(result).toEqual({
      markdown: expected,
      chunks: null,
      source: {
        path: sampleMdPath,
        format: 'markdown',
        converter: 'passthrough',
      },
    });
  });

  it('pass-through: .md file is not sent to docling', async () => {
    tempMdPath = join(tmpdir(), `converter-markdown-${Date.now()}.md`);
    const content = '# Passthrough title\n\nPlain markdown.';
    writeFileSync(tempMdPath, content, 'utf8');

    const result = await convertDocument(tempMdPath);

    expect(result.source.converter).toBe('passthrough');
    expect(result.source.format).toBe('markdown');
    expect(result.chunks).toBeNull();
  });

  it('passes through text content for .txt files', async () => {
    tempTxtPath = join(tmpdir(), `converter-text-${Date.now()}.txt`);
    const content = 'Sample plain text content.';
    writeFileSync(tempTxtPath, content, 'utf8');

    const result = await convertDocument(tempTxtPath);

    expect(result).toEqual({
      markdown: content,
      chunks: null,
      source: {
        path: tempTxtPath,
        format: 'text',
        converter: 'passthrough',
      },
    });
  });

  it('pass-through: .md content is returned unchanged', async () => {
    tempMdPath = join(tmpdir(), `converter-markdown-${Date.now()}.md`);
    const content = '## Heading\n\nMarkdown body with **bold**.';
    writeFileSync(tempMdPath, content, 'utf8');

    const result = await convertDocument(tempMdPath);

    expect(result.markdown).toBe(content);
  });

  it('pass-through: .txt content is returned unchanged', async () => {
    tempTxtPath = join(tmpdir(), `converter-text-${Date.now()}.txt`);
    const content = 'Another text payload for passthrough.';
    writeFileSync(tempTxtPath, content, 'utf8');

    const result = await convertDocument(tempTxtPath);

    expect(result.markdown).toBe(content);
  });

  it('pass-through: returns null chunks for further processing by chunkMarkdown', async () => {
    const result = await convertDocument(sampleMdPath);

    expect(result.chunks).toBeNull();
  });

  it('throws when file does not exist', async () => {
    const missingPath = `/tmp/nonexistent-file-${Date.now()}.pdf`;
    await expect(convertDocument(missingPath)).rejects.toThrow(
      `File not found: ${missingPath}`,
    );
  });

  it('throws for unsupported formats', async () => {
    tempUnsupportedPath = join(tmpdir(), `converter-unsupported-${Date.now()}.csv`);
    writeFileSync(tempUnsupportedPath, 'a,b,c', 'utf8');

    await expect(convertDocument(tempUnsupportedPath)).rejects.toThrow(
      'Unsupported file format: .csv. Supported: .pdf, .docx, .pptx, .png, .jpg, .jpeg, .tiff, .md, .txt',
    );
  });
});

describe('isDoclingAvailable', () => {
  it('exports a function without invoking Python', () => {
    expect(typeof isDoclingAvailable).toBe('function');
  });
});
