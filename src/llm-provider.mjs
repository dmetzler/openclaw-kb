/**
 * LLM provider auto-detection and factory.
 *
 * Creates a provider-agnostic LLM interface that matches the
 * {@link import('./extractor.mjs').LLMProvider} typedef:
 *   { complete(systemPrompt, userPrompt) => Promise<string> }
 *
 * Detection order: OPENAI_API_KEY → ANTHROPIC_API_KEY → Ollama (local) → error.
 * Override with LLM_PROVIDER env var to force a specific backend.
 *
 * @module llm-provider
 */

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

const DEFAULT_MODELS = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-haiku-4-5',
  ollama: 'llama3.2',
};

const DEFAULT_MAX_TOKENS = 4096;
const OLLAMA_TIMEOUT_MS = 120_000;

/**
 * Returns the Ollama base URL from env or default.
 * @returns {string}
 */
function _ollamaUrl() {
  return process.env.OLLAMA_URL ?? 'http://localhost:11434';
}

/**
 * Creates an OpenAI-backed LLM provider.
 *
 * @param {{ apiKey?: string, model?: string, maxTokens?: number }} [options]
 * @returns {import('./extractor.mjs').LLMProvider}
 */
export function createOpenAIProvider(options = {}) {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  const model = options.model ?? process.env.LLM_MODEL ?? DEFAULT_MODELS.openai;
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required for the OpenAI provider');
  }

  return {
    complete: async (systemPrompt, userPrompt) => {
      const response = await fetch(OPENAI_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: maxTokens,
          temperature: 0,
        }),
      });

      if (!response.ok) {
        let detail = '';
        try {
          const body = await response.json();
          detail = body.error?.message ?? JSON.stringify(body);
        } catch {
          detail = await response.text().catch(() => '');
        }
        throw new Error(`OpenAI API error (HTTP ${response.status}): ${detail}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== 'string') {
        throw new Error('OpenAI returned unexpected response shape');
      }
      return content;
    },
  };
}

/**
 * Creates an Anthropic-backed LLM provider.
 *
 * @param {{ apiKey?: string, model?: string, maxTokens?: number }} [options]
 * @returns {import('./extractor.mjs').LLMProvider}
 */
export function createAnthropicProvider(options = {}) {
  const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;
  const model = options.model ?? process.env.LLM_MODEL ?? DEFAULT_MODELS.anthropic;
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is required for the Anthropic provider');
  }

  return {
    complete: async (systemPrompt, userPrompt) => {
      const response = await fetch(ANTHROPIC_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: [
            { role: 'user', content: userPrompt },
          ],
          temperature: 0,
        }),
      });

      if (!response.ok) {
        let detail = '';
        try {
          const body = await response.json();
          detail = body.error?.message ?? JSON.stringify(body);
        } catch {
          detail = await response.text().catch(() => '');
        }
        throw new Error(`Anthropic API error (HTTP ${response.status}): ${detail}`);
      }

      const data = await response.json();
      const content = data.content?.[0]?.text;
      if (typeof content !== 'string') {
        throw new Error('Anthropic returned unexpected response shape');
      }
      return content;
    },
  };
}

/**
 * Creates an Ollama-backed LLM provider.
 *
 * @param {{ baseUrl?: string, model?: string, timeoutMs?: number }} [options]
 * @returns {import('./extractor.mjs').LLMProvider}
 */
export function createOllamaProvider(options = {}) {
  const baseUrl = options.baseUrl ?? _ollamaUrl();
  const model = options.model ?? process.env.LLM_MODEL ?? DEFAULT_MODELS.ollama;
  const timeoutMs = options.timeoutMs ?? OLLAMA_TIMEOUT_MS;

  return {
    complete: async (systemPrompt, userPrompt) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      let response;
      try {
        response = await fetch(`${baseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            stream: false,
          }),
          signal: controller.signal,
        });
      } catch (error) {
        if (error.name === 'AbortError') {
          throw new Error('Ollama request timed out');
        }
        throw new Error(`Ollama connection failed: ${error.message}`);
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        let detail = '';
        try {
          const body = await response.json();
          detail = body.error ?? JSON.stringify(body);
        } catch {
          detail = await response.text().catch(() => '');
        }
        throw new Error(`Ollama API error (HTTP ${response.status}): ${detail}`);
      }

      const data = await response.json();
      const content = data.message?.content;
      if (typeof content !== 'string') {
        throw new Error('Ollama returned unexpected response shape');
      }
      return content;
    },
  };
}

/**
 * Checks whether Ollama is reachable and has at least one chat-capable model.
 *
 * @param {{ baseUrl?: string, model?: string }} [options]
 * @returns {Promise<boolean>}
 */
export async function isOllamaChatAvailable(options = {}) {
  const baseUrl = options.baseUrl ?? _ollamaUrl();
  const preferredModel = options.model ?? process.env.LLM_MODEL;

  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      return false;
    }
    const data = await response.json();
    const models = data.models ?? [];

    if (models.length === 0) {
      return false;
    }

    // If a specific model is requested, check for it
    if (preferredModel) {
      return models.some((m) => m.name === preferredModel || m.name?.startsWith(`${preferredModel}:`));
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Auto-detects the best available LLM provider and returns a ready-to-use instance.
 *
 * Detection order:
 *  1. LLM_PROVIDER env var (force a specific provider)
 *  2. OPENAI_API_KEY env var → OpenAI
 *  3. ANTHROPIC_API_KEY env var → Anthropic
 *  4. Ollama running locally with a chat model → Ollama
 *  5. Throw with actionable error message
 *
 * @param {{ provider?: string, model?: string, apiKey?: string }} [options]
 * @returns {Promise<import('./extractor.mjs').LLMProvider>}
 * @throws {Error} If no LLM provider is available.
 */
export async function createLLMProvider(options = {}) {
  const forcedProvider = options.provider ?? process.env.LLM_PROVIDER;

  if (forcedProvider) {
    const normalized = forcedProvider.toLowerCase().trim();
    if (normalized === 'openai') {
      return createOpenAIProvider(options);
    }
    if (normalized === 'anthropic') {
      return createAnthropicProvider(options);
    }
    if (normalized === 'ollama') {
      return createOllamaProvider(options);
    }
    throw new Error(
      `Unknown LLM_PROVIDER "${forcedProvider}". Supported: openai, anthropic, ollama`,
    );
  }

  // Auto-detect
  if (process.env.OPENAI_API_KEY) {
    return createOpenAIProvider(options);
  }

  if (process.env.ANTHROPIC_API_KEY) {
    return createAnthropicProvider(options);
  }

  if (await isOllamaChatAvailable(options)) {
    return createOllamaProvider(options);
  }

  throw new Error(
    'No LLM provider available. Set one of:\n'
    + '  - OPENAI_API_KEY      (uses OpenAI gpt-4o-mini)\n'
    + '  - ANTHROPIC_API_KEY   (uses Anthropic Claude)\n'
    + '  - Ollama running at ' + _ollamaUrl() + '\n'
    + '  - LLM_PROVIDER=openai|anthropic|ollama  (force a provider)',
  );
}
