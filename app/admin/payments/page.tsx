"use client";
import { useState, useEffect } from "react";
import AdminDataTable, { Column } from "@/components/admin/AdminDataTable";
import StatCard from "@/components/admin/StatCard";
import { supabase } from "@/lib/supabase";

interface RealPayment {
  id: string;
  listing_title: string;
  buyer_name: string;
  seller_name: string;
  total: number;
  payment_method: "gcash" | "cod";
  payment_status: string;
  gcash_payment?: {
    number?: string;
    accountName?: string;
    referenceNo?: string;
    amount?: number;
  };
  created_at: string;
}

const statusColors: Record<string, string> = {
  held_in_escrow: "bg-amber-100 text-amber-700",
  released: "bg-emerald-100 text-emerald-700",
  refunded: "bg-orange-100 text-orange-700",
  to_be_paid: "bg-sky-100 text-sky-700",
  collected: "bg-emerald-100 text-emerald-700",
};

const statusLabels: Record<string, string> = {
  held_in_escrow: "Held in Escrow",
  released: "Released",
  refunded: "Refunded",
  to_be_paid: "To Be Collected",
  collected: "Collected",
};

const iconCash = <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<RealPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"gcash" | "cod">("gcash");

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("buyer_orders")
        .select("id, listing_title, buyer_name, seller_name, total, payment_method, payment_status, gcash_payment, created_at")
        .order("created_at", { ascending: false });
      if (!error) setPayments(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const gcash = payments.filter((p) => p.payment_method === "gcash");
  const cod = payments.filter((p) => p.payment_method === "cod");

  const escrow = gcash.filter((p) => p.payment_status === "held_in_escrow").reduce((s, p) => s + Number(p.total), 0);
  const released = gcash.filter((p) => p.payment_status === "released").reduce((s, p) => s + Number(p.total), 0);
  const refunded = gcash.filter((p) => p.payment_status === "refunded").reduce((s, p) => s + Number(p.total), 0);
  const codToCollect = cod.filter((p) => p.payment_status === "to_be_paid").reduce((s, p) => s + Number(p.total), 0);

  const gcashColumns: Column<RealPayment>[] = [
    { key: "id", header: "Order #", render: (p) => <span className="font-mono text-xs text-slate-600">{p.id.slice(0, 8)}</span> },
    { key: "listing_title", header: "Item", sortable: true, render: (p) => <span className="max-w-[140px] truncate block">{p.listing_title}</span> },
    { key: "buyer_name", header: "Buyer", sortable: true },
    { key: "seller_name", header: "Seller", sortable: true },
    { key: "gcash_payment", header: "Ref #", render: (p) => <span className="font-mono text-xs">{p.gcash_payment?.referenceNo ?? "—"}</span> },
    { key: "gcash_payment", header: "GCash #", render: (p) => {
      const n = p.gcash_payment?.number;
      return <span className="font-mono text-xs">{n ? `${n.slice(0, 4)}***${n.slice(-3)}` : "—"}</span>;
    }},
    { key: "gcash_payment", header: "Account", render: (p) => <span>{p.gcash_payment?.accountName ?? "—"}</span> },
    { key: "total", header: "Amount", sortable: true, render: (p) => <span className="font-semibold text-violet-600">₱{p.total}</span> },
    { key: "payment_status", header: "Status", render: (p) => (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[p.payment_status] ?? "bg-slate-100 text-slate-600"}`}>
        {statusLabels[p.payment_status] ?? p.payment_status}
      </span>
    )},
    { key: "created_at", header: "Date", sortable: true, render: (p) => new Date(p.created_at).toLocaleDateString() },
  ];

  const codColumns: Column<RealPayment>[] = [
    { key: "id", header: "Order #", render: (p) => <span className="font-mono text-xs text-slate-600">{p.id.slice(0, 8)}</span> },
    { key: "listing_title", header: "Item", sortable: true, render: (p) => <span className="max-w-[140px] truncate block">{p.listing_title}</span> },
    { key: "buyer_name", header: "Buyer", sortable: true },
    { key: "seller_name", header: "Seller", sortable: true },
    { key: "total", header: "Amount", sortable: true, render: (p) => <span className="font-semibold text-violet-600">₱{p.total}</span> },
    { key: "payment_status", header: "Status", render: (p) => (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[p.payment_status] ?? "bg-slate-100 text-slate-600"}`}>
        {statusLabels[p.payment_status] ?? p.payment_status}
      </span>
    )},
    { key: "created_at", header: "Date", sortable: true, render: (p) => new Date(p.created_at).toLocaleDateString() },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Held in Escrow" value={`₱${escrow.toLocaleString()}`} color="amber" icon={iconCash} />
          <StatCard label="Released" value={`₱${released.toLocaleString()}`} color="green" icon={iconCash} />
          <StatCard label="Refunded" value={`₱${refunded.toLocaleString()}`} color="red" icon={iconCash} />
          <StatCard label="COD to Collect" value={`₱${codToCollect.toLocaleString()}`} color="blue" icon={iconCash} />
        </div>
      )}

      <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit">
        {(["gcash", "cod"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all uppercase ${tab === t ? "bg-violet-600 text-white" : "text-slate-500 hover:text-slate-800"}`}>
            {t} ({(t === "gcash" ? gcash : cod).length})
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4">
        <AdminDataTable
          columns={tab === "gcash" ? gcashColumns : codColumns}
          data={tab === "gcash" ? gcash : cod}
          loading={loading}
          keyExtractor={(p) => p.id}
          emptyMessage="No payments found."
          searchable
          searchKeys={["id", "buyer_name", "listing_title"]}
          pageSize={8}
        />
      </div>
    </div>
  );
}
