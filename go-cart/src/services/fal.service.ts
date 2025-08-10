import type { CartItemProductSnapshot, ShoppingRequest } from '../types'
import * as falClient from '@fal-ai/serverless-client'
const fal: any = (falClient as any).fal ?? falClient

// Configure FAL if credentials exist; otherwise calls will fall back to local synthesis
const FAL_KEY = (import.meta as any).env?.VITE_FAL_KEY as string | undefined
const FAL_MODEL = ((import.meta as any).env?.VITE_FAL_MODEL as string | undefined) || 'fal-ai/llama-3.1-70b-instruct'
if (FAL_KEY && fal?.config) {
  fal.config({ credentials: FAL_KEY })
}

export interface CartProfileCopy {
  name?: string
  vibe?: string
  about: string
  prompts: Array<{ prompt: string; answer: string }>
  productTaglines: Record<string, string> // key by product.id
  source?: 'fal' | 'local'
  sourceModel?: string
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
    'You are a playful brand storyteller. Create an engaging, fun cart spotlight that personifies the cart and highlights each product persuasively—as if it were a dating profile.',
    'Tone: lively, witty, concise, and tasteful. Add a dash of personality and delight. You may use 1–2 tasteful emojis total. Avoid cringe or over-the-top hype.',
    'Audience: general shoppers. Keep it brand-safe and positive.',
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
    '{\n  "name": string,\n  "vibe": string,\n  "about": string,\n  "prompts": [{"prompt": string, "answer": string}, {"prompt": string, "answer": string}, {"prompt": string, "answer": string}],\n  "productTaglines": { [productId: string]: string }\n}',
    'Rules:',
    '- Keep total under 200 words (about + prompts + taglines).',
    '- Prompts should be on-brand and helpful (e.g., "What this set delivers:", "Why these together:", "Best for:").',
    '- Product taglines: one sentence each, punchy and benefit-led. Optional single emoji is okay, but not required.',
    '- Do not mention that you are an AI. Do not include markdown. Output valid JSON only.',
  ].join('\n')
}

