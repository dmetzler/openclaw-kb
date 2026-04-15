const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'nomic-embed-text';
const OLLAMA_TIMEOUT_MS = Number.parseInt(process.env.OLLAMA_TIMEOUT_MS ?? '60000', 10);

export const EMBED_DIMENSIONS = 768;

const RETRY_DELAY_MS = 1000;
const AVAILABLE_CACHE_TTL_MS = 30_000;

let availableCache = null;
let availableCacheAt = 0;

function _formatDimensionMessage(length) {
  return `Ollama returned ${length} dimensions; expected ${EMBED_DIMENSIONS}.`;
}

function _toEmbeddingOrNull(embedding) {
  if (!Array.isArray(embedding)) {
    console.warn('Ollama returned an invalid embedding payload.');
    return null;
  }

  if (embedding.length !== EMBED_DIMENSIONS) {
    console.warn(_formatDimensionMessage(embedding.length));
    return null;
  }

  return new Float32Array(embedding);
}

function _buildEmbedPayload(input, options) {
  return {
    model: options?.model ?? OLLAMA_MODEL,
    input,
  };
}

function _getBaseUrl(options) {
  return options?.baseUrl ?? OLLAMA_URL;
}

function _getTimeoutMs(options) {
  return options?.timeoutMs ?? OLLAMA_TIMEOUT_MS;
}

function _sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function _warnUnavailable(error, baseUrl) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`Ollama unavailable at ${baseUrl}: ${message}`);
}

function _isAbortError(error) {
  return error instanceof Error && error.name === 'AbortError';
}

function _isConnectionError(error) {
  if (!(error instanceof Error)) {
    return false;
  }

  const lowerMessage = error.message.toLowerCase();
  return lowerMessage.includes('econnrefused') || lowerMessage.includes('fetch');
}

async function _fetchEmbedOnce(input, options) {
  const baseUrl = _getBaseUrl(options);
  const modelName = options?.model ?? OLLAMA_MODEL;
  const timeoutMs = _getTimeoutMs(options);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/api/embed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(_buildEmbedPayload(input, { model: modelName })),
      signal: controller.signal,
    });

    if (response.status === 404) {
      throw new Error(`Model '${modelName}' not found. Pull with: ollama pull ${modelName}`);
    }

    if (!response.ok) {
      const error = new Error(`Ollama returned HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }

    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function _callOllamaEmbed(input, options) {
  const baseUrl = _getBaseUrl(options);

  try {
    return await _fetchEmbedOnce(input, options);
  } catch (error) {
    if (error instanceof Error && error.status === 503) {
      await _sleep(RETRY_DELAY_MS);

      try {
        return await _fetchEmbedOnce(input, options);
      } catch (retryError) {
        if (_isAbortError(retryError) || _isConnectionError(retryError)) {
          _warnUnavailable(retryError, baseUrl);
          return null;
        }

        if (retryError instanceof Error && retryError.status === 503) {
          _warnUnavailable(retryError, baseUrl);
          return null;
        }

        throw retryError;
      }
    }

    if (_isAbortError(error) || _isConnectionError(error)) {
      _warnUnavailable(error, baseUrl);
      return null;
    }

    throw error;
  }
}

/**
 * Generates a query embedding for the supplied text.
 *
 * @param {string} text - Query text to embed.
 * @param {{ baseUrl?: string, model?: string, timeoutMs?: number }} [options]
 * @returns {Promise<Float32Array|null>} Embedding vector or null if Ollama is unavailable.
 * @throws {Error} If the configured model is missing or Ollama returns a non-retryable error.
 */
export async function embed(text, options) {
  const payload = `search_query: ${text}`;
  const response = await _callOllamaEmbed(payload, options);

  if (!response) {
    return null;
  }

  return _toEmbeddingOrNull(response.embeddings?.[0]);
}

/**
 * Generates a document embedding for the supplied text.
 *
 * @param {string} text - Document text to embed.
 * @param {{ baseUrl?: string, model?: string, timeoutMs?: number }} [options]
 * @returns {Promise<Float32Array|null>} Embedding vector or null if Ollama is unavailable.
 * @throws {Error} If the configured model is missing or Ollama returns a non-retryable error.
 */
export async function embedDocument(text, options) {
  const payload = `search_document: ${text}`;
  const response = await _callOllamaEmbed(payload, options);

  if (!response) {
    return null;
  }

  return _toEmbeddingOrNull(response.embeddings?.[0]);
}

/**
 * Generates document embeddings for a batch of texts.
 *
 * @param {string[]} texts - Document texts to embed.
 * @param {{ baseUrl?: string, model?: string, timeoutMs?: number }} [options]
 * @returns {Promise<Array<Float32Array|null>>} Embeddings per input (null when Ollama is unavailable).
 * @throws {Error} If the configured model is missing or Ollama returns a non-retryable error.
 */
export async function embedBatch(texts, options) {
  const payload = texts.map((text) => `search_document: ${text}`);
  const response = await _callOllamaEmbed(payload, options);

  if (!response) {
    return texts.map(() => null);
  }

  const embeddings = Array.isArray(response.embeddings) ? response.embeddings : [];
  const results = Array.from({ length: texts.length }, () => null);

  if (embeddings.length !== texts.length) {
    console.warn(
      `Ollama returned ${embeddings.length} embeddings for ${texts.length} inputs. Missing entries will be null.`,
    );
  }

  const count = Math.min(texts.length, embeddings.length);
  for (let index = 0; index < count; index += 1) {
    results[index] = _toEmbeddingOrNull(embeddings[index]);
  }

  return results;
}

/**
 * Checks whether Ollama is reachable and the configured model is available.
 *
 * @param {{ baseUrl?: string, model?: string }} [options]
 * @returns {Promise<boolean>} True if the model is available within the cache window.
 */
export async function isOllamaAvailable(options) {
  const now = Date.now();
  if (availableCache !== null && now - availableCacheAt < AVAILABLE_CACHE_TTL_MS) {
    return availableCache;
  }

  const baseUrl = _getBaseUrl(options);
  const modelName = options?.model ?? OLLAMA_MODEL;

  try {
    const response = await fetch(`${baseUrl}/api/tags`);
    if (!response.ok) {
      availableCache = false;
      availableCacheAt = now;
      return availableCache;
    }

    const payload = await response.json();
    const models = payload?.models ?? [];
    availableCache = models.some((model) => model?.name === modelName);
    availableCacheAt = now;
    return availableCache;
  } catch {
    availableCache = false;
    availableCacheAt = now;
    return false;
  }
}
