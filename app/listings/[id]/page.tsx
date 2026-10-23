"use client";
import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import ListingForm from "@/components/ListingForm";
import { useToast } from "@/components/Toast";
import { apiGetListing, apiUpdateListing, apiDeleteListing } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Listing } from "@/lib/types";

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  sold: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  removed: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleBuy = async () => {
    return; // replaced by checkout flow
  };

  useEffect(() => {
    apiGetListing(id).then((data) => { setListing(data); setLoading(false); });
  }, [id]);

  const isSeller = !!user && !!listing && user.id === listing.sellerId;
  const isBuyer = !!user && !!listing && user.id !== listing.sellerId;

  const handleEdit = async (data: Partial<Listing>) => {
    if (!listing) return;
    const updated = await apiUpdateListing(listing.id, data);
    setListing(updated);
    setEditOpen(false);
    showToast("Product updated!", "success");
  };

  const handleDelete = async () => {
    if (!listing) return;
    setDeleteLoading(true);
    await apiDeleteListing(listing.id);
    showToast("Product deleted.", "info");
    router.push("/listings");
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white/5 rounded-2xl h-80 animate-pulse" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => <div key={i} className="bg-white/5 rounded-xl h-10 animate-pulse" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20 text-center">
        <p className="text-4xl mb-3">🔍</p>
        <h2 className="text-xl font-bold text-white mb-2">Product not found</h2>
        <Link href="/listings" className="text-violet-400 hover:text-violet-300">← Back to products</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 animate-fade-in">
      <Link href="/listings" className="text-sm text-gray-400 hover:text-white transition-colors mb-6 inline-flex items-center gap-1">
        ← Back to products
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
        {/* Image */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden h-72 md:h-auto">
          {listing.images[0] ? (
            <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-600">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <div className="flex items-start justify-between gap-3 mb-2">
              <h1 className="text-2xl font-black text-white leading-tight">{listing.title}</h1>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusColors[listing.status]} whitespace-nowrap`}>
                {listing.status}
              </span>
            </div>
            <p className="text-3xl font-black text-violet-400">₱{listing.price}</p>
          </div>

          <p className="text-gray-400 text-sm leading-relaxed">{listing.description}</p>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-gray-500 text-xs mb-0.5">Category</p>
              <p className="text-white font-medium">{listing.category}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-gray-500 text-xs mb-0.5">Sold</p>
              <p className="text-white font-medium">{listing.stockSold}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-gray-500 text-xs mb-0.5">Seller</p>
              <p className="text-white font-medium">{listing.sellerName}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-gray-500 text-xs mb-0.5">Listed</p>
              <p className="text-white font-medium">{new Date(listing.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Action buttons — seller sees Edit + Delete, buyer sees Message Seller + Buy */}
          <div className="flex gap-3 mt-auto">
            {isSeller ? (
              <>
                <button onClick={() => setEditOpen(true)} className="flex-1 py-3 bg-violet-600/20 hover:bg-violet-600/40 text-violet-400 font-semibold rounded-xl transition-colors text-sm">
                  Edit
                </button>
                <button onClick={() => setDeleteOpen(true)} className="flex-1 py-3 bg-red-600/20 hover:bg-red-600/40 text-red-400 font-semibold rounded-xl transition-colors text-sm">
                  Delete
                </button>
              </>
            ) : isBuyer && listing.status === "active" ? (
              <>
                <Link href={`/messages?with=${listing.sellerId}&name=${encodeURIComponent(listing.sellerName)}`} className="flex-1 py-3 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl transition-colors text-center text-sm">
                  Message Seller
                </Link>
                <Link href={`/checkout/${listing.id}`}
                  className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-colors text-center text-sm">
                  Buy now
                </Link>
              </>
            ) : isBuyer && listing.status === "sold" ? (
              <>
                <Link href={`/messages?with=${listing.sellerId}&name=${encodeURIComponent(listing.sellerName)}`} className="flex-1 py-3 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl transition-colors text-center text-sm">
                  Message Seller
                </Link>
                <div className="flex-1 py-3 bg-gray-500/20 border border-gray-500/30 text-gray-400 font-semibold rounded-xl text-center text-sm">
                  Sold
                </div>
              </>
            ) : isBuyer && listing.status === "pending" ? (
              <div className="flex-1 py-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold rounded-xl text-center text-sm">
                ⏳ Pending admin approval
              </div>
            ) : (
              // Not logged in — show sign in prompt
              <Link href="/login" className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-colors text-center text-sm">
                Sign in to buy
              </Link>
            )}
          </div>
        </div>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Product" size="md">
        <ListingForm initial={listing} onSubmit={handleEdit} onCancel={() => setEditOpen(false)} />
      </Modal>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Product" size="sm">
        <p className="text-gray-300 mb-6">Delete <span className="text-white font-semibold">&quot;{listing.title}&quot;</span>? This cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteOpen(false)} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl transition-colors text-sm font-medium">Cancel</button>
          <button onClick={handleDelete} disabled={deleteLoading} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white rounded-xl transition-colors text-sm font-semibold">
            {deleteLoading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
