import { storage } from "./storage";
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

    // We do not persist individual products server-side; items are stored locally with the cart snapshot

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
