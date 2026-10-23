"use client";
import { useState, useEffect } from "react";
import AdminDataTable, { Column } from "@/components/admin/AdminDataTable";
import Modal from "@/components/Modal";
import { supabase } from "@/lib/supabase";
import type { OrderStatus, PaymentMethod } from "@/lib/types";

interface RealOrder {
  id: string;
  listing_title: string;
  listing_image: string;
  buyer_name: string;
  seller_name: string;
  total: number;
  payment_method: PaymentMethod;
  status: OrderStatus;
  created_at: string;
  shipping_address: Record<string, string>;
  timeline: { status: string; timestamp: string; note?: string }[];
  courier_name?: string;
  tracking_number?: string;
}

const statusColors: Record<string, string> = {
  placed: "bg-sky-100 text-sky-700",
  processing: "bg-amber-100 text-amber-700",
  shipped: "bg-violet-100 text-violet-700",
  out_for_delivery: "bg-orange-100 text-orange-700",
  delivered: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-slate-100 text-slate-600",
  disputed: "bg-red-100 text-red-700",
  refunded: "bg-orange-100 text-orange-700",
};

const statusLabels: Record<string, string> = {
  placed: "Placed", processing: "Processing", shipped: "Shipped",
  out_for_delivery: "Out for Delivery", delivered: "Delivered",
  completed: "Completed", cancelled: "Cancelled", disputed: "Disputed", refunded: "Refunded",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<RealOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [selected, setSelected] = useState<RealOrder | null>(null);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("buyer_orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error) setOrders(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (paymentFilter !== "all" && o.payment_method !== paymentFilter) return false;
    return true;
  });

  const columns: Column<RealOrder>[] = [
    { key: "id", header: "Order #", sortable: true, render: (o) => <span className="font-mono text-xs text-slate-600">{o.id.slice(0, 8)}</span> },
    { key: "listing_title", header: "Item", sortable: true, render: (o) => (
      <div className="flex items-center gap-2">
        {o.listing_image && <img src={o.listing_image} alt={o.listing_title} className="w-8 h-8 rounded-lg object-cover shrink-0" />}
        <span className="max-w-[140px] truncate font-medium text-slate-800">{o.listing_title}</span>
      </div>
    )},
    { key: "buyer_name", header: "Buyer", sortable: true },
    { key: "seller_name", header: "Seller", sortable: true },
    { key: "total", header: "Total", sortable: true, render: (o) => <span className="font-semibold text-violet-600">₱{o.total}</span> },
    { key: "payment_method", header: "Payment", render: (o) => (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${o.payment_method === "gcash" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
        {o.payment_method === "gcash" ? "GCash" : "COD"}
      </span>
    )},
    { key: "status", header: "Status", render: (o) => (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[o.status] ?? "bg-slate-100 text-slate-600"}`}>
        {statusLabels[o.status] ?? o.status}
      </span>
    )},
    { key: "created_at", header: "Date", sortable: true, render: (o) => new Date(o.created_at).toLocaleDateString() },
    { key: "actions" as keyof RealOrder, header: "", render: (o) => (
      <button onClick={() => setSelected(o)} className="text-xs px-2.5 py-1 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 font-medium transition-colors">
        View
      </button>
    )},
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap gap-3 items-center">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 bg-white focus:outline-none focus:border-violet-400">
          <option value="all">All Status</option>
          {Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 bg-white focus:outline-none focus:border-violet-400">
          <option value="all">All Payment</option>
          <option value="gcash">GCash</option>
          <option value="cod">COD</option>
        </select>
        <span className="text-sm text-slate-400 ml-auto">{filtered.length} order{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4">
        <AdminDataTable columns={columns} data={filtered} loading={loading}
          keyExtractor={(o) => o.id} emptyMessage="No orders found."
          searchable searchKeys={["id", "buyer_name", "listing_title"]} pageSize={10} />
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Order ${selected?.id.slice(0, 8)}`} size="lg">
        {selected && (
          <div className="space-y-5 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-slate-400 mb-1">Buyer</p><p className="font-medium text-white">{selected.buyer_name}</p></div>
              <div><p className="text-xs text-slate-400 mb-1">Seller</p><p className="font-medium text-white">{selected.seller_name}</p></div>
              <div><p className="text-xs text-slate-400 mb-1">Payment</p><p className="font-medium text-white">{selected.payment_method === "gcash" ? "GCash" : "COD"}</p></div>
              <div><p className="text-xs text-slate-400 mb-1">Total</p><p className="font-semibold text-violet-400">₱{selected.total}</p></div>
              {selected.courier_name && <div><p className="text-xs text-slate-400 mb-1">Courier</p><p className="font-medium text-white">{selected.courier_name}</p></div>}
              {selected.tracking_number && <div><p className="text-xs text-slate-400 mb-1">Tracking #</p><p className="font-mono text-white">{selected.tracking_number}</p></div>}
            </div>
            {selected.shipping_address && (
              <div>
                <p className="text-xs text-slate-400 mb-2">Shipping Address</p>
                <div className="bg-white/5 rounded-xl p-3 text-slate-300 leading-relaxed">
                  {selected.shipping_address.fullName} · {selected.shipping_address.mobile}<br />
                  {selected.shipping_address.street}, {selected.shipping_address.barangay}<br />
                  {selected.shipping_address.city}, {selected.shipping_address.province} {selected.shipping_address.postalCode}
                </div>
              </div>
            )}
            {selected.timeline?.length > 0 && (
              <div>
                <p className="text-xs text-slate-400 mb-2">Order Timeline</p>
                <div className="space-y-2">
                  {selected.timeline.map((t, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                      <div>
                        <p className="text-white font-medium capitalize">{statusLabels[t.status] ?? t.status}</p>
                        <p className="text-xs text-slate-400">{new Date(t.timestamp).toLocaleString()}{t.note ? ` · ${t.note}` : ""}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
