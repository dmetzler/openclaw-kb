import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const importProvider = async () => import('../../src/llm-provider.mjs');

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

// ---- createLLMProvider auto-detection ----

describe('createLLMProvider', () => {
  it('selects OpenAI when OPENAI_API_KEY is set', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test-key');
    vi.stubEnv('ANTHROPIC_API_KEY', '');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'hello' } }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { createLLMProvider } = await importProvider();
    const llm = await createLLMProvider();

    const result = await llm.complete('system', 'user');

    expect(result).toBe('hello');
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain('openai.com');
    expect(options.headers['Authorization']).toBe('Bearer sk-test-key');
  });

  it('selects Anthropic when only ANTHROPIC_API_KEY is set', async () => {
    vi.stubEnv('OPENAI_API_KEY', '');
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: 'claude says hi' }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { createLLMProvider } = await importProvider();
    const llm = await createLLMProvider();

    const result = await llm.complete('system', 'user');

    expect(result).toBe('claude says hi');
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain('anthropic.com');
    expect(options.headers['x-api-key']).toBe('sk-ant-test');
    expect(options.headers['anthropic-version']).toBe('2023-06-01');
  });

  it('selects Ollama when no API keys but Ollama is running', async () => {
    vi.stubEnv('OPENAI_API_KEY', '');
    vi.stubEnv('ANTHROPIC_API_KEY', '');

    const fetchMock = vi.fn()
      // First call: isOllamaChatAvailable → /api/tags
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [{ name: 'llama3.2' }] }),
      })
      // Second call: complete → /api/chat
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: { role: 'assistant', content: 'ollama reply' },
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const { createLLMProvider } = await importProvider();
    const llm = await createLLMProvider();

    const result = await llm.complete('system', 'user');

    expect(result).toBe('ollama reply');
    // Tags check
    expect(fetchMock.mock.calls[0][0]).toContain('/api/tags');
    // Chat call
    expect(fetchMock.mock.calls[1][0]).toContain('/api/chat');
  });

  it('throws when no provider is available', async () => {
    vi.stubEnv('OPENAI_API_KEY', '');
    vi.stubEnv('ANTHROPIC_API_KEY', '');

    // Ollama unreachable
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('fetch failed: ECONNREFUSED'));
    vi.stubGlobal('fetch', fetchMock);

    const { createLLMProvider } = await importProvider();

    await expect(createLLMProvider()).rejects.toThrow(/No LLM provider available/);
  });

  it('respects LLM_PROVIDER env var to force openai', async () => {
    vi.stubEnv('LLM_PROVIDER', 'openai');
    vi.stubEnv('OPENAI_API_KEY', 'sk-forced');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'forced' } }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { createLLMProvider } = await importProvider();
    const llm = await createLLMProvider();
    const result = await llm.complete('s', 'u');

    expect(result).toBe('forced');
    expect(fetchMock.mock.calls[0][0]).toContain('openai.com');
  });

  it('respects LLM_PROVIDER env var to force anthropic', async () => {
    vi.stubEnv('LLM_PROVIDER', 'anthropic');
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-forced');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: 'forced-claude' }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { createLLMProvider } = await importProvider();
    const llm = await createLLMProvider();
    const result = await llm.complete('s', 'u');

    expect(result).toBe('forced-claude');
  });

  it('respects LLM_PROVIDER env var to force ollama', async () => {
    vi.stubEnv('LLM_PROVIDER', 'ollama');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: { role: 'assistant', content: 'forced-ollama' },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { createLLMProvider } = await importProvider();
    const llm = await createLLMProvider();
    const result = await llm.complete('s', 'u');

    expect(result).toBe('forced-ollama');
  });

  it('throws on unknown LLM_PROVIDER value', async () => {
    vi.stubEnv('LLM_PROVIDER', 'gemini');

    const { createLLMProvider } = await importProvider();

    await expect(createLLMProvider()).rejects.toThrow(/Unknown LLM_PROVIDER "gemini"/);
  });

  it('respects LLM_MODEL override for OpenAI', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test');
    vi.stubEnv('LLM_MODEL', 'gpt-4o');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'ok' } }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { createLLMProvider } = await importProvider();
    const llm = await createLLMProvider();
    await llm.complete('s', 'u');

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe('gpt-4o');
  });
});

// ---- createOpenAIProvider ----

