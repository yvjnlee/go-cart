import { SubmittedCart } from "../types";
import { getConfiguredShopifyUserId } from "./api";

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE || "http://localhost:8000";

export const cartsService = {
  async listMineByRequest(requestId: string): Promise<SubmittedCart[]> {
    const [cartsRes, cartProductsRes] = await Promise.all([
      fetch(`${API_BASE}/carts/`),
      fetch(`${API_BASE}/cart-products/`),
    ]);
    if (!cartsRes.ok || !cartProductsRes.ok) {
      throw new Error("Failed to fetch carts");
    }

    const cartsData = (await cartsRes.json()) as Array<{
      cart_id: string;
      request_id: string;
      shopify_user_id: string;
      created_at: string;
      updated_at: string;
    }>;
    const cartProducts = (await cartProductsRes.json()) as Array<{
      cart_id: string;
      product_id: string;
      created_at: string;
      updated_at: string;
    }>;

    const currentUserId = getConfiguredShopifyUserId();
    const mine = cartsData.filter(
      (c) => c.request_id === requestId && c.shopify_user_id === currentUserId
    );

    const countsByCart = new Map<string, number>();
    for (const cp of cartProducts) {
      countsByCart.set(cp.cart_id, (countsByCart.get(cp.cart_id) || 0) + 1);
    }

    const result: SubmittedCart[] = mine
      .map((c) => ({
        id: c.cart_id,
        requestId: c.request_id,
        submittedAt: c.created_at,
        items: new Array(countsByCart.get(c.cart_id) || 0)
          .fill(null)
          .map(() => ({
            product: { id: "", title: undefined, imageUrl: undefined },
            quantity: 1,
          })) as any,
        reasoning: undefined,
      }))
      .sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
    return result;
  },
  async listByRequest(requestId: string): Promise<SubmittedCart[]> {
    const [cartsRes, cartProductsRes] = await Promise.all([
      fetch(`${API_BASE}/carts/`),
      fetch(`${API_BASE}/cart-products/`),
    ]);
    if (!cartsRes.ok || !cartProductsRes.ok) {
      throw new Error("Failed to fetch carts");
    }

    const cartsData = (await cartsRes.json()) as Array<{
      cart_id: string;
      request_id: string;
      shopify_user_id: string;
      created_at: string;
      updated_at: string;
    }>;
    const cartProducts = (await cartProductsRes.json()) as Array<{
      cart_id: string;
      product_id: string;
      created_at: string;
      updated_at: string;
    }>;

    const filtered = cartsData.filter((c) => c.request_id === requestId);

    const countsByCart = new Map<string, number>();
    for (const cp of cartProducts) {
      countsByCart.set(cp.cart_id, (countsByCart.get(cp.cart_id) || 0) + 1);
    }

    const result: SubmittedCart[] = filtered
      .map((c) => ({
        id: c.cart_id,
        requestId: c.request_id,
        submittedAt: c.created_at,
        items: new Array(countsByCart.get(c.cart_id) || 0)
          .fill(null)
          .map(() => ({
            product: { id: "", title: undefined, imageUrl: undefined },
            quantity: 1,
          })) as any,
        reasoning: undefined,
      }))
      .sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
    return result;
  },

  async submit(
    input: Omit<SubmittedCart, "id" | "submittedAt">
  ): Promise<SubmittedCart> {
    // Create cart record
    const createRes = await fetch(`${API_BASE}/carts/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        request_id: input.requestId,
        shopify_user_id: getConfiguredShopifyUserId(),
      }),
    });
    if (!createRes.ok)
      throw new Error(`Failed to create cart: ${createRes.status}`);
    const cart = await createRes.json();
    const cartId = cart.cart_id as string;

    // Ensure products exist and link to cart
    for (const item of input.items) {
      const shopifyProductId = item.product.id;
      const shopifyVariantId = item.product.id;
      // Create a product and capture its internal product_id (UUID)
      const prodRes = await fetch(`${API_BASE}/products/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopify_product_id: shopifyProductId,
          shopify_variant_id: shopifyVariantId,
        }),
      });
      if (!prodRes.ok)
        throw new Error(`Failed to create product: ${prodRes.status}`);
      const prod = await prodRes.json();
      const productId = prod.product_id as string;
      // Link product to cart
      const cpRes = await fetch(`${API_BASE}/cart-products/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart_id: cartId, product_id: productId }),
      });
      if (!cpRes.ok)
        throw new Error(`Failed to add product to cart: ${cpRes.status}`);
    }

    const newCart: SubmittedCart = {
      ...input,
      id: cartId,
      submittedAt: new Date().toISOString(),
    };
    return newCart;
  },
};
