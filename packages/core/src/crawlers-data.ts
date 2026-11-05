export type CrawlerCategory = 'search' | 'ai-training' | 'ai-search' | 'ai-user'

export interface KnownCrawler {
  /** Product token used in `User-agent:` lines. */
  token: string
  operator: string
  category: CrawlerCategory
  description: string
  /** Token only controls usage; the operator crawls with another bot (e.g. Google-Extended). */
  controlToken?: boolean
}

export const CRAWLER_CATEGORY_LABELS: Record<CrawlerCategory, string> = {
  'search': 'Search engines',
  'ai-training': 'AI training',
  'ai-search': 'AI search',
  'ai-user': 'AI user-triggered fetches'
}

/** Shared policy token for AI training; not a crawler, and never matched by `User-agent: *`. */
export const AI_TRAINING_POLICY_TOKEN = '__usage_ai-training'

export const KNOWN_CRAWLERS: readonly KnownCrawler[] = [
  { token: 'Googlebot', operator: 'Google', category: 'search', description: 'Google Search crawler' },
  { token: 'Bingbot', operator: 'Microsoft', category: 'search', description: 'Bing Search crawler (also powers Copilot answers)' },
  { token: 'Applebot', operator: 'Apple', category: 'search', description: 'Siri and Spotlight search crawler' },
  { token: 'DuckDuckBot', operator: 'DuckDuckGo', category: 'search', description: 'DuckDuckGo search crawler' },
  { token: 'YandexBot', operator: 'Yandex', category: 'search', description: 'Yandex search crawler' },
  { token: 'Baiduspider', operator: 'Baidu', category: 'search', description: 'Baidu search crawler' },

  { token: 'GPTBot', operator: 'OpenAI', category: 'ai-training', description: 'Collects content to train OpenAI models' },
  { token: 'ClaudeBot', operator: 'Anthropic', category: 'ai-training', description: 'Collects content to train Anthropic models' },
  { token: AI_TRAINING_POLICY_TOKEN, operator: 'Shared (IETF AIPREF)', category: 'ai-training', description: 'Provider-neutral AI training preference signal (draft-kelley-aipref-training-preference-signal); `User-agent: *` groups do not apply to it', controlToken: true },
  { token: 'Google-Extended', operator: 'Google', category: 'ai-training', description: 'Controls use of Googlebot-crawled content for Gemini training and grounding; does not affect Google Search', controlToken: true },
  { token: 'Applebot-Extended', operator: 'Apple', category: 'ai-training', description: 'Controls use of Applebot-crawled content for Apple AI training', controlToken: true },
  { token: 'CCBot', operator: 'Common Crawl', category: 'ai-training', description: 'Open web crawl widely used as AI training data' },
  { token: 'Meta-ExternalAgent', operator: 'Meta', category: 'ai-training', description: 'Collects content to train Meta AI models' },
  { token: 'Bytespider', operator: 'ByteDance', category: 'ai-training', description: 'Collects content for ByteDance AI models' },
  { token: 'Amazonbot', operator: 'Amazon', category: 'ai-training', description: 'Amazon crawler used for Alexa and AI services' },

  { token: 'OAI-SearchBot', operator: 'OpenAI', category: 'ai-search', description: 'Indexes pages for ChatGPT search results' },
  { token: 'Claude-SearchBot', operator: 'Anthropic', category: 'ai-search', description: 'Indexes pages for Claude search results' },
  { token: 'PerplexityBot', operator: 'Perplexity', category: 'ai-search', description: 'Indexes pages for Perplexity answers' },

  { token: 'ChatGPT-User', operator: 'OpenAI', category: 'ai-user', description: 'Fetches pages when a ChatGPT user asks about them' },
  { token: 'Claude-User', operator: 'Anthropic', category: 'ai-user', description: 'Fetches pages when a Claude user asks about them' },
  { token: 'Perplexity-User', operator: 'Perplexity', category: 'ai-user', description: 'Fetches pages when a Perplexity user asks about them' }
]
