"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SearchBar from "@/components/SearchBar";
import ListingCard from "@/components/ListingCard";
import { apiGetListings } from "@/lib/api";
import type { Listing } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { useSettings } from "@/lib/settings-store";

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const { categories } = useSettings();
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [filtered, setFiltered] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!authLoading && user?.role === "admin") {
      router.replace("/admin");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    apiGetListings().then((data) => {
      setListings(data);
      setFiltered(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    let result = listings;
    if (activeCategory !== "All") result = result.filter((l) => l.category === activeCategory);
    if (query) result = result.filter((l) => l.title.toLowerCase().includes(query.toLowerCase()));
    setFiltered(result);
  }, [activeCategory, query, listings]);

  const handleSearch = (q: string) => setQuery(q);

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0d0d20] via-[#0f0a1e] to-[#080812] border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(124,58,237,0.15)_0%,_transparent_60%)]" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
          <div className="inline-flex items-center gap-2 bg-violet-600/15 border border-violet-500/30 text-violet-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Campus-only marketplace
          </div>
          <h1 className="text-4xl sm:text-6xl font-black text-white mb-4 leading-tight tracking-tight">
            Buy & sell on<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Shopora</span>
          </h1>
          <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">
            Textbooks, electronics, furniture — find what you need from students around you.
          </p>
          <div className="max-w-2xl mx-auto">
            <SearchBar onSearch={handleSearch} placeholder="Search for textbooks, laptops, furniture..." />
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {/* Category chips */}
        <div className="flex gap-2 flex-wrap mb-8">
          {(["All", ...categories.filter((c) => c !== "Other"), ...(categories.includes("Other") ? ["Other"] : [])]).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeCategory === cat
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-600/25"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Listings grid */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">
            {activeCategory === "All" ? "Featured Listings" : activeCategory}
            <span className="ml-2 text-sm font-normal text-gray-500">({filtered.length})</span>
          </h2>
          <Link href="/listings" className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white/5 rounded-2xl h-64 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No listings found. Try a different search or category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filtered.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-16 rounded-2xl bg-gradient-to-r from-violet-900/40 to-fuchsia-900/20 border border-violet-500/20 p-8 sm:p-12 text-center">
          <h3 className="text-2xl font-bold text-white mb-2">Have something to sell?</h3>
          <p className="text-gray-400 mb-6">List your items in minutes and reach hundreds of students.</p>
          <Link href="/register" className="inline-block bg-violet-600 hover:bg-violet-500 text-white font-semibold px-8 py-3 rounded-xl transition-colors">
            Start selling on Shopora
          </Link>
        </div>
      </div>
    </div>
  );
}
