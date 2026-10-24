"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useOrders } from "@/lib/orders-store";
import { useNotifications } from "@/lib/notifications-store";
import { supabase } from "@/lib/supabase";
import type { DashboardStats } from "@/lib/types";

const activityIcons: Record<string, string> = {
  listing_created: "📦",
  listing_sold: "💰",
  listing_removed: "🗑️",
  message_sent: "💬",
  account_created: "🎉",
};

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className={`bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-colors`}>
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <p className={`text-3xl font-black ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { orders } = useOrders();
  const { notifications, unreadCount, markAllAsRead } = useNotifications();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [ordersInTransit, setOrdersInTransit] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    if (user.role === "admin") {
      router.replace("/admin");
      return;
    }
    async function load() {
      const [productsRes, convsRes, ordersRes] = await Promise.all([
        supabase.from("products").select("id, status").eq("seller_id", user!.id),
        supabase.from("conversations").select("id").or(`participant_a.eq.${user!.id},participant_b.eq.${user!.id}`),
        supabase.from("buyer_orders").select("id, status").eq("buyer_id", user!.id),
      ]);
      const products = productsRes.data ?? [];
      const myListings = products.length;
      const activeListings = products.filter((p) => p.status === "active").length;
      const messages = convsRes.data?.length ?? 0;
      const allOrders = ordersRes.data ?? [];
      setStats({ myListings, activeListings, messages, totalViews: 0 });
      setOrdersInTransit(allOrders.filter((o) => ["placed", "shipped", "processing", "out_for_delivery"].includes(o.status)).length);
      setLoading(false);
    }
    load();
  }, [user]);

  const ordersInTransitCount = ordersInTransit;

  const quickActions = [
    { label: "New Listing", href: "/listings?action=create", icon: "+" },
    { label: "My Listings", href: "/listings?mine=true", icon: "📋" },
    { label: "My Sales", href: "/sales", icon: "🏪" },
    { label: "My Cart", href: "/cart", icon: "🛒" },
    { label: "My Purchases", href: "/purchases", icon: "🛍️" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 animate-fade-in">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">
            Hey{user?.name ? `, ${user.name}` : " there"} 👋
          </h1>
          <p className="text-gray-400 mt-1">Here&apos;s what&apos;s happening with your marketplace activity.</p>
        </div>

      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => <div key={i} className="bg-white/5 rounded-2xl h-28 animate-pulse" />)}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="My Listings" value={stats.myListings} sub="total posted" color="text-violet-400" />
          <StatCard label="Active" value={stats.activeListings} sub="currently live" color="text-emerald-400" />
          <StatCard label="Messages" value={stats.messages} sub="conversations" color="text-sky-400" />
          <StatCard label="Orders in Transit" value={ordersInTransitCount} sub="being shipped" color="text-orange-400" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick actions */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h2 className="font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((a) => (
              <Link key={a.href} href={a.href}
                className="flex flex-col items-center gap-2 p-4 bg-white/5 hover:bg-violet-600/15 border border-white/10 hover:border-violet-500/40 rounded-xl transition-all text-center group">
                <span className="text-2xl">{a.icon}</span>
                <span className="text-xs font-medium text-gray-300 group-hover:text-white transition-colors">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Notifications</h2>
            {unreadCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs bg-violet-600 text-white px-2 py-0.5 rounded-full font-semibold">{unreadCount} new</span>
                <button onClick={markAllAsRead} className="text-xs text-gray-500 hover:text-violet-400 transition-colors">Mark all read</button>
              </div>
            )}
          </div>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />)}
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">🔔</p>
              <p className="text-gray-500 text-sm">No notifications yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.slice(0, 5).map((n) => (
                <div key={n.id} className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${
                  n.read ? "hover:bg-white/5" : "bg-violet-600/10 border border-violet-500/20"
                }`}>
                  <span className="text-lg mt-0.5">🔔</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${n.read ? "text-gray-300" : "text-white"}`}>{n.title}</p>
                    <p className={`text-xs mt-0.5 ${n.read ? "text-gray-500" : "text-gray-400"}`}>{n.body}</p>
                    <p className="text-xs text-gray-600 mt-1">{new Date(n.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</p>
                  </div>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-violet-400 mt-1.5 flex-shrink-0" />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* My Purchases */}
      <div className="mt-6 bg-white/5 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">My Purchases</h2>
          <Link href="/purchases" className="text-xs text-violet-400 hover:text-violet-300">View all →</Link>
        </div>
        {orders.filter((o) => o.buyerId === user?.id).length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-6">No purchases yet. <Link href="/listings" className="text-violet-400 hover:text-violet-300">Browse listings</Link></p>
        ) : (
          <div className="space-y-2">
            {orders.filter((o) => o.buyerId === user?.id).slice(0, 3).map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl transition-colors">
                <div>
                  <p className="text-sm text-white font-medium">{order.listingTitle}</p>
                  <p className="text-xs text-gray-500">from {order.sellerName} · {new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-violet-400 font-bold text-sm">₱{order.total}</span>
                  <Link href={`/purchases/${order.id}`} className="text-xs text-gray-400 hover:text-white transition-colors">View →</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
