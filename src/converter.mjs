import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const PYTHON_SCRIPT = join(moduleDir, 'scripts', 'convert_and_chunk.py');

const FORMAT_MAP = {
  '.pdf': 'pdf',
  '.docx': 'docx',
  '.pptx': 'pptx',
  '.png': 'image',
  '.jpg': 'image',
  '.jpeg': 'image',
  '.tiff': 'image',
  '.md': 'markdown',
  '.txt': 'text',
};

const DOCLING_FORMATS = new Set(['pdf', 'docx', 'pptx', 'image']);

let doclingCheckComplete = false;
let pythonAvailable = null;
let doclingAvailable = null;

/**
 * Detects the document format based on file extension.
 *
 * @param {string} filePath - Absolute or relative file path.
 * @returns {string} Detected format string.
 * @throws {Error} If the file extension is unsupported.
 */
export function detectFormat(filePath) {
  const ext = extname(filePath).toLowerCase();
  const format = FORMAT_MAP[ext];

  if (!format) {
    throw new Error(
      `Unsupported file format: ${ext}. Supported: .pdf, .docx, .pptx, .png, .jpg, .jpeg, .tiff, .md, .txt`,
    );
  }

  return format;
}

/**
 * Checks whether docling is available in the configured Python environment.
 *
 * @param {Object} [options]
 * @param {string} [options.pythonPath] - Python executable path. Defaults to PYTHON_PATH env var or 'python3'.
 * @returns {Promise<boolean>} True when docling can be imported.
 */
export async function isDoclingAvailable(options = {}) {
  if (doclingCheckComplete) {
    return doclingAvailable === true;
  }

  const pythonPath = options.pythonPath ?? process.env.PYTHON_PATH ?? 'python3';

  try {
    const pythonResult = await _spawnWithOutput(pythonPath, ['--version']);
    pythonAvailable = pythonResult.code === 0;
  } catch {
    pythonAvailable = false;
  }

  if (!pythonAvailable) {
    doclingAvailable = false;
    doclingCheckComplete = true;
    return false;
  }

  try {
    const doclingResult = await _spawnWithOutput(
      pythonPath,
      ['-c', 'from docling.document_converter import DocumentConverter; print("ok")'],
    );
    doclingAvailable = doclingResult.code === 0;
  } catch {
    doclingAvailable = false;
  }

  doclingCheckComplete = true;
  return doclingAvailable === true;
}

/**
 * Converts a document to Markdown and chunks using docling when required.
 *
 * @param {string} filePath - Absolute path to the document file.
 * @param {Object} [options]
 * @param {number} [options.timeoutMs=600000] - Subprocess timeout in milliseconds.
 * @param {string} [options.pythonPath] - Python executable path. Defaults to PYTHON_PATH env var or 'python3'.
 * @returns {Promise<{ markdown: string, chunks: Array<{ text: string, headings: string[], contextualized: string }> | null, source: { path: string, format: string, converter: string } }>}
 * @throws {Error} If the file is missing, conversion fails, or dependencies are unavailable.
 */
export async function convertDocument(filePath, options = {}) {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const format = detectFormat(filePath);

  if (format === 'markdown' || format === 'text') {
    const markdown = readFileSync(filePath, 'utf8');
    return {
      markdown,
      chunks: null,
      source: {
        path: filePath,
        format,
        converter: 'passthrough',
      },
    };
  }

  if (DOCLING_FORMATS.has(format)) {
    const pythonPath = options.pythonPath ?? process.env.PYTHON_PATH ?? 'python3';
    const timeoutMs = options.timeoutMs ?? 600000;
    const available = await isDoclingAvailable({ pythonPath });

    if (!available) {
      if (!pythonAvailable) {
        throw new Error('Python 3 is required for document conversion. Install from python.org');
      }

      throw new Error('docling is required for PDF/DOCX/PPTX conversion. Install with: pip install docling');
    }

    const { stdout, stderr, code } = await _spawnWithOutput(
      pythonPath,
      [PYTHON_SCRIPT, filePath],
      {
        env: { ...process.env, PYTHONUNBUFFERED: '1' },
        timeoutMs,
      },
    );

    if (code !== 0) {
      const errorText = stderr.trim() || stdout.trim() || 'Unknown conversion error';
      throw new Error(`Failed to convert ${filePath}: ${errorText}`);
    }

    let parsed;
    try {
      parsed = JSON.parse(stdout);
    } catch (parseError) {
      throw new Error(`Failed to parse converter output for ${filePath}: ${parseError.message}`);
    }
    return {
      markdown: parsed.markdown,
      chunks: parsed.chunks,
      source: {
        path: filePath,
        format,
        converter: 'docling',
      },
    };
  }

  throw new Error(
    `Unsupported file format: ${extname(filePath).toLowerCase()}. Supported: .pdf, .docx, .pptx, .png, .jpg, .jpeg, .tiff, .md, .txt`,
  );
}

function _spawnWithOutput(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const { env, timeoutMs } = options;
    const child = spawn(command, args, { env });
    const stdoutChunks = [];
    const stderrChunks = [];
    let timeoutId = null;
    let settled = false;

    const finalize = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      resolve(result);
    };

    const fail = (error) => {
      if (settled) {
        return;
      }
      settled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      reject(error);
    };

    if (typeof timeoutMs === 'number' && timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        if (!settled) {
          child.kill();
          fail(new Error(`Document conversion timed out after ${timeoutMs}ms`));
        }
      }, timeoutMs);
    }

    child.stdout.on('data', (chunk) => {
      stdoutChunks.push(chunk);
    });

    child.stderr.on('data', (chunk) => {
      stderrChunks.push(chunk);
    });

    child.on('error', (error) => {
      fail(error);
    });

    child.on('close', (code) => {
      const stdout = Buffer.concat(stdoutChunks).toString('utf8');
      const stderr = Buffer.concat(stderrChunks).toString('utf8');
      finalize({ code, stdout, stderr });
    });
  });
}
