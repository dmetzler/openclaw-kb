import { describe, it, expect, afterEach, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { spawn } from 'node:child_process';
import { writeFileSync, unlinkSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import * as converter from '../../src/converter.mjs';

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

vi.mocked(spawn).mockImplementation((_command, args) => {
  const child = new EventEmitter();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.kill = vi.fn();

  const argsList = Array.isArray(args) ? args.join(' ') : '';
  setImmediate(() => {
    if (argsList.includes('--version')) {
      child.stdout.write('Python 3.11.0');
      child.stdout.end();
      child.stderr.end();
      child.emit('close', 0);
      return;
    }

    if (argsList.includes('import docling')) {
      child.stdout.write('0.0.0');
      child.stdout.end();
      child.stderr.end();
      child.emit('close', 0);
      return;
    }

    child.emit('close', 0);
  });

  return child;
});

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
    expect(converter.detectFormat('document.pdf')).toBe('pdf');
    expect(converter.detectFormat('document.docx')).toBe('docx');
    expect(converter.detectFormat('document.pptx')).toBe('pptx');
    expect(converter.detectFormat('image.png')).toBe('image');
    expect(converter.detectFormat('image.jpg')).toBe('image');
    expect(converter.detectFormat('image.jpeg')).toBe('image');
    expect(converter.detectFormat('image.tiff')).toBe('image');
    expect(converter.detectFormat('notes.md')).toBe('markdown');
    expect(converter.detectFormat('notes.txt')).toBe('text');
  });

  it('handles case-insensitive extensions', () => {
    expect(converter.detectFormat('REPORT.PDF')).toBe('pdf');
    expect(converter.detectFormat('README.Md')).toBe('markdown');
    expect(converter.detectFormat('NOTES.TXT')).toBe('text');
  });

  it('throws for unsupported extensions', () => {
    expect(() => converter.detectFormat('data.csv')).toThrow(
      'Unsupported file format: .csv. Supported: .pdf, .docx, .pptx, .png, .jpg, .jpeg, .tiff, .md, .txt',
    );
    expect(() => converter.detectFormat('page.html')).toThrow(
      'Unsupported file format: .html. Supported: .pdf, .docx, .pptx, .png, .jpg, .jpeg, .tiff, .md, .txt',
    );
    expect(() => converter.detectFormat('file.xyz')).toThrow(
      'Unsupported file format: .xyz. Supported: .pdf, .docx, .pptx, .png, .jpg, .jpeg, .tiff, .md, .txt',
    );
  });
});

describe('convertDocument', () => {
  it('passes through markdown content for .md files', async () => {
    const expected = readFileSync(sampleMdPath, 'utf8');
    const result = await converter.convertDocument(sampleMdPath);

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

    const result = await converter.convertDocument(tempMdPath);

    expect(result.source.converter).toBe('passthrough');
    expect(result.source.format).toBe('markdown');
    expect(result.chunks).toBeNull();
  });

  it('passes through text content for .txt files', async () => {
    tempTxtPath = join(tmpdir(), `converter-text-${Date.now()}.txt`);
    const content = 'Sample plain text content.';
    writeFileSync(tempTxtPath, content, 'utf8');

    const result = await converter.convertDocument(tempTxtPath);

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

    const result = await converter.convertDocument(tempMdPath);

    expect(result.markdown).toBe(content);
  });

  it('pass-through: .txt content is returned unchanged', async () => {
    tempTxtPath = join(tmpdir(), `converter-text-${Date.now()}.txt`);
    const content = 'Another text payload for passthrough.';
    writeFileSync(tempTxtPath, content, 'utf8');

    const result = await converter.convertDocument(tempTxtPath);

    expect(result.markdown).toBe(content);
  });

  it('pass-through: returns null chunks for further processing by chunkMarkdown', async () => {
    const result = await converter.convertDocument(sampleMdPath);

    expect(result.chunks).toBeNull();
  });

  it('throws when file does not exist', async () => {
    const missingPath = `/tmp/nonexistent-file-${Date.now()}.pdf`;
    await expect(converter.convertDocument(missingPath)).rejects.toThrow(
      `File not found: ${missingPath}`,
    );
  });

  it('throws for unsupported formats', async () => {
    tempUnsupportedPath = join(tmpdir(), `converter-unsupported-${Date.now()}.csv`);
    writeFileSync(tempUnsupportedPath, 'a,b,c', 'utf8');

    await expect(converter.convertDocument(tempUnsupportedPath)).rejects.toThrow(
      'Unsupported file format: .csv. Supported: .pdf, .docx, .pptx, .png, .jpg, .jpeg, .tiff, .md, .txt',
    );
  });

  it('throws with stderr details when docling emits errors', async () => {
    tempUnsupportedPath = join(tmpdir(), `converter-corrupt-${Date.now()}.pdf`);
    writeFileSync(tempUnsupportedPath, 'corrupt-pdf');

    const spawnMock = vi.mocked(spawn).mockImplementation((_command, args) => {
      const argsList = Array.isArray(args) ? args.join(' ') : '';
      const child = new EventEmitter();
      child.stdout = new PassThrough();
      child.stderr = new PassThrough();
      child.kill = vi.fn();

      setImmediate(() => {
        if (argsList.includes('--version')) {
          child.stdout.write('Python 3.11.0');
          child.stdout.end();
          child.stderr.end();
          child.emit('close', 0);
          return;
        }

        if (argsList.includes('import docling')) {
          child.stdout.write('0.0.0');
          child.stdout.end();
          child.stderr.end();
          child.emit('close', 0);
          return;
        }

        child.stderr.write('docling failed');
        child.stderr.end();
        child.stdout.end();
        child.emit('close', 1);
      });

      return child;
    });

    await expect(converter.convertDocument(tempUnsupportedPath, { pythonPath: 'python3' }))
      .rejects.toThrow(/Failed to convert .*docling failed/);
    spawnMock.mockRestore();
  });
});

