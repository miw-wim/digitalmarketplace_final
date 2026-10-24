"use client";
import { use, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useOrders } from "@/lib/orders-store";
import { useToast } from "@/components/Toast";
import GcashDemoForm from "@/components/GcashDemoForm";
import { apiGetListing } from "@/lib/api";
import { useState, useEffect } from "react";
import type { Listing, Order, ShippingAddress } from "@/lib/types";
import { useSettings } from "@/lib/settings-store";

function GcashPaymentInner({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { addOrder } = useOrders();
  const { showToast } = useToast();
  const { shippingFee: SHIPPING_FEE } = useSettings();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);

  const addrRaw = searchParams.get("addr");
  const totalParam = Number(searchParams.get("total"));
  const addr: ShippingAddress | null = addrRaw ? JSON.parse(addrRaw) : null;

  useEffect(() => {
    apiGetListing(id).then((l) => { setListing(l); setLoading(false); });
  }, [id]);

  if (!user || !addr) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-gray-400">Invalid checkout session.</p>
        <Link href="/listings" className="text-violet-400 hover:text-violet-300 mt-2 inline-block">← Browse listings</Link>
      </div>
    );
  }

  if (loading) {
    return <div className="max-w-lg mx-auto px-4 py-10 space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />)}</div>;
  }

  if (!listing) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-gray-400">Listing not found.</p>
      </div>
    );
  }

  const total = totalParam || listing.price + SHIPPING_FEE;

  const handleSuccess = async (data: { number: string; accountName: string; referenceNo: string }) => {
    const order: Order = {
      id: `ord-${Date.now()}`,
      listingId: listing.id,
      listingTitle: listing.title,
      listingImage: listing.images[0] ?? "",
      listingPrice: listing.price,
      shippingFee: SHIPPING_FEE,
      total,
      sellerId: listing.sellerId,
      sellerName: listing.sellerName,
      sellerCity: "Metro Manila",
      buyerId: user.id,
      buyerName: user.name,
      shippingAddress: addr,
      paymentMethod: "gcash",
      paymentStatus: "held_in_escrow",
      gcashPayment: { number: data.number, accountName: data.accountName, amount: total, referenceNo: data.referenceNo },
      status: "placed",
      timeline: [{ status: "placed", timestamp: new Date().toISOString() }],
      createdAt: new Date().toISOString(),
    };
    await addOrder(order);
    showToast("Payment successful! 🎉", "success");
    router.push(`/checkout/${id}/confirm?orderId=${order.id}`);
  };

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-10 animate-fade-in">
      <Link href={`/checkout/${id}`} className="text-sm text-gray-400 hover:text-white mb-6 inline-flex items-center gap-1">
        ← Back to checkout
      </Link>
      <h1 className="text-2xl font-black text-white mb-2 mt-2">GCash Payment</h1>
      <p className="text-gray-400 text-sm mb-6">Complete your payment of <span className="text-white font-semibold">₱{total}</span></p>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
        <div className="flex gap-3 items-center">
          {listing.images[0] && <img src={listing.images[0]} alt={listing.title} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />}
          <div>
            <p className="text-sm text-white font-medium">{listing.title}</p>
            <p className="text-xs text-gray-500">Total: ₱{total}</p>
          </div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <GcashDemoForm total={total} onSuccess={handleSuccess} />
      </div>
    </div>
  );
}

export default function GcashPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<div className="max-w-lg mx-auto px-4 py-10 space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />)}</div>}>
      <GcashPaymentInner id={id} />
    </Suspense>
  );
}
