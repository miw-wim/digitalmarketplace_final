"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ListingCard from "@/components/ListingCard";
import Modal from "@/components/Modal";
import ListingForm from "@/components/ListingForm";
import SearchBar from "@/components/SearchBar";
import { useToast } from "@/components/Toast";
import { apiGetListings, apiCreateListing, apiUpdateListing, apiDeleteListing } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { Listing, Category, ListingStatus } from "@/lib/types";
import { CATEGORIES } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth-context";

function ListingsContent() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const searchParams = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [filtered, setFiltered] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<Category | "All">("All");
  const [statusFilter, setStatusFilter] = useState<ListingStatus | "All">("All");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [createOpen, setCreateOpen] = useState(searchParams.get("action") === "create");
  const [editTarget, setEditTarget] = useState<Listing | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Listing | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    apiGetListings().then((data) => { setListings(data); setLoading(false); });

    // Realtime: auto-update when any product is inserted, updated or deleted
    const channel = supabase
      .channel("products-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "products" }, (payload) => {
        const row = payload.new as Record<string, unknown>;
        const newListing: Listing = {
          id: row.id as string,
          title: row.title as string,
          description: row.description as string,
          price: Number(row.price),
          category: row.category as Listing["category"],
          status: row.status as Listing["status"],
          images: (row.images as string[]) ?? [],
          sellerId: row.seller_id as string,
          sellerName: row.seller_name as string,
          createdAt: row.created_at as string,
          stock: Number(row.stock),
          stockSold: Number(row.stock_sold),
        };
        setListings((prev) => prev.some((l) => l.id === newListing.id) ? prev : [newListing, ...prev]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "products" }, (payload) => {
        const row = payload.new as Record<string, unknown>;
        setListings((prev) => prev.map((l) => l.id !== row.id ? l : {
          ...l,
          title: row.title as string,
          description: row.description as string,
          price: Number(row.price),
          category: row.category as Listing["category"],
          status: row.status as Listing["status"],
          images: (row.images as string[]) ?? [],
          stock: Number(row.stock),
          stockSold: Number(row.stock_sold),
        }));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "products" }, (payload) => {
        setListings((prev) => prev.filter((l) => l.id !== payload.old.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    let result = listings.filter((l) => l.status === "active" || (user && l.sellerId === user.id));
    if (categoryFilter !== "All") result = result.filter((l) => l.category === categoryFilter);
    if (statusFilter !== "All") result = result.filter((l) => l.status === statusFilter);
    if (query) result = result.filter((l) => l.title.toLowerCase().includes(query.toLowerCase()) || l.description.toLowerCase().includes(query.toLowerCase()));
    if (minPrice) result = result.filter((l) => l.price >= Number(minPrice));
    if (maxPrice) result = result.filter((l) => l.price <= Number(maxPrice));
    setFiltered(result);
  }, [listings, query, categoryFilter, statusFilter, minPrice, maxPrice, user]);

  const handleCreate = async (data: Partial<Listing>) => {
    const created = await apiCreateListing({
      ...data,
      status: "pending",
      sellerId: user?.id ?? "",
      sellerName: user?.name ?? "Unknown",
      stock: data.stock ?? 0,
      stockSold: 0,
      createdAt: new Date().toISOString(),
    });
    setListings((prev) => [created, ...prev]);
    setCreateOpen(false);
    showToast("Product submitted for review!", "success");
  };

  const handleEdit = async (data: Partial<Listing>) => {
    if (!editTarget) return;
    const updated = await apiUpdateListing(editTarget.id, data);
    setListings((prev) => prev.map((l) => l.id === editTarget.id ? updated : l));
    setEditTarget(null);
    showToast("Product updated!", "success");
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    await apiDeleteListing(deleteTarget.id);
    setListings((prev) => prev.filter((l) => l.id !== deleteTarget.id));
    setDeleteTarget(null);
    setDeleteLoading(false);
    showToast("Product deleted.", "info");
  };

  const inp = "px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500 transition-all placeholder-gray-600";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">Listings</h1>
          <p className="text-gray-400 text-sm mt-1">{filtered.length} items found</p>
        </div>
        {isLoggedIn && (
          <button onClick={() => setCreateOpen(true)} className="bg-violet-600 hover:bg-violet-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm">
            + Add Product
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 space-y-3">
        <SearchBar onSearch={setQuery} placeholder="Search listings..." />
        <div className="flex flex-wrap gap-3">
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as Category | "All")} className={inp}>
            <option value="All" className="bg-[#0f0f1a]">All Categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c} className="bg-[#0f0f1a]">{c}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ListingStatus | "All")} className={inp}>
            <option value="All" className="bg-[#0f0f1a]">All Statuses</option>
            {["active", "sold", "pending", "removed"].map((s) => <option key={s} value={s} className="bg-[#0f0f1a]">{s}</option>)}
          </select>
          <input type="number" placeholder="Min ₱" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className={`${inp} w-24`} />
          <input type="number" placeholder="Max ₱" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className={`${inp} w-24`} />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="bg-white/5 rounded-2xl h-64 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-4xl mb-3">📭</p>
          <p>No listings match your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map((listing) => (
            <ListingCard key={listing.id} listing={listing} showActions onEdit={setEditTarget} onDelete={setDeleteTarget} isLoggedIn={isLoggedIn} currentUserId={user?.id} />
          ))}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Listing" size="md">
        <ListingForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} />
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Listing" size="md">
        {editTarget && <ListingForm initial={editTarget} onSubmit={handleEdit} onCancel={() => setEditTarget(null)} />}
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Listing" size="sm">
        <p className="text-gray-300 mb-6">Are you sure you want to delete <span className="text-white font-semibold">&quot;{deleteTarget?.title}&quot;</span>? This cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl transition-colors text-sm font-medium">Cancel</button>
          <button onClick={handleDelete} disabled={deleteLoading} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white rounded-xl transition-colors text-sm font-semibold">
            {deleteLoading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default function ListingsPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-10"><div className="h-96 bg-white/5 rounded-2xl animate-pulse" /></div>}>
      <ListingsContent />
    </Suspense>
  );
}
