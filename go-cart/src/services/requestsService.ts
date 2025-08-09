import { storage, generateId } from './storage'
import { ShoppingRequest } from '../types'

async function seedDemoRequests(): Promise<ShoppingRequest[]> {
  const now = new Date()
  const demo: ShoppingRequest[] = [
    {
      id: generateId('req'),
      title: 'Cozy Fall Outfit Inspo',
      description: 'Looking for warm neutral-toned outfits for weekend brunch. Size M. Prefer wool/cashmere blends.',
      budget: 250,
      occasion: 'Weekend',
      status: 'open',
      createdAt: new Date(now.getTime() - 1000 * 60 * 5).toISOString(),
      media: {
        type: 'image',
        urls: [
          'https://images.unsplash.com/photo-1516822003754-cca485356ecb?q=80&w=1600&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=1600&auto=format&fit=crop',
        ],
      },
    },
    {
      id: generateId('req'),
      title: 'Minimalist Desk Setup',
      description: 'Need a clean desk setup with a lamp, organizers, and a plant. White/black, small budget.',
      budget: 150,
      status: 'open',
      createdAt: new Date(now.getTime() - 1000 * 60 * 10).toISOString(),
      media: {
        type: 'video',
        urls: ['https://www.w3schools.com/html/mov_bbb.mp4'],
      },
    },
    {
      id: generateId('req'),
      title: 'Gift for sister (college)',
      description: 'She loves stationery, tote bags, and pastel colors.',
      budget: 60,
      occasion: 'Birthday',
      status: 'open',
      createdAt: new Date(now.getTime() - 1000 * 60 * 15).toISOString(),
      media: {
        type: 'text',
      },
    },
  ]
  await storage.saveRequests(demo)
  return demo
}

export const requestsService = {
  async list(): Promise<ShoppingRequest[]> {
    const requests = (await storage.getRequests()) as ShoppingRequest[]
    const source = requests && requests.length > 0 ? requests : await seedDemoRequests()
    // newest first
    return [...source].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  },

  async create(input: Omit<ShoppingRequest, 'id' | 'status' | 'createdAt'>): Promise<ShoppingRequest> {
    const newRequest: ShoppingRequest = {
      id: generateId('req'),
      title: input.title,
      description: input.description,
      budget: input.budget,
      occasion: input.occasion,
      media: input.media,
      status: 'open',
      createdAt: new Date().toISOString(),
    }
    const existing = (await storage.getRequests()) as ShoppingRequest[]
    const updated = [newRequest, ...existing]
    await storage.saveRequests(updated)
    return newRequest
  },

  async close(id: string): Promise<void> {
    const requests = (await storage.getRequests()) as ShoppingRequest[]
    const updated = requests.map(r => (r.id === id ? { ...r, status: 'closed' } : r))
    await storage.saveRequests(updated)
  },
}


