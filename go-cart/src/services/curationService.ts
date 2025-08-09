import type { CartItemProductSnapshot, ShoppingRequest } from '../types'

export interface CuratedSection {
  title: string
  products: CartItemProductSnapshot[]
}

export interface CuratedStore {
  name: string
  url: string
  imageUrl?: string
}

function pickCategoryFromRequest(request: ShoppingRequest): 'fashion' | 'home' | 'gifts' {
  const text = `${request.title} ${request.description}`.toLowerCase()
  if (text.includes('outfit') || text.includes('coat') || text.includes('shoe') || text.includes('dress')) return 'fashion'
  if (text.includes('desk') || text.includes('lamp') || text.includes('setup') || text.includes('home')) return 'home'
  return 'gifts'
}

function demoProducts(category: 'fashion' | 'home' | 'gifts'): CartItemProductSnapshot[] {
  const usd = (price: number) => ({ priceAmount: price, priceCurrencyCode: 'USD' as const })
  switch (category) {
    case 'fashion':
      return [
        { id: 'shopify:prod_fashion_cardigan', title: 'Wool Blend Cardigan', imageUrl: 'https://images.unsplash.com/photo-1520975605360-2bd69fd37fdb?q=80&w=1200&auto=format&fit=crop', ...usd(89) },
        { id: 'shopify:prod_fashion_scarf', title: 'Cashmere Scarf', imageUrl: 'https://images.unsplash.com/photo-1520975856044-0f0c4f3c4f0b?q=80&w=1200&auto=format&fit=crop', ...usd(120) },
        { id: 'shopify:prod_fashion_boots', title: 'Chelsea Boots', imageUrl: 'https://images.unsplash.com/photo-1522276498395-f4f68f7f8450?q=80&w=1200&auto=format&fit=crop', ...usd(160) },
        { id: 'shopify:prod_fashion_trousers', title: 'Pleated Trousers', imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1200&auto=format&fit=crop', ...usd(75) },
        { id: 'shopify:prod_fashion_tote', title: 'Canvas Tote', imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=1200&auto=format&fit=crop', ...usd(35) },
        { id: 'shopify:prod_fashion_beanie', title: 'Rib Knit Beanie', imageUrl: 'https://images.unsplash.com/photo-1516822003754-cca485356ecb?q=80&w=1200&auto=format&fit=crop', ...usd(29) },
      ]
    case 'home':
      return [
        { id: 'shopify:prod_home_lamp', title: 'Minimalist Desk Lamp', imageUrl: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?q=80&w=1200&auto=format&fit=crop', ...usd(45) },
        { id: 'shopify:prod_home_organizer', title: 'Desk Organizer Set', imageUrl: 'https://images.unsplash.com/photo-1499952127939-9bbf5af6c51c?q=80&w=1200&auto=format&fit=crop', ...usd(28) },
        { id: 'shopify:prod_home_plant', title: 'Small Potted Plant', imageUrl: 'https://images.unsplash.com/photo-1459666651636-2f31c97f8b4b?q=80&w=1200&auto=format&fit=crop', ...usd(18) },
        { id: 'shopify:prod_home_mat', title: 'Desk Mat', imageUrl: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?q=80&w=1200&auto=format&fit=crop', ...usd(22) },
        { id: 'shopify:prod_home_chair', title: 'Ergonomic Chair', imageUrl: 'https://images.unsplash.com/photo-1600195077909-46e573870d13?q=80&w=1200&auto=format&fit=crop', ...usd(199) },
        { id: 'shopify:prod_home_laptopstand', title: 'Aluminum Laptop Stand', imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop', ...usd(34) },
      ]
    case 'gifts':
    default:
      return [
        { id: 'shopify:prod_gift_notebook', title: 'A5 Dotted Notebook', imageUrl: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=1200&auto=format&fit=crop', ...usd(16) },
        { id: 'shopify:prod_gift_pens', title: 'Pastel Gel Pens (6)', imageUrl: 'https://images.unsplash.com/photo-1517433456452-f9633a875f6f?q=80&w=1200&auto=format&fit=crop', ...usd(12) },
        { id: 'shopify:prod_gift_tote', title: 'Pastel Canvas Tote', imageUrl: 'https://images.unsplash.com/photo-1601333143042-25d18df3dbba?q=80&w=1200&auto=format&fit=crop', ...usd(22) },
        { id: 'shopify:prod_gift_mug', title: 'Ceramic Mug', imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=1200&auto=format&fit=crop', ...usd(18) },
        { id: 'shopify:prod_gift_candle', title: 'Soy Wax Candle', imageUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1200&auto=format&fit=crop', ...usd(24) },
        { id: 'shopify:prod_gift_stickers', title: 'Sticker Pack', imageUrl: 'https://images.unsplash.com/photo-1587613865761-8870226d63be?q=80&w=1200&auto=format&fit=crop', ...usd(9) },
      ]
  }
}

export const curationService = {
  async getCuratedSections(request: ShoppingRequest): Promise<CuratedSection[]> {
    const category = pickCategoryFromRequest(request)
    const base = demoProducts(category)
    // Produce lightweight sections: curated, recommended, popular
    const curated = base.slice(0, 3)
    const recommended = [...base].reverse().slice(0, 4)
    const popular = [...base].sort((a, b) => (a.priceAmount ?? 0) - (b.priceAmount ?? 0))

    return [
      { title: 'Curated picks', products: curated },
      { title: 'Recommended for this request', products: recommended },
      { title: 'Popular right now', products: popular },
    ]
  },
  async getCuratedStores(request: ShoppingRequest): Promise<CuratedStore[]> {
    const category = pickCategoryFromRequest(request)
    if (category === 'fashion') {
      return [
        { name: 'Everlane', url: 'https://www.everlane.com', imageUrl: 'https://logo.clearbit.com/everlane.com' },
        { name: 'Uniqlo', url: 'https://www.uniqlo.com', imageUrl: 'https://logo.clearbit.com/uniqlo.com' },
        { name: 'COS', url: 'https://www.cos.com', imageUrl: 'https://logo.clearbit.com/cos.com' },
      ]
    }
    if (category === 'home') {
      return [
        { name: 'IKEA', url: 'https://www.ikea.com', imageUrl: 'https://logo.clearbit.com/ikea.com' },
        { name: 'MUJI', url: 'https://www.muji.com', imageUrl: 'https://logo.clearbit.com/muji.com' },
        { name: 'CB2', url: 'https://www.cb2.com', imageUrl: 'https://logo.clearbit.com/cb2.com' },
      ]
    }
    return [
      { name: 'Paper Source', url: 'https://www.papersource.com', imageUrl: 'https://logo.clearbit.com/papersource.com' },
      { name: 'Etsy', url: 'https://www.etsy.com', imageUrl: 'https://logo.clearbit.com/etsy.com' },
      { name: 'Typo', url: 'https://cottonon.com/US/typo/', imageUrl: 'https://logo.clearbit.com/cottonon.com' },
    ]
  },
}