describe('createOpenAIProvider', () => {
  it('throws when no API key is available', async () => {
    vi.stubEnv('OPENAI_API_KEY', '');

    const { createOpenAIProvider } = await importProvider();
    expect(() => createOpenAIProvider()).toThrow(/OPENAI_API_KEY is required/);
  });

  it('sends correct request shape', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'response' } }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { createOpenAIProvider } = await importProvider();
    const llm = createOpenAIProvider({ apiKey: 'sk-test' });
    await llm.complete('You are helpful', 'Hello');

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    const body = JSON.parse(options.body);
    expect(body.messages).toEqual([
      { role: 'system', content: 'You are helpful' },
      { role: 'user', content: 'Hello' },
    ]);
    expect(body.model).toBe('gpt-4o-mini');
    expect(body.temperature).toBe(0);
  });

  it('throws on HTTP error with detail', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: 'Invalid key' } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { createOpenAIProvider } = await importProvider();
    const llm = createOpenAIProvider({ apiKey: 'bad-key' });

    await expect(llm.complete('s', 'u')).rejects.toThrow(/OpenAI API error \(HTTP 401\)/);
    await expect(llm.complete('s', 'u')).rejects.toThrow(/Invalid key/);
  });

  it('throws on unexpected response shape', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { createOpenAIProvider } = await importProvider();
    const llm = createOpenAIProvider({ apiKey: 'sk-test' });

    await expect(llm.complete('s', 'u')).rejects.toThrow(/unexpected response shape/);
  });
});

// ---- createAnthropicProvider ----

describe('createAnthropicProvider', () => {
  it('throws when no API key is available', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');

    const { createAnthropicProvider } = await importProvider();
    expect(() => createAnthropicProvider()).toThrow(/ANTHROPIC_API_KEY is required/);
  });

  it('sends system prompt as top-level field, not in messages', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: 'response' }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { createAnthropicProvider } = await importProvider();
    const llm = createAnthropicProvider({ apiKey: 'sk-ant-test' });
    await llm.complete('You are helpful', 'Hello');

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.system).toBe('You are helpful');
    expect(body.messages).toEqual([
      { role: 'user', content: 'Hello' },
    ]);
    expect(body.max_tokens).toBe(4096);
  });

  it('includes required anthropic headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: 'ok' }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { createAnthropicProvider } = await importProvider();
    const llm = createAnthropicProvider({ apiKey: 'sk-ant-test' });
    await llm.complete('s', 'u');

    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers['x-api-key']).toBe('sk-ant-test');
    expect(headers['anthropic-version']).toBe('2023-06-01');
  });

  it('throws on HTTP error with detail', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: 'invalid x-api-key' } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { createAnthropicProvider } = await importProvider();
    const llm = createAnthropicProvider({ apiKey: 'bad' });

    await expect(llm.complete('s', 'u')).rejects.toThrow(/Anthropic API error \(HTTP 401\)/);
  });
});

// ---- createOllamaProvider ----

describe('createOllamaProvider', () => {
  it('sends correct request shape with stream: false', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: { role: 'assistant', content: 'hey' },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { createOllamaProvider } = await importProvider();
    const llm = createOllamaProvider();
    await llm.complete('You are helpful', 'Hello');

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:11434/api/chat');
    const body = JSON.parse(options.body);
    expect(body.stream).toBe(false);
    expect(body.messages).toEqual([
      { role: 'system', content: 'You are helpful' },
      { role: 'user', content: 'Hello' },
    ]);
  });

  it('uses custom baseUrl', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: { role: 'assistant', content: 'ok' },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { createOllamaProvider } = await importProvider();
    const llm = createOllamaProvider({ baseUrl: 'http://gpu-server:11434' });
    await llm.complete('s', 'u');

    expect(fetchMock.mock.calls[0][0]).toBe('http://gpu-server:11434/api/chat');
  });

  it('throws on connection refused', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('fetch failed: ECONNREFUSED'));
    vi.stubGlobal('fetch', fetchMock);

    const { createOllamaProvider } = await importProvider();
    const llm = createOllamaProvider();

    await expect(llm.complete('s', 'u')).rejects.toThrow(/Ollama connection failed/);
  });

  it('throws on timeout with AbortError', async () => {
    const fetchMock = vi.fn().mockRejectedValue(
      Object.assign(new Error('aborted'), { name: 'AbortError' }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { createOllamaProvider } = await importProvider();
    const llm = createOllamaProvider({ timeoutMs: 100 });

    await expect(llm.complete('s', 'u')).rejects.toThrow(/timed out/);
  });

  it('throws on HTTP error', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: "model 'bad' not found" }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { createOllamaProvider } = await importProvider();
    const llm = createOllamaProvider({ model: 'bad' });

    await expect(llm.complete('s', 'u')).rejects.toThrow(/Ollama API error \(HTTP 404\)/);
  });
});

