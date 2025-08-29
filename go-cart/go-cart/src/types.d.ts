// Local type shims to avoid TypeScript checking the TS sources inside
// @shopify/shop-minis-react (which currently ship .ts files with strict errors
// under our project settings). We only need the hook signatures we use.

declare module '@shopify/shop-minis-react' {
  export interface PaginatedDataHookReturnsBase {
    loading: boolean
    error?: unknown
  }
  export interface ProductPrice { amount?: number; currencyCode?: string }
  export interface ProductImage { url?: string }
  export interface Product { id?: string | number; title?: string; featuredImage?: ProductImage; price?: ProductPrice }
  export function useCuratedProducts(params: { handle: string; requiredTags?: string[]; anyOfTags?: string[]; skip?: boolean }): { products: Product[] | null; loading: boolean; error?: unknown }
}


