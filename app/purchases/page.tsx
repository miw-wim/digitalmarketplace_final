"use client";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useOrders } from "@/lib/orders-store";
import { useToast } from "@/components/Toast";
import StatusBadge from "@/components/StatusBadge";
import Modal from "@/components/Modal";
import type { Order } from "@/lib/types";

function maskNumber(n: string) {
  return n.slice(0, 4) + "•••" + n.slice(-4);
}

function ConfirmReceivedModal({ order, onClose, onConfirm }: { order: Order; onClose: () => void; onConfirm: () => void }) {
  return (
    <div className="space-y-4">
      <p className="text-gray-300 text-sm">
        {order.paymentMethod === "gcash"
          ? "By confirming receipt, the held GCash payment will be released to the seller."
          : "Confirm that you received the item and paid the courier in cash."}
      </p>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-sm font-medium transition-colors">Cancel</button>
        <button onClick={onConfirm} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-colors">Confirm received</button>
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: Order }) {
  const { updateStatus } = useOrders();
  const { showToast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const canCancel = order.status === "placed";
  const canConfirm = order.status === "delivered";

  const handleConfirm = async () => {
    setLoading(true);
    const ps = order.paymentMethod === "gcash" ? "released" : "collected";
    await updateStatus(order.id, "completed", ps);
    setLoading(false);
    setConfirmOpen(false);
    showToast("Order completed! ✅", "success");
  };

  const handleCancel = async () => {
    setLoading(true);
    await updateStatus(order.id, "cancelled", order.paymentStatus);
    setLoading(false);
    showToast("Order cancelled.", "info");
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-colors">
      <div className="flex gap-4 mb-4">
        {order.listingImage && (
          <img src={order.listingImage} alt={order.listingTitle} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <p className="text-sm font-semibold text-white truncate">{order.listingTitle}</p>
            <StatusBadge type="order" value={order.status} />
          </div>
          <p className="text-xs text-gray-500 mt-0.5">from {order.sellerName} · ₱{order.total}</p>
          <p className="text-xs text-gray-600 mt-0.5">{new Date(order.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Payment badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-gray-500">Payment:</span>
        <StatusBadge type="payment" value={order.paymentStatus} />
        {order.paymentMethod === "gcash" && order.gcashPayment && (
          <span className="text-xs text-gray-500 font-mono">{maskNumber(order.gcashPayment.number)}</span>
        )}
      </div>

      {/* Courier info */}
      {order.courierName && (
        <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl px-3 py-2 text-xs text-violet-300 mb-4">
          🚚 {order.courierName} · {order.trackingNumber}
        </div>
      )}

      {/* Dispute info */}
      {order.dispute && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 text-xs text-red-300 mb-4">
          ⚠️ Dispute: {order.dispute.description}
          {order.dispute.outcome && <span className="ml-1 text-gray-400">· Outcome: {order.dispute.outcome.replace("_", " ")}</span>}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <Link href={`/purchases/${order.id}`} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white rounded-lg text-xs font-medium transition-colors">
          View details
        </Link>
        <Link href={`/messages?with=${order.sellerId}&name=${encodeURIComponent(order.sellerName)}`}
          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white rounded-lg text-xs font-medium transition-colors">
          Message seller
        </Link>
        {canConfirm && (
          <button onClick={() => setConfirmOpen(true)} disabled={loading}
            className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-60">
            Confirm received
          </button>
        )}
        {canCancel && (
          <button onClick={handleCancel} disabled={loading}
            className="px-3 py-1.5 bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 text-gray-400 hover:text-red-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-60">
            Cancel order
          </button>
        )}
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm Received" size="sm">
        <ConfirmReceivedModal order={order} onClose={() => setConfirmOpen(false)} onConfirm={handleConfirm} />
      </Modal>
    </div>
  );
}

export default function PurchasesPage() {
  const { user } = useAuth();
  const { orders } = useOrders();
  const [filter, setFilter] = useState("all");

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-gray-400 mb-4">Sign in to view your purchases.</p>
        <Link href="/login" className="text-violet-400 hover:text-violet-300">Sign in →</Link>
      </div>
    );
  }

  const myOrders = orders.filter((o) => o.buyerId === user.id);
  const filters = [
    { value: "all", label: "All" },
    { value: "placed", label: "Placed" },
    { value: "shipped", label: "Shipped" },
    { value: "completed", label: "Completed" },
    { value: "disputed", label: "Disputed" },
  ];
  const filtered = filter === "all" ? myOrders : myOrders.filter((o) => o.status === filter);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">My Purchases</h1>
        <p className="text-gray-400 mt-1">Track and manage your orders.</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap mb-6">
        {filters.map((f) => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f.value ? "bg-violet-600 text-white" : "bg-white/5 text-gray-400 hover:text-white border border-white/10"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🛍️</p>
          <p className="text-gray-400">No orders found.</p>
          <Link href="/listings" className="text-violet-400 hover:text-violet-300 text-sm mt-2 inline-block">Browse listings →</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((o) => <OrderCard key={o.id} order={o} />)}
        </div>
      )}
    </div>
  );
}
