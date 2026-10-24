"use client";
import { use, useState } from "react";
import Link from "next/link";
import { useOrders } from "@/lib/orders-store";
import { useToast } from "@/components/Toast";
import StatusBadge from "@/components/StatusBadge";
import OrderTimeline from "@/components/OrderTimeline";
import Modal from "@/components/Modal";
function maskNumber(n: string) {
  return n.slice(0, 4) + "•••" + n.slice(-4);
}

export default function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const { orders, updateStatus } = useOrders();
  const { showToast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const order = orders.find((o) => o.id === orderId);

  if (!order) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-4xl mb-3">🔍</p>
        <h2 className="text-xl font-bold text-white mb-2">Order not found</h2>
        <Link href="/purchases" className="text-violet-400 hover:text-violet-300">← My purchases</Link>
      </div>
    );
  }

  const { shippingAddress: a } = order;
  const canConfirm = order.status === "delivered";
  const canCancel = order.status === "placed";

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
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 animate-fade-in">
      <Link href="/purchases" className="text-sm text-gray-400 hover:text-white mb-6 inline-flex items-center gap-1">
        ← My purchases
      </Link>

      <div className="flex items-start justify-between gap-3 mt-2 mb-6 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-white">Order {order.id}</h1>
          <p className="text-xs text-gray-500 mt-0.5">{new Date(order.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</p>
        </div>
        <StatusBadge type="order" value={order.status} />
      </div>

      {/* Item */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
        <div className="flex gap-3 items-center">
          {order.listingImage && <img src={order.listingImage} alt={order.listingTitle} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />}
          <div>
            <p className="text-sm font-semibold text-white">{order.listingTitle}</p>
            <p className="text-xs text-gray-500">Sold by {order.sellerName} · {order.sellerCity}</p>
            <p className="text-sm font-bold text-violet-400 mt-1">₱{order.total}</p>
          </div>
        </div>
      </div>

      {/* Shipping address */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
        <h2 className="font-semibold text-white text-sm mb-3">Shipping Address</h2>
        <p className="text-sm text-gray-300">{a.fullName}</p>
        <p className="text-xs text-gray-400 mt-0.5">{a.street}, {a.barangay}</p>
        <p className="text-xs text-gray-400">{a.city}, {a.province} {a.postalCode}</p>
        <p className="text-xs text-gray-400 mt-0.5">{a.mobile}</p>
      </div>

      {/* Payment */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white text-sm">Payment</h2>
          <StatusBadge type="payment" value={order.paymentStatus} />
        </div>
        {order.paymentMethod === "gcash" && order.gcashPayment ? (
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-400"><span>Method</span><span className="text-white">💙 GCash</span></div>
            <div className="flex justify-between text-gray-400"><span>Number</span><span className="text-white font-mono">{maskNumber(order.gcashPayment.number)}</span></div>
            <div className="flex justify-between text-gray-400"><span>Account name</span><span className="text-white">{order.gcashPayment.accountName}</span></div>
            <div className="flex justify-between text-gray-400"><span>Amount</span><span className="text-white font-bold">₱{order.gcashPayment.amount}</span></div>
            <div className="flex justify-between text-gray-400"><span>Reference</span><span className="text-white font-mono text-xs">{order.gcashPayment.referenceNo}</span></div>
          </div>
        ) : (
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-400"><span>Method</span><span className="text-white">💵 Cash on Delivery</span></div>
            <div className="flex justify-between text-gray-400"><span>Amount</span><span className="text-white font-bold">₱{order.total}</span></div>
          </div>
        )}
      </div>

      {/* Dispute */}
      {order.dispute && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 mb-4">
          <h2 className="font-semibold text-red-400 text-sm mb-2">⚠️ Dispute</h2>
          <p className="text-xs text-gray-400 capitalize">{order.dispute.reason.replace(/_/g, " ")}</p>
          <p className="text-sm text-gray-300 mt-1">{order.dispute.description}</p>
          {order.dispute.outcome && (
            <p className="text-xs text-gray-500 mt-2">Outcome: <span className="text-white capitalize">{order.dispute.outcome.replace(/_/g, " ")}</span></p>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
        <h2 className="font-semibold text-white text-sm mb-4">Order Timeline</h2>
        <OrderTimeline order={order} />
      </div>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <Link href={`/messages?with=${order.sellerId}&name=${encodeURIComponent(order.sellerName)}`}
          className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white rounded-xl text-sm font-medium transition-colors">
          Message seller
        </Link>
        {canConfirm && (
          <button onClick={() => setConfirmOpen(true)} disabled={loading}
            className="px-4 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm font-medium transition-colors disabled:opacity-60">
            Confirm received
          </button>
        )}
        {canCancel && (
          <button onClick={handleCancel} disabled={loading}
            className="px-4 py-2.5 bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 text-gray-400 hover:text-red-400 rounded-xl text-sm font-medium transition-colors disabled:opacity-60">
            Cancel order
          </button>
        )}
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm Received" size="sm">
        <div className="space-y-4">
          <p className="text-gray-300 text-sm">
            {order.paymentMethod === "gcash"
              ? "The held GCash payment will be released to the seller."
              : "Confirm that you received the item and paid the courier."}
          </p>
          <div className="flex gap-3">
            <button onClick={() => setConfirmOpen(false)} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-sm font-medium transition-colors">Cancel</button>
            <button onClick={handleConfirm} disabled={loading} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors">
              {loading ? "Confirming…" : "Confirm received"}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
