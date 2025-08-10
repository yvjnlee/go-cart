import type { CartItemProductSnapshot, ShoppingRequest } from '../types'
import { fal } from '@fal-ai/serverless-client'

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

// In-memory optimistic cache keyed by request + product ids
const cartProfileCache = new Map<string, CartProfileCopy>()

export function makeCartProfileKey(request: ShoppingRequest, products: CartItemProductSnapshot[]): string {
  const ids = [...products.map(p => p.id)].sort().join('|')
  return `${request.id}::${ids}`
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
      const response = await fal.run(model, {
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


