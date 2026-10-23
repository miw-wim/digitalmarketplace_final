"use client";
import { useState, useEffect } from "react";
import AdminDataTable, { Column } from "@/components/admin/AdminDataTable";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { supabase } from "@/lib/supabase";
import type { AdminListing, ListingStatus } from "@/lib/types";

const statusColors: Record<ListingStatus, string> = {
  active: "bg-emerald-100 text-emerald-700",
  sold: "bg-slate-100 text-slate-600",
  pending: "bg-amber-100 text-amber-700",
  removed: "bg-red-100 text-red-700",
};

function rowToListing(row: Record<string, unknown>): AdminListing {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    price: Number(row.price),
    category: row.category as AdminListing["category"],
    status: (row.status as ListingStatus) || "pending",
    images: (row.images as string[]) ?? [],
    sellerId: row.seller_id as string,
    sellerName: row.seller_name as string,
    createdAt: row.created_at as string,
    stock: Number(row.stock),
    rejectionReason: (row.rejection_reason as string) || undefined,
  };
}

export default function AdminListingsPage() {
  const { showToast } = useToast();
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [statusFilter, setStatusFilter] = useState<ListingStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [confirm, setConfirm] = useState<{ type: "approve" | "reject" | "remove"; listing: AdminListing } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) { showToast("Failed to load products.", "error"); setLoading(false); return; }
      setListings((data ?? []).map(rowToListing));
      setLoading(false);
    }
    load();
  }, []);

  const base = tab === "pending" ? listings.filter((l) => l.status === "pending") : listings;
  const filtered = base.filter((l) => {
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (categoryFilter !== "all" && l.category !== categoryFilter) return false;
    return true;
  });

  const handleApprove = async () => {
    if (!confirm) return;
    const { error } = await supabase.from("products").update({ status: "active" }).eq("id", confirm.listing.id);
    if (error) { showToast("Failed to approve.", "error"); setConfirm(null); return; }
    setListings((prev) => prev.map((l) => l.id === confirm.listing.id ? { ...l, status: "active" as ListingStatus } : l));
    showToast("Product approved — now live!", "success");
    setConfirm(null);
  };

  const handleReject = async () => {
    if (!confirm) return;
    if (!rejectReason.trim()) { setRejectError("Reason is required."); return; }
    const { error } = await supabase.from("products").update({ status: "removed", rejection_reason: rejectReason }).eq("id", confirm.listing.id);
    if (error) { showToast("Failed to reject.", "error"); setConfirm(null); return; }
    setListings((prev) => prev.map((l) => l.id === confirm.listing.id ? { ...l, status: "removed" as ListingStatus, rejectionReason: rejectReason } : l));
    showToast("Product rejected.", "success");
    setConfirm(null); setRejectReason(""); setRejectError("");
  };

  const handleRemove = async () => {
    if (!confirm) return;
    const { error } = await supabase.from("products").update({ status: "removed" }).eq("id", confirm.listing.id);
    if (error) { showToast("Failed to remove.", "error"); setConfirm(null); return; }
    setListings((prev) => prev.map((l) => l.id === confirm.listing.id ? { ...l, status: "removed" as ListingStatus } : l));
    showToast("Product removed.", "success");
    setConfirm(null);
  };

  const categories = [...new Set(listings.map((l) => l.category))];

  const columns: Column<AdminListing>[] = [
    { key: "title", header: "Title", sortable: true, render: (l) => (
      <div className="flex items-center gap-2">
        {l.images[0] && <img src={l.images[0]} alt={l.title} className="w-8 h-8 rounded-lg object-cover shrink-0" />}
        <span className="font-medium text-slate-800 max-w-[160px] truncate">{l.title}</span>
      </div>
    )},
    { key: "sellerName", header: "Seller", sortable: true },
    { key: "category", header: "Category" },
    { key: "price", header: "Price", sortable: true, render: (l) => <span className="font-semibold text-violet-600">₱{l.price}</span> },
    { key: "stock", header: "Stock" },
    { key: "status", header: "Status", render: (l) => (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[l.status]}`}>{l.status}</span>
    )},
    { key: "createdAt", header: "Created", sortable: true, render: (l) => new Date(l.createdAt).toLocaleDateString() },
    { key: "actions", header: "Actions", render: (l) => (
      <div className="flex gap-1.5 flex-wrap">
        {l.status === "pending" && (
          <>
            <button onClick={() => setConfirm({ type: "approve", listing: l })} className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-medium transition-colors">Approve</button>
            <button onClick={() => { setRejectReason(""); setRejectError(""); setConfirm({ type: "reject", listing: l }); }} className="text-xs px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium transition-colors">Reject</button>
          </>
        )}
        {l.status === "active" && (
          <button onClick={() => setConfirm({ type: "remove", listing: l })} className="text-xs px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 font-medium transition-colors">Remove</button>
        )}
        {l.rejectionReason && <span className="text-xs text-red-400 italic">"{l.rejectionReason}"</span>}
      </div>
    )},
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit">
        {(["pending", "all"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t ? "bg-violet-600 text-white" : "text-slate-500 hover:text-slate-800"}`}>
            {t === "pending" ? `Pending Review (${listings.filter((l) => l.status === "pending").length})` : "All Products"}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap gap-3">
        {tab === "all" && (
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ListingStatus | "all")}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 bg-white focus:outline-none focus:border-violet-400">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="sold">Sold</option>
            <option value="removed">Removed</option>
          </select>
        )}
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 bg-white focus:outline-none focus:border-violet-400">
          <option value="all">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="text-sm text-slate-400 self-center ml-auto">{filtered.length} product{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4">
        <AdminDataTable columns={columns} data={filtered} loading={loading}
          keyExtractor={(l) => l.id} emptyMessage="No products found." searchable
          searchKeys={["title", "sellerName"]} pageSize={8} />
      </div>

      <ConfirmDialog open={confirm?.type === "approve"} title="Approve Product"
        message={`Approve "${confirm?.listing.title}"? It will go live immediately.`}
        confirmLabel="Approve" confirmClass="bg-emerald-600 hover:bg-emerald-500"
        onConfirm={handleApprove} onCancel={() => setConfirm(null)} />

      <ConfirmDialog open={confirm?.type === "reject"} title="Reject Product"
        message={`Reject "${confirm?.listing.title}"? Please provide a reason.`}
        confirmLabel="Reject" confirmClass="bg-red-600 hover:bg-red-500"
        onConfirm={handleReject} onCancel={() => { setConfirm(null); setRejectReason(""); setRejectError(""); }}>
        <div>
          <textarea value={rejectReason} onChange={(e) => { setRejectReason(e.target.value); setRejectError(""); }}
            placeholder="Reason for rejection..." rows={3}
            className={`w-full text-sm border rounded-lg px-3 py-2 text-slate-700 resize-none focus:outline-none focus:border-violet-400 ${rejectError ? "border-red-400" : "border-slate-200"}`} />
          {rejectError && <p className="text-xs text-red-500 mt-1">{rejectError}</p>}
        </div>
      </ConfirmDialog>

      <ConfirmDialog open={confirm?.type === "remove"} title="Remove Product"
        message={`Remove "${confirm?.listing.title}"? This cannot be undone.`}
        confirmLabel="Remove" confirmClass="bg-red-600 hover:bg-red-500"
        onConfirm={handleRemove} onCancel={() => setConfirm(null)} />
    </div>
  );
}
