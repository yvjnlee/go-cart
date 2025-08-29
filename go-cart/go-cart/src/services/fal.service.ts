import type { CartItemProductSnapshot, ShoppingRequest } from '../types'
import fal from '@fal-ai/serverless-client'

// Configure FAL if credentials exist; otherwise calls will fall back to local synthesis
const FAL_KEY = (import.meta as any).env?.VITE_FAL_KEY as string | undefined
if (FAL_KEY && fal?.config) {
  fal.config({ credentials: FAL_KEY })
}

export interface CartProfileCopy {
  about: string
  prompts: Array<{ prompt: string; answer: string }>
  productTaglines: Record<string, string> // key by product.id
}

export interface GeneratedTagsResult {
  summary: string
  tags: string[]
}

// In-memory optimistic cache keyed by request + product ids
const cartProfileCache = new Map<string, CartProfileCopy>()
const requestTagsCache = new Map<string, GeneratedTagsResult>()

export function makeCartProfileKey(request: ShoppingRequest, products: CartItemProductSnapshot[]): string {
  const ids = [...products.map(p => p.id)].sort().join('|')
  return `${request.id}::${ids}`
}

function makeRequestTagsKey(request: ShoppingRequest): string {
  // Key on stable request fields likely to affect tags
  const mediaKey = request.media?.text || (request.media?.urls || []).join('|') || ''
  return `${request.id}::${request.title}::${request.description}::${mediaKey}`
}

function buildPrompt(request: ShoppingRequest, products: CartItemProductSnapshot[]): string {
  const productLines = products.map(p => `- id: ${p.id}\n  title: ${p.title || ''}\n  price: ${p.priceCurrencyCode || 'USD'} ${p.priceAmount ?? ''}`).join('\n')
  const reqOccasion = request.occasion ? `Occasion: ${request.occasion}` : ''
  return [
    'You are an expert brand storyteller. Create an engaging cart spotlight / merchandising brief that personifies the cart and highlights each product persuasively.',
    'Write concise, tasteful copy suitable for a shoppable interface. Avoid gimmicks or references to dating apps.',
    'Tone: witty, concise, polished.',
    '',
    'Request context:',
    `- Title: ${request.title}`,
    `- Description: ${request.description}`,
    `- Budget: ${request.budget}`,
    `- ${reqOccasion}`,
    '',
    'Products to highlight (use each at least once):',
    productLines,
    '',
    'Return STRICT JSON with this shape:',
    '{\n  "about": string,\n  "prompts": [{"prompt": string, "answer": string}, {"prompt": string, "answer": string}, {"prompt": string, "answer": string}],\n  "productTaglines": { [productId: string]: string }\n}',
    'Rules:',
    '- Keep total under 200 words.',
    '- Prompts should be professional and on-brand (e.g., "What this set delivers:", "Why these together:", "Best for:").',
    '- Product taglines should be one sentence each and persuasive.',
  ].join('\n')
}

function localFallbackCopy(request: ShoppingRequest, products: CartItemProductSnapshot[]): CartProfileCopy {
  const prompts = [
    { prompt: 'What this set delivers', answer: 'smart value and everyday usability—styled to feel intentional, not improvised.' },
    { prompt: 'Why these together', answer: `cohesive picks that make the most of a ~$${request.budget} budget without compromising quality.` },
    { prompt: 'Best for', answer: 'gifting confidently or upgrading the everyday with pieces that actually get used.' },
  ]
  const productTaglines: Record<string, string> = {}
  products.forEach(p => {
    productTaglines[p.id] = `${p.title || 'This pick'}: the kind of ${p.title ? p.title.toLowerCase() : 'find'} that earns compliments and gets used daily.`
  })
  const about = `A concise spotlight for “${request.title}.” Practical, polished, and on-brief—curated so ${request.description.slice(0, 120)}...`
  return { about, prompts, productTaglines }
}

