import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const SUCCESS_EMBEDDINGS = [new Array(768).fill(0.1)];

const okEmbedResponse = () => ({
  ok: true,
  status: 200,
  json: async () => ({ embeddings: SUCCESS_EMBEDDINGS }),
});

const importEmbedder = async () => import('../../src/embedder.mjs');

const createAbortError = () => Object.assign(new Error('aborted'), { name: 'AbortError' });

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('embed', () => {
  it('adds search_query prefix and returns Float32Array', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okEmbedResponse());
    vi.stubGlobal('fetch', fetchMock);
    const { embed } = await importEmbedder();

    const result = await embed('hello world');

    expect(result).toBeInstanceOf(Float32Array);
    expect(result).toHaveLength(768);
    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.input).toBe('search_query: hello world');
  });

  it('returns null on connection errors', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValue(new TypeError('fetch failed: ECONNREFUSED'));
    vi.stubGlobal('fetch', fetchMock);
    const { embed } = await importEmbedder();

    await expect(embed('hello')).resolves.toBeNull();
  });

  it('returns null on AbortError timeout', async () => {
    const fetchMock = vi.fn().mockRejectedValue(createAbortError());
    vi.stubGlobal('fetch', fetchMock);
    const { embed } = await importEmbedder();

    await expect(embed('hello')).resolves.toBeNull();
  });

  it('throws on 404 with actionable message', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    vi.stubGlobal('fetch', fetchMock);
    const { embed } = await importEmbedder();

    await expect(embed('hello')).rejects.toThrow(/not found/i);
    await expect(embed('hello')).rejects.toThrow(/ollama pull/i);
  });

  it('retries once on 503 and returns null if retry fails', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: false, status: 503 });
    vi.stubGlobal('fetch', fetchMock);
    const { embed } = await importEmbedder();

    const promise = embed('hello');
    await vi.advanceTimersByTimeAsync(1000);

    await expect(promise).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('embedDocument', () => {
  it('adds search_document prefix and returns Float32Array', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okEmbedResponse());
    vi.stubGlobal('fetch', fetchMock);
    const { embedDocument } = await importEmbedder();

    const result = await embedDocument('doc text');

    expect(result).toBeInstanceOf(Float32Array);
    expect(result).toHaveLength(768);
    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.input).toBe('search_document: doc text');
  });
});

describe('embedBatch', () => {
  it('sends search_document prefix per text and returns Float32Array array', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okEmbedResponse());
    vi.stubGlobal('fetch', fetchMock);
    const { embedBatch } = await importEmbedder();

    const result = await embedBatch(['doc one']);

    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(Float32Array);
    expect(result[0]).toHaveLength(768);
    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.input).toEqual(['search_document: doc one']);
  });

  it('returns array of nulls on connection errors', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValue(new TypeError('fetch failed: ECONNREFUSED'));
    vi.stubGlobal('fetch', fetchMock);
    const { embedBatch } = await importEmbedder();

    const result = await embedBatch(['a', 'b']);

    expect(result).toEqual([null, null]);
  });
});

describe('isOllamaAvailable', () => {
  it('returns true when model is listed and caches for 30s', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2020-01-01T00:00:00Z'));
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ models: [{ name: 'nomic-embed-text' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { isOllamaAvailable } = await importEmbedder();

    await expect(isOllamaAvailable()).resolves.toBe(true);
    vi.setSystemTime(new Date('2020-01-01T00:00:10Z'));
    await expect(isOllamaAvailable()).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date('2020-01-01T00:00:31Z'));
    await expect(isOllamaAvailable()).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns false when model is not listed', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ models: [{ name: 'other-model' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { isOllamaAvailable } = await importEmbedder();

    await expect(isOllamaAvailable()).resolves.toBe(false);
  });
});
