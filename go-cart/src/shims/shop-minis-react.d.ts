declare module '@shopify/shop-minis-react' {
  export interface PaginatedDataHookReturnsBase {
    loading: boolean
    error?: unknown
    hasNextPage?: boolean
    fetchMore?: () => Promise<void>
  }
  export interface ProductPrice { amount?: number; currencyCode?: string }
  export interface ProductImage { url?: string }
  export interface Product { id?: string | number; title?: string; featuredImage?: ProductImage; price?: ProductPrice }
  export function useCuratedProducts(params: { handle: string; requiredTags?: string[]; anyOfTags?: string[]; skip?: boolean }): { products: Product[] | null; loading: boolean; error?: unknown; hasNextPage?: boolean; fetchMore?: () => Promise<void> }
  export function useProductSearch(params: { query: string; handle: string; skip?: boolean }): { products: Product[] | null; loading: boolean; error?: unknown; isTyping?: boolean; hasNextPage?: boolean; fetchMore?: () => Promise<void> }
  export function useProduct(params: { id: string | number }): { product: Product | null; loading: boolean; error?: unknown }
  export function useRecommendedProducts(params: { handle: string }): { products: Product[] | null; hasNextPage?: boolean; fetchMore?: () => Promise<void> }
  export function usePopularProducts(params: { handle: string }): { products: Product[] | null; hasNextPage?: boolean; fetchMore?: () => Promise<void> }
  export function useRecentProducts(params: { handle: string }): { products: Product[] | null }
  export function ProductCard(props: { product: Product }): JSX.Element
}