// ---- isOllamaChatAvailable ----

describe('isOllamaChatAvailable', () => {
  it('returns true when models are listed', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ models: [{ name: 'llama3.2' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { isOllamaChatAvailable } = await importProvider();
    await expect(isOllamaChatAvailable()).resolves.toBe(true);
  });

  it('returns false when no models exist', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ models: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { isOllamaChatAvailable } = await importProvider();
    await expect(isOllamaChatAvailable()).resolves.toBe(false);
  });

  it('returns false when Ollama is unreachable', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    vi.stubGlobal('fetch', fetchMock);

    const { isOllamaChatAvailable } = await importProvider();
    await expect(isOllamaChatAvailable()).resolves.toBe(false);
  });

  it('returns false when API returns non-200', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    vi.stubGlobal('fetch', fetchMock);

    const { isOllamaChatAvailable } = await importProvider();
    await expect(isOllamaChatAvailable()).resolves.toBe(false);
  });

  it('checks for specific model when LLM_MODEL is set', async () => {
    vi.stubEnv('LLM_MODEL', 'mistral');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ models: [{ name: 'llama3.2' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { isOllamaChatAvailable } = await importProvider();
    await expect(isOllamaChatAvailable()).resolves.toBe(false);
  });

  it('matches model name with tag suffix', async () => {
    vi.stubEnv('LLM_MODEL', 'llama3.2');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ models: [{ name: 'llama3.2:latest' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { isOllamaChatAvailable } = await importProvider();
    await expect(isOllamaChatAvailable()).resolves.toBe(true);
  });
});

// ---- parseArgs (ingest CLI) ----

describe('parseArgs (ingest CLI)', () => {
  const importIngest = async () => import('../../src/ingest.mjs');

  it('parses --url flag', async () => {
    const { parseArgs } = await importIngest();
    const result = parseArgs(['--url', 'https://example.com']);
    expect(result.url).toBe('https://example.com');
  });

  it('parses bare URL without flag', async () => {
    const { parseArgs } = await importIngest();
    const result = parseArgs(['https://example.com/article']);
    expect(result.url).toBe('https://example.com/article');
  });

  it('parses --file flag', async () => {
    const { parseArgs } = await importIngest();
    const result = parseArgs(['--file', 'package.json']);
    expect(result.file).toBe('package.json');
  });

  it('parses --db flag', async () => {
    const { parseArgs } = await importIngest();
    const result = parseArgs(['--db', 'custom.db']);
    expect(result.db).toBe('custom.db');
  });

  it('parses --verbose flag', async () => {
    const { parseArgs } = await importIngest();
    const result = parseArgs(['--verbose']);
    expect(result.verbose).toBe(true);
  });

  it('parses combined flags', async () => {
    const { parseArgs } = await importIngest();
    const result = parseArgs(['--url', 'https://example.com', '--db', 'test.db', '--verbose']);
    expect(result).toEqual({
      url: 'https://example.com',
      db: 'test.db',
      verbose: true,
    });
  });

  it('throws on unknown argument', async () => {
    const { parseArgs } = await importIngest();
    expect(() => parseArgs(['--unknown'])).toThrow(/Unknown argument: --unknown/);
  });

  it('throws on missing --url value', async () => {
    const { parseArgs } = await importIngest();
    expect(() => parseArgs(['--url'])).toThrow(/Missing value for --url/);
  });

  it('throws on missing --file value', async () => {
    const { parseArgs } = await importIngest();
    expect(() => parseArgs(['--file'])).toThrow(/Missing value for --file/);
  });

  it('throws on missing --db value', async () => {
    const { parseArgs } = await importIngest();
    expect(() => parseArgs(['--db'])).toThrow(/Missing value for --db/);
  });
});