function localFallbackCopy(request: ShoppingRequest, products: CartItemProductSnapshot[]): CartProfileCopy {
  const prompts = [
    { prompt: 'What this set delivers', answer: 'Playful, everyday upgrades that feel intentional—not improvised. ✨' },
    { prompt: 'Why these together', answer: `Cohesive picks that stretch a ~$${request.budget} budget without skimping on delight.` },
    { prompt: 'Best for', answer: 'Confident gifting or refreshing the daily routine with pieces that actually get used.' },
  ]
  const productTaglines: Record<string, string> = {}
  products.forEach(p => {
    productTaglines[p.id] = `${p.title || 'This pick'}: a small joy with everyday impact—easy to love, easier to use.`
  })
  const about = `“${request.title}” — a cheerful, well-edited set for ${request.description.slice(0, 120)}... Thoughtful, useful, and a little bit fun.`
  const name = 'The Elevated Essentials'
  const vibe = 'Polished but playful; practical with personality'
  return { name, vibe, about, prompts, productTaglines, source: 'local' }
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
      const model = FAL_MODEL
      const response = await fal.run(model, {
        input: {
          prompt,
          temperature: options?.temperature ?? 0.9,
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
      const enriched: CartProfileCopy = { ...parsed, source: 'fal', sourceModel: model }
      return enriched
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

// --- Collage generation (client-side canvas) ---
export async function generateCartCollageDataUrl(
  products: CartItemProductSnapshot[],
  options?: { width?: number; height?: number; background?: string }
): Promise<string | null> {
  const width = options?.width ?? 1200
  const height = options?.height ?? 640 // 15:8-ish hero
  const background = options?.background ?? '#ffffff'
  const imageUrls = products.map(p => p.imageUrl).filter(Boolean) as string[]
  if (imageUrls.length === 0) return null

  function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })
  }

  const images = await Promise.allSettled(imageUrls.slice(0, 8).map(loadImage))
  const loaded = images.filter(r => r.status === 'fulfilled').map(r => (r as PromiseFulfilledResult<HTMLImageElement>).value)
  if (loaded.length === 0) return null

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  // background
  ctx.fillStyle = background
  ctx.fillRect(0, 0, width, height)

  // simple aesthetic grid with varying sizes
  const margin = 16
  const radius = 18

  type Rect = { x: number; y: number; w: number; h: number }
  const rects: Rect[] = []
  // Layout patterns for 1..8 images
  const W = width - margin * 2
  const H = height - margin * 2
  const halfW = Math.floor((W - margin) / 2)
  const thirdW = Math.floor((W - margin * 2) / 3)
  const halfH = Math.floor((H - margin) / 2)
  const thirdH = Math.floor((H - margin * 2) / 3)

  const n = loaded.length
  const baseX = margin
  const baseY = margin

  if (n === 1) {
    rects.push({ x: baseX, y: baseY, w: W, h: H })
  } else if (n === 2) {
    rects.push({ x: baseX, y: baseY, w: halfW, h: H })
    rects.push({ x: baseX + halfW + margin, y: baseY, w: W - halfW - margin, h: H })
  } else if (n === 3) {
    rects.push({ x: baseX, y: baseY, w: halfW, h: H })
    rects.push({ x: baseX + halfW + margin, y: baseY, w: W - halfW - margin, h: halfH })
    rects.push({ x: baseX + halfW + margin, y: baseY + halfH + margin, w: W - halfW - margin, h: H - halfH - margin })
  } else if (n === 4) {
    rects.push({ x: baseX, y: baseY, w: halfW, h: halfH })
    rects.push({ x: baseX + halfW + margin, y: baseY, w: W - halfW - margin, h: halfH })
    rects.push({ x: baseX, y: baseY + halfH + margin, w: thirdW * 2 + margin, h: H - halfH - margin })
    rects.push({ x: baseX + thirdW * 2 + margin * 2, y: baseY + halfH + margin, w: W - (thirdW * 2 + margin * 2), h: H - halfH - margin })
  } else {
    // 5-8: three-column collage
    let y1 = baseY, y2 = baseY, y3 = baseY
    const colW = thirdW
    const cols = [
      { x: baseX, y: () => y1, setY: (v: number) => { y1 = v } },
      { x: baseX + colW + margin, y: () => y2, setY: (v: number) => { y2 = v } },
      { x: baseX + (colW + margin) * 2, y: () => y3, setY: (v: number) => { y3 = v } },
    ]
    loaded.forEach((_, i) => {
      const col = cols[i % 3]
      const h = i % 3 === 0 ? thirdH * 1.4 : thirdH
      rects.push({ x: col.x, y: col.y(), w: colW, h: Math.min(h, baseY + H - col.y()) })
      col.setY(col.y() + h + margin)
    })
  }

  function drawRounded(img: HTMLImageElement, r: Rect) {
    const { x, y, w, h } = r
    ctx.save()
    const rr = radius
    ctx.beginPath()
    ctx.moveTo(x + rr, y)
    ctx.arcTo(x + w, y, x + w, y + h, rr)
    ctx.arcTo(x + w, y + h, x, y + h, rr)
    ctx.arcTo(x, y + h, x, y, rr)
    ctx.arcTo(x, y, x + w, y, rr)
    ctx.closePath()
    ctx.clip()
    // cover fit
    const imgAspect = img.width / img.height
    const rectAspect = w / h
    let dw = w, dh = h, dx = x, dy = y
    if (imgAspect > rectAspect) {
      // image is wider
      dh = h
      dw = h * imgAspect
      dx = x - (dw - w) / 2
    } else {
      dw = w
      dh = w / imgAspect
      dy = y - (dh - h) / 2
    }
    ctx.drawImage(img, dx, dy, dw, dh)
    ctx.restore()
  }

  for (let i = 0; i < Math.min(loaded.length, rects.length); i++) {
    drawRounded(loaded[i], rects[i])
  }

  // subtle border overlay
  ctx.strokeStyle = 'rgba(0,0,0,0.06)'
  ctx.lineWidth = 1
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1)

  return canvas.toDataURL('image/jpeg', 0.9)
}

