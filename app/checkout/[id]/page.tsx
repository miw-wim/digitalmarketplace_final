"use client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiGetListing } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useOrders } from "@/lib/orders-store";
import PaymentMethodSelector from "@/components/PaymentMethodSelector";
import { useToast } from "@/components/Toast";
import type { Listing, PaymentMethod, Order } from "@/lib/types";
import { useSettings } from "@/lib/settings-store";

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { shippingFee } = useSettings();
  const { addOrder } = useOrders();
  const { showToast } = useToast();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState<PaymentMethod>("gcash");
  const [placing, setPlacing] = useState(false);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    apiGetListing(id).then((l) => { setListing(l); setLoading(false); });
  }, [id]);

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-gray-400 mb-4">You need to be logged in to checkout.</p>
        <Link href="/login" className="text-violet-400 hover:text-violet-300">Sign in →</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />)}</div>
          <div className="h-64 bg-white/5 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!listing || listing.status !== "active") {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-4xl mb-3">🔍</p>
        <h2 className="text-xl font-bold text-white mb-2">Item not available</h2>
        <Link href="/listings" className="text-violet-400 hover:text-violet-300">← Browse listings</Link>
      </div>
    );
  }

  const addr = user.address;
  const itemTotal = listing.price * qty;
  const total = itemTotal + shippingFee;

  const handleCOD = async () => {
    if (!addr) return;
    setPlacing(true);
    await new Promise((r) => setTimeout(r, 800));
    const order: Order = {
      id: `ord-${Date.now()}`,
      listingId: listing.id,
      listingTitle: listing.title,
      listingImage: listing.images[0] ?? "",
      listingPrice: listing.price,
      shippingFee: shippingFee,
      total,
      sellerId: listing.sellerId,
      sellerName: listing.sellerName,
      sellerCity: "Metro Manila",
      buyerId: user.id,
      buyerName: user.name,
      shippingAddress: addr,
      paymentMethod: "cod",
      paymentStatus: "to_be_paid",
      status: "placed",
      timeline: [{ status: "placed", timestamp: new Date().toISOString() }],
      createdAt: new Date().toISOString(),
    };
    await addOrder(order);
    showToast("Order placed! 🎉", "success");
    router.push(`/checkout/${id}/confirm?orderId=${order.id}`);
  };

  const handleGCash = () => {
    if (!addr) return;
    const p = new URLSearchParams({ addr: JSON.stringify(addr), total: String(total), qty: String(qty) });
    router.push(`/checkout/${id}/gcash?${p.toString()}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 animate-fade-in">
      <Link href={`/listings/${id}`} className="text-sm text-gray-400 hover:text-white mb-6 inline-flex items-center gap-1">
        ← Back to listing
      </Link>
      <h1 className="text-2xl font-black text-white mb-8 mt-2">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* Shipping address — read only */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white">Shipping Address</h2>
              <Link href="/profile" className="text-xs text-violet-400 hover:text-violet-300">Edit saved address →</Link>
            </div>
            {addr ? (
              <div className="space-y-2 text-sm">
                <div className="bg-white/5 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-500 mb-0.5">Full Name</p>
                  <p className="text-white">{addr.fullName}</p>
                </div>
                <div className="bg-white/5 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-500 mb-0.5">Mobile Number</p>
                  <p className="text-white">{addr.mobile}</p>
                </div>
                <div className="bg-white/5 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-500 mb-0.5">Street / House No.</p>
                  <p className="text-white">{addr.street}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/5 rounded-xl px-4 py-3">
                    <p className="text-xs text-gray-500 mb-0.5">Barangay</p>
                    <p className="text-white">{addr.barangay}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl px-4 py-3">
                    <p className="text-xs text-gray-500 mb-0.5">City / Municipality</p>
                    <p className="text-white">{addr.city}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl px-4 py-3">
                    <p className="text-xs text-gray-500 mb-0.5">Province</p>
                    <p className="text-white">{addr.province}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl px-4 py-3">
                    <p className="text-xs text-gray-500 mb-0.5">Postal Code</p>
                    <p className="text-white">{addr.postalCode}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-400 text-sm mb-3">No saved address yet.</p>
                <Link href="/profile" className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-colors">
                  Add address in Profile
                </Link>
              </div>
            )}
          </div>

          {/* Payment method */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h2 className="font-semibold text-white mb-4">Payment Method</h2>
            <PaymentMethodSelector value={method} onChange={setMethod} />
          </div>
        </div>

        {/* Order summary */}
        <div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 sticky top-6">
            <h2 className="font-semibold text-white mb-4">Order Summary</h2>
            <div className="flex gap-3 mb-4">
              {listing.images[0] && (
                <img src={listing.images[0]} alt={listing.title} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
              )}
              <div>
                <p className="text-sm text-white font-medium leading-snug">{listing.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">Sold by {listing.sellerName}</p>
              </div>
            </div>

            {/* Quantity selector */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
              <span className="text-sm text-gray-400">Quantity</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold transition-colors flex items-center justify-center"
                >−</button>
                <span className="text-white font-semibold w-6 text-center">{qty}</span>
                <button
                  onClick={() => setQty((q) => Math.min(listing.stock, q + 1))}
                  disabled={qty >= listing.stock}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white font-bold transition-colors flex items-center justify-center"
                >+</button>
              </div>
            </div>
            <div className="space-y-2 text-sm border-t border-white/10 pt-4">
              <div className="flex justify-between text-gray-400">
                <span>Item price</span><span>₱{listing.price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Quantity</span><span>× {qty}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Subtotal</span><span>₱{itemTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Shipping fee</span><span>₱{shippingFee}</span>
              </div>
              <div className="flex justify-between text-white font-bold text-base pt-2 border-t border-white/10">
                <span>Total</span><span>₱{total.toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={method === "cod" ? handleCOD : handleGCash}
              disabled={placing || !addr}
              className="w-full mt-5 py-3.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors text-sm"
            >
              {placing ? "Placing order…" : method === "cod" ? "Place order" : "Continue to GCash payment"}
            </button>

            {!addr && (
              <p className="text-xs text-red-400 text-center mt-2">Please save your address in Profile first.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