export async function generateCartSpotlightCopy(
  request: ShoppingRequest,
  products: CartItemProductSnapshot[],
  options?: { temperature?: number }
): Promise<CartProfileCopy> {
  // If no products, nothing to sell—fallback to a minimal persona
  if (!products || products.length === 0) {
    return localFallbackCopy(request, products)
  }

  const prompt = buildPrompt(request, products)

  // Try FAL SDK if available
  if (fal && typeof fal.run === 'function' && FAL_KEY) {
    try {
      // eslint-disable-next-line no-console
      console.debug('[fal] calling model for cart profile', { requestId: request.id, productCount: products.length })
      const model = 'fal-ai/llama-3.1-8b-instruct'
      const response: any = await fal.run(model, {
        input: {
          prompt,
          temperature: options?.temperature ?? 0.7,
        },
      })
      const raw = (response?.output_text ?? response?.response ?? '').toString()
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      const jsonText = jsonMatch ? jsonMatch[0] : raw
      const parsed = JSON.parse(jsonText)
      // Validate minimal shape
      if (!parsed || !parsed.prompts || !parsed.productTaglines) {
        // eslint-disable-next-line no-console
        console.warn('[fal] invalid response shape; falling back')
        return localFallbackCopy(request, products)
      }
      // eslint-disable-next-line no-console
      console.debug('[fal] model success')
      return parsed as CartProfileCopy
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[fal] model error; falling back', err)
      // Fall back to local synthesis
      return localFallbackCopy(request, products)
    }
  }

  // No SDK; fallback
  return localFallbackCopy(request, products)
}

function buildTagsPrompt(request: ShoppingRequest): string {
  const lines: string[] = []
  lines.push('You are an expert retail merchandiser and social commerce strategist.')
  lines.push('Summarize the user\'s media post and generate high-signal shopping intent tags we can use to curate products.')
  lines.push('Use short, lowercase tags with hyphens where helpful (e.g., "summer-brunch", "budget-gift", "cozy-minimal").')
  lines.push('Avoid emojis, hashtags, usernames, or platform-specific jargon. No private info.')
  lines.push('Return STRICT JSON: { "summary": string, "tags": string[] }')
  lines.push('Aim for 8-12 tags capturing style, use-cases, price/quality intent, materials, aesthetics, occasion, and audience.')
  lines.push('Context:')
  lines.push(`- Title: ${request.title}`)
  lines.push(`- Description: ${request.description}`)
  lines.push(`- Budget: ${request.budget}`)
  if (request.occasion) lines.push(`- Occasion: ${request.occasion}`)
  if (request.media?.text) lines.push(`- Media caption/text: ${request.media.text}`)
  if (request.media?.type) lines.push(`- Media type: ${request.media.type}`)
  if (request.media?.urls && request.media.urls.length > 0) {
    lines.push(`- Media urls (reference only): ${(request.media.urls || []).join(', ')}`)
  }
  return lines.join('\n')
}

function localFallbackTags(request: ShoppingRequest): GeneratedTagsResult {
  const baseText = `${request.title} ${request.description} ${request.media?.text || ''}`.toLowerCase()
  const tags = Array.from(
    new Set(
      baseText
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
        .map(t => t.length > 18 ? t.slice(0, 18) : t)
    )
  )
    .filter(t => t.length >= 3)
    .slice(0, 10)
  const summary = request.description.slice(0, 160)
  return { summary, tags }
}

export async function generateRequestTags(request: ShoppingRequest, options?: { temperature?: number }): Promise<GeneratedTagsResult> {
  const key = makeRequestTagsKey(request)
  const cached = requestTagsCache.get(key)
  if (cached) return cached

  const prompt = buildTagsPrompt(request)
  if (fal && typeof fal.run === 'function' && FAL_KEY) {
    try {
      // eslint-disable-next-line no-console
      console.debug('[fal] calling model for request tags', { requestId: request.id })
      const model = 'fal-ai/llama-3.1-8b-instruct'
      const response: any = await fal.run(model, {
        input: {
          prompt,
          temperature: options?.temperature ?? 0.4,
        },
      })
      const raw = (response?.output_text ?? response?.response ?? '').toString()
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      const jsonText = jsonMatch ? jsonMatch[0] : raw
      const parsed = JSON.parse(jsonText)
      if (!parsed || !Array.isArray(parsed.tags)) {
        // eslint-disable-next-line no-console
        console.warn('[fal] invalid tags response; falling back')
        const fallback = localFallbackTags(request)
        requestTagsCache.set(key, fallback)
        return fallback
      }
      const normalized = parsed.tags
        .map((t: unknown) => String(t || '').toLowerCase().trim())
        .filter(Boolean)
        .map((t: string) => t.replace(/[^a-z0-9-]/g, '-'))
        .map((t: string) => t.replace(/--+/g, '-'))
        .map((t: string) => t.replace(/^-+|-+$/g, ''))
        .filter((t: string) => t.length >= 2 && t.length <= 24)
      const deduped: string[] = Array.from(new Set<string>(normalized))
      const cleaned: GeneratedTagsResult = {
        summary: String(parsed.summary || '').slice(0, 240),
        tags: deduped.slice(0, 12),
      }
      // eslint-disable-next-line no-console
      console.debug('[fal] tags model success', cleaned)
      requestTagsCache.set(key, cleaned)
      return cleaned
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[fal] model error (tags); falling back', err)
      const fallback = localFallbackTags(request)
      requestTagsCache.set(key, fallback)
      return fallback
    }
  }
  const fallback = localFallbackTags(request)
  requestTagsCache.set(key, fallback)
  return fallback
}

