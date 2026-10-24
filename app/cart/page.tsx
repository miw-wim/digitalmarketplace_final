"use client";
import Link from "next/link";
import { useCart } from "@/lib/cart-store";
import { useAuth } from "@/lib/auth-context";

const SHIPPING_FEE = 80;

export default function CartPage() {
  const { user } = useAuth();
  const { items, removeFromCart, updateQty, clearCart } = useCart();

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-gray-400 mb-4">Sign in to view your cart.</p>
        <Link href="/login" className="text-violet-400 hover:text-violet-300">Sign in →</Link>
      </div>
    );
  }

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = items.length > 0 ? SHIPPING_FEE : 0;
  const total = subtotal + shipping;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-black text-white">My Cart</h1>
        {items.length > 0 && (
          <button onClick={clearCart} className="text-xs text-red-400 hover:text-red-300 transition-colors">
            Clear all
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🛒</p>
          <p className="text-gray-400 mb-4">Your cart is empty.</p>
          <Link href="/listings" className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-colors text-sm">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Cart items */}
          {items.map((item) => (
            <div key={item.listingId} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-4 items-center">
              {item.image && (
                <img src={item.image} alt={item.title} className="w-16 h-16 rounded-xl object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold truncate">{item.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">by {item.sellerName}</p>
                <p className="text-violet-400 font-bold mt-1">₱{(item.price * item.qty).toLocaleString()}</p>
              </div>

              {/* Qty controls */}
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => item.qty > 1 ? updateQty(item.listingId, item.qty - 1) : removeFromCart(item.listingId)}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold transition-colors flex items-center justify-center">
                  −
                </button>
                <span className="text-white font-semibold w-5 text-center">{item.qty}</span>
                <button onClick={() => updateQty(item.listingId, Math.min(item.stock, item.qty + 1))}
                  disabled={item.qty >= item.stock}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white font-bold transition-colors flex items-center justify-center">
                  +
                </button>
              </div>

              {/* Remove */}
              <button onClick={() => removeFromCart(item.listingId)}
                className="text-gray-500 hover:text-red-400 transition-colors shrink-0 ml-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}

          {/* Summary */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Subtotal ({items.reduce((s, i) => s + i.qty, 0)} item{items.reduce((s, i) => s + i.qty, 0) !== 1 ? "s" : ""})</span>
              <span>₱{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Shipping fee</span>
              <span>₱{shipping}</span>
            </div>
            <div className="flex justify-between text-white font-bold text-base pt-2 border-t border-white/10">
              <span>Total</span>
              <span>₱{total.toLocaleString()}</span>
            </div>
          </div>

          {/* Checkout each item individually */}
          <div className="space-y-2">
            {items.map((item) => (
              <Link key={item.listingId} href={`/checkout/${item.listingId}`}
                className="flex items-center justify-between w-full px-4 py-3 bg-violet-600/20 hover:bg-violet-600/40 border border-violet-500/30 text-violet-300 hover:text-white rounded-xl transition-colors text-sm font-medium">
                <span>Checkout: {item.title}</span>
                <span>₱{(item.price * item.qty + SHIPPING_FEE).toLocaleString()} →</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
