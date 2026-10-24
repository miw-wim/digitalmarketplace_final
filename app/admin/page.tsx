"use client";
import { useState, useEffect } from "react";
import StatCard from "@/components/admin/StatCard";
import ChartCard from "@/components/admin/ChartCard";
import type { SalesDataPoint, OrderStatusDataPoint, CategoryDataPoint } from "@/lib/types";
import { MOCK_SALES_DATA, MOCK_ORDER_STATUS_DATA, MOCK_CATEGORY_DATA } from "@/lib/mock-data";
import { supabase } from "@/lib/supabase";

interface RealStats {
  totalUsers: number;
  newUsersThisWeek: number;
  activeListings: number;
  totalOrders: number;
  totalSalesAmount: number;
  pendingModeration: number;
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<RealStats | null>(null);
  const [sales] = useState<SalesDataPoint[]>(MOCK_SALES_DATA);
  const [orderStatus, setOrderStatus] = useState<OrderStatusDataPoint[]>(MOCK_ORDER_STATUS_DATA);
  const [categoryData, setCategoryData] = useState<CategoryDataPoint[]>(MOCK_CATEGORY_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const [usersRes, listingsRes, ordersRes] = await Promise.all([
        fetch("/api/admin/users"),
        supabase.from("products").select("id, category, status"),
        supabase.from("buyer_orders").select("id, status, total, dispute"),
      ]);

      const users: { joined_at: string }[] = usersRes.ok ? await usersRes.json() : [];
      const listings = listingsRes.data ?? [];
      const orders = ordersRes.data ?? [];

      const newUsersThisWeek = users.filter(
        (u) => new Date(u.joined_at) >= oneWeekAgo
      ).length;

      const activeListings = listings.filter((l) => l.status === "active").length;
      const pending = listings.filter((l) => l.status === "pending").length;

      const totalSales = orders
        .filter((o) => o.status === "completed")
        .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

      // Orders by status
      const statusCounts: Record<string, number> = {};
      orders.forEach((o) => { statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1; });
      const orderStatusData: OrderStatusDataPoint[] = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

      // Listings by category
      const catCounts: Record<string, number> = {};
      listings.forEach((l) => { catCounts[l.category] = (catCounts[l.category] ?? 0) + 1; });
      const catData: CategoryDataPoint[] = Object.entries(catCounts).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);

      setStats({
        totalUsers: users.length,
        newUsersThisWeek,
        activeListings,
        totalOrders: orders.length,
        totalSalesAmount: totalSales,
        pendingModeration: pending,
      });

      if (orderStatusData.length > 0) setOrderStatus(orderStatusData);
      if (catData.length > 0) setCategoryData(catData);
      setLoading(false);
    }
    load();
  }, []);

const maxSales = Math.max(...sales.map((s) => s.amount), 1);
  const maxOrders = Math.max(...orderStatus.map((o) => o.count), 1);
  const maxCat = Math.max(...categoryData.map((c) => c.count), 1);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-28 bg-slate-200 rounded-2xl animate-pulse" />)}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Total Users" value={stats.totalUsers} sub={`+${stats.newUsersThisWeek} this week`} color="violet"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
          <StatCard label="Active Listings" value={stats.activeListings} color="blue"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>} />
          <StatCard label="Total Orders" value={stats.totalOrders} color="green"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>} />
          <StatCard label="Total Sales" value={`₱${stats.totalSalesAmount.toLocaleString()}`} color="green"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>} />
          <StatCard label="Pending Review" value={stats.pendingModeration} color="amber"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Sales Over Time" action={<span className="text-xs text-slate-400">Last 6 months</span>}>
          {loading ? <div className="h-40 bg-slate-100 rounded-xl animate-pulse" /> : (
            <div className="h-40 flex items-end gap-2">
              {sales.map((s) => (
                <div key={s.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-violet-500 hover:bg-violet-600 rounded-t transition-colors cursor-pointer"
                    style={{ height: `${(s.amount / maxSales) * 130}px` }} title={`₱${s.amount.toLocaleString()}`} />
                  <span className="text-[10px] text-slate-400">{s.month}</span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard title="Orders by Status">
          {loading ? <div className="h-40 bg-slate-100 rounded-xl animate-pulse" /> : (
            <div className="h-40 flex items-end gap-1.5">
              {orderStatus.map((o, i) => {
                const colors = ["bg-blue-400","bg-amber-400","bg-violet-400","bg-emerald-400","bg-green-500","bg-red-400","bg-orange-400"];
                return (
                  <div key={o.status} className="flex-1 flex flex-col items-center gap-1">
                    <div className={`w-full ${colors[i % colors.length]} rounded-t hover:opacity-80 transition-opacity cursor-pointer`}
                      style={{ height: `${(o.count / maxOrders) * 120}px` }} title={`${o.status}: ${o.count}`} />
                    <span className="text-[9px] text-slate-400 truncate w-full text-center capitalize">{o.status}</span>
                  </div>
                );
              })}
            </div>
          )}
        </ChartCard>

        <ChartCard title="Listings by Category">
          {loading ? <div className="h-40 bg-slate-100 rounded-xl animate-pulse" /> : (
            <div className="space-y-2">
              {categoryData.map((c) => (
                <div key={c.category} className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 w-20 shrink-0">{c.category}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div className="bg-violet-500 h-2 rounded-full transition-all" style={{ width: `${(c.count / maxCat) * 100}%` }} />
                  </div>
                  <span className="text-xs font-medium text-slate-600 w-6 text-right">{c.count}</span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>

    </div>
  );
}
