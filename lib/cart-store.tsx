"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface CartItem {
  listingId: string;
  title: string;
  image: string;
  price: number;
  sellerName: string;
  sellerId: string;
  qty: number;
  stock: number;
}

interface CartContextValue {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, "qty">) => void;
  removeFromCart: (listingId: string) => void;
  updateQty: (listingId: string, qty: number) => void;
  clearCart: () => void;
  totalItems: number;
}

const CartContext = createContext<CartContextValue>({
  items: [],
  addToCart: () => {},
  removeFromCart: () => {},
  updateQty: () => {},
  clearCart: () => {},
  totalItems: 0,
});

const STORAGE_KEY = "shopora_cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setItems(JSON.parse(saved));
    } catch {}
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addToCart = (item: Omit<CartItem, "qty">) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.listingId === item.listingId);
      if (existing) {
        return prev.map((i) =>
          i.listingId === item.listingId
            ? { ...i, qty: Math.min(i.qty + 1, item.stock) }
            : i
        );
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const removeFromCart = (listingId: string) =>
    setItems((prev) => prev.filter((i) => i.listingId !== listingId));

  const updateQty = (listingId: string, qty: number) =>
    setItems((prev) => prev.map((i) => i.listingId === listingId ? { ...i, qty } : i));

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((s, i) => s + i.qty, 0);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQty, clearCart, totalItems }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