function buildSearchPrompt(request: ShoppingRequest): string {
  const lines: string[] = []
  lines.push('You are an expert retail merchandiser. Create a concise ecommerce search query string for finding products that fit the brief below.')
  lines.push('Return ONLY the query text, no JSON, no quotes.')
  lines.push('Keep under 10 words. Prefer specific attributes, materials, styles, occasions, and budget hints.')
  lines.push('Avoid brand names unless explicitly provided. Use simple separators like commas.')
  lines.push('Brief:')
  lines.push(`- Title: ${request.title}`)
  lines.push(`- Description: ${request.description}`)
  if (request.occasion) lines.push(`- Occasion: ${request.occasion}`)
  if (request.budget) lines.push(`- Budget: ~$${request.budget}`)
  if (request.media?.text) lines.push(`- Media caption/text: ${request.media.text}`)
  return lines.join('\n')
}

function localFallbackSearchQuery(request: ShoppingRequest): string {
  const base = `${request.title} ${request.description} ${request.media?.text || ''}`
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  const keywords = Array.from(new Set(base))
    .filter((w) => w.length >= 3)
    .slice(0, 8)
  const parts: string[] = []
  if (request.occasion) parts.push(request.occasion.toLowerCase())
  if (request.budget) parts.push(`under $${request.budget}`)
  parts.push(...keywords)
  return parts.slice(0, 10).join(', ')
}

export async function generateProductSearchQuery(
  request: ShoppingRequest,
  options?: { temperature?: number }
): Promise<string> {
  const prompt = buildSearchPrompt(request)
  if (fal && typeof fal.run === 'function' && FAL_KEY) {
    try {
      // eslint-disable-next-line no-console
      console.debug('[fal] calling model for product search query', { requestId: request.id })
      const model = 'fal-ai/llama-3.1-8b-instruct'
      const response: any = await fal.run(model, {
        input: {
          prompt,
          temperature: options?.temperature ?? 0.3,
        },
      })
      const raw = (response?.output_text ?? response?.response ?? '').toString().trim()
      const oneLine = raw.replace(/\s+/g, ' ').replace(/^"|"$/g, '')
      if (oneLine.length > 0) return oneLine.slice(0, 200)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[fal] query model error; falling back', err)
    }
  }
  return localFallbackSearchQuery(request)
}

export async function getOrGenerateCartProfileCopy(
  request: ShoppingRequest,
  products: CartItemProductSnapshot[],
  options?: { temperature?: number }
): Promise<CartProfileCopy> {
  const key = makeCartProfileKey(request, products)
  const cached = cartProfileCache.get(key)
  if (cached) return cached
  const copy = await generateCartSpotlightCopy(request, products, options)
  cartProfileCache.set(key, copy)
  // eslint-disable-next-line no-console
  console.debug('[fal] cached cart profile', { key })
  return copy
}

export function prefetchCartProfileCopy(
  request: ShoppingRequest,
  products: CartItemProductSnapshot[],
  options?: { temperature?: number }
): void {
  const key = makeCartProfileKey(request, products)
  if (cartProfileCache.has(key)) return
  // Fire-and-forget; errors are ignored
  // eslint-disable-next-line no-console
  console.debug('[fal] prefetch cart profile', { key })
  getOrGenerateCartProfileCopy(request, products, options).catch(() => {})
}

export function getCachedCartProfileCopy(
  request: ShoppingRequest,
  products: CartItemProductSnapshot[]
): CartProfileCopy | undefined {
  return cartProfileCache.get(makeCartProfileKey(request, products))
}