describe('convertDocument — docling subprocess paths', () => {
  it('parses JSON stdout on successful docling conversion', async () => {
    const tempPdf = join(tmpdir(), `converter-success-${Date.now()}.pdf`);
    writeFileSync(tempPdf, 'PDF content');

    const doclingOutput = JSON.stringify({
      markdown: '# Converted\n\nSome text.',
      chunks: [{ text: 'chunk1', headings: ['Converted'], contextualized: 'chunk1 context' }],
    });

    vi.mocked(spawn).mockImplementation((_command, args) => {
      const argsList = Array.isArray(args) ? args.join(' ') : '';
      const child = new EventEmitter();
      child.stdout = new PassThrough();
      child.stderr = new PassThrough();
      child.kill = vi.fn();

      setImmediate(() => {
        if (argsList.includes('--version')) {
          child.stdout.write('Python 3.11.0');
          child.stdout.end();
          child.stderr.end();
          child.emit('close', 0);
          return;
        }
        if (argsList.includes('import docling')) {
          child.stdout.write('0.0.0');
          child.stdout.end();
          child.stderr.end();
          child.emit('close', 0);
          return;
        }
        // Simulate successful conversion
        child.stdout.write(doclingOutput);
        child.stdout.end();
        child.stderr.end();
        child.emit('close', 0);
      });

      return child;
    });

    // Reset docling availability cache so isDoclingAvailable re-runs
    const freshConverter = await vi.importActual('../../src/converter.mjs');
    const result = await freshConverter.convertDocument(tempPdf, { pythonPath: 'python3' });

    expect(result.markdown).toBe('# Converted\n\nSome text.');
    expect(result.chunks).toEqual([{ text: 'chunk1', headings: ['Converted'], contextualized: 'chunk1 context' }]);
    expect(result.source.converter).toBe('docling');
    expect(result.source.format).toBe('pdf');

    unlinkSync(tempPdf);
  });

  it('throws timeout error when conversion exceeds time limit', async () => {
    const tempPdf = join(tmpdir(), `converter-timeout-${Date.now()}.pdf`);
    writeFileSync(tempPdf, 'PDF content');

    vi.mocked(spawn).mockImplementation((_command, args) => {
      const argsList = Array.isArray(args) ? args.join(' ') : '';
      const child = new EventEmitter();
      child.stdout = new PassThrough();
      child.stderr = new PassThrough();
      child.kill = vi.fn();

      setImmediate(() => {
        if (argsList.includes('--version')) {
          child.stdout.write('Python 3.11.0');
          child.stdout.end();
          child.stderr.end();
          child.emit('close', 0);
          return;
        }
        if (argsList.includes('import docling')) {
          child.stdout.write('0.0.0');
          child.stdout.end();
          child.stderr.end();
          child.emit('close', 0);
          return;
        }
        // Simulate slow conversion — never emits 'close'
      });

      return child;
    });

    const freshConverter = await vi.importActual('../../src/converter.mjs');
    await expect(
      freshConverter.convertDocument(tempPdf, { pythonPath: 'python3', timeoutMs: 50 }),
    ).rejects.toThrow(/timed out after 50ms/);

    unlinkSync(tempPdf);
  });

  it('throws spawn error when python3 binary not found', async () => {
    const tempPdf = join(tmpdir(), `converter-nopython-${Date.now()}.pdf`);
    writeFileSync(tempPdf, 'PDF content');

    vi.mocked(spawn).mockImplementation(() => {
      const child = new EventEmitter();
      child.stdout = new PassThrough();
      child.stderr = new PassThrough();
      child.kill = vi.fn();

      setImmediate(() => {
        child.emit('error', new Error('spawn python3 ENOENT'));
      });

      return child;
    });

    const freshConverter = await vi.importActual('../../src/converter.mjs');
    await expect(
      freshConverter.convertDocument(tempPdf, { pythonPath: 'python3' }),
    ).rejects.toThrow();

    unlinkSync(tempPdf);
  });
});

describe('isDoclingAvailable', () => {
  it('exports a function without invoking Python', () => {
    expect(typeof converter.isDoclingAvailable).toBe('function');
  });
});
