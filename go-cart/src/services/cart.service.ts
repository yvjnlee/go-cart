import { storage, generateId } from "./storage";
import { SubmittedCart } from "../types";

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE || "http://localhost:8000";

export const cartsService = {
  async listByRequest(requestId: string): Promise<SubmittedCart[]> {
    const carts = (await storage.getCarts()) as SubmittedCart[];
    return carts
      .filter((c) => c.requestId === requestId)
      .sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
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
        shopify_user_id: "demo-user",
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
    const existing = (await storage.getCarts()) as SubmittedCart[];
    await storage.saveCarts([newCart, ...existing]);
    return newCart;
  },
};
