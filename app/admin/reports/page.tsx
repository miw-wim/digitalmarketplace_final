"use client";
import { useState, useEffect } from "react";
import StatCard from "@/components/admin/StatCard";
import ChartCard from "@/components/admin/ChartCard";
import { supabase } from "@/lib/supabase";

type ReportType = "sales" | "users" | "orders" | "products";

interface SalesRow { month: string; total: number; count: number }
interface UserRow { id: string; name: string; email: string; role: string; joined_at: string; is_active: boolean }
interface OrderRow { id: string; status: string; total: number; created_at: string; buyer_id: string }
interface ProductRow { id: string; title: string; category: string; status: string; price: number; seller_name: string; created_at: string }

export default function AdminReportsPage() {
  const [reportType, setReportType] = useState<ReportType>("sales");
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split("T")[0]; });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [dateError, setDateError] = useState("");
  const [loading, setLoading] = useState(true);

  const [salesRows, setSalesRows] = useState<SalesRow[]>([]);
  const [userRows, setUserRows] = useState<UserRow[]>([]);
  const [orderRows, setOrderRows] = useState<OrderRow[]>([]);
  const [productRows, setProductRows] = useState<ProductRow[]>([]);

  const fetchData = async () => {
    if (dateFrom && dateTo && dateFrom > dateTo) { setDateError("Start date must be before end date."); return; }
    setDateError("");
    setLoading(true);

    if (reportType === "sales") {
      const { data } = await supabase
        .from("buyer_orders")
        .select("id, total, created_at, status")
        .gte("created_at", dateFrom)
        .lte("created_at", dateTo + "T23:59:59");
      const rows = data ?? [];
      // Group by month
      const map: Record<string, { total: number; count: number }> = {};
      rows.filter((r) => r.status === "completed").forEach((r) => {
        const month = new Date(r.created_at).toLocaleString("default", { month: "short", year: "2-digit" });
        if (!map[month]) map[month] = { total: 0, count: 0 };
        map[month].total += Number(r.total);
        map[month].count += 1;
      });
      setSalesRows(Object.entries(map).map(([month, v]) => ({ month, ...v })));
    }

    if (reportType === "users") {
      const res = await fetch("/api/admin/users");
      const data: UserRow[] = res.ok ? await res.json() : [];
      setUserRows(data.filter((u) => {
        const d = u.joined_at?.split("T")[0] ?? "";
        return (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo);
      }));
    }

    if (reportType === "orders") {
      const { data } = await supabase
        .from("buyer_orders")
        .select("id, status, total, created_at, buyer_id")
        .gte("created_at", dateFrom)
        .lte("created_at", dateTo + "T23:59:59");
      setOrderRows(data ?? []);
    }

    if (reportType === "products") {
      const { data } = await supabase
        .from("products")
        .select("id, title, category, status, price, seller_name, created_at")
        .gte("created_at", dateFrom)
        .lte("created_at", dateTo + "T23:59:59");
      setProductRows(data ?? []);
    }

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [reportType]);

  const iconChart = <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;

  const salesTotal = salesRows.reduce((s, r) => s + r.total, 0);
  const salesCount = salesRows.reduce((s, r) => s + r.count, 0);
  const maxSales = Math.max(...salesRows.map((r) => r.total), 1);

  const summaryCards = {
    sales: [
      { label: "Total Revenue", value: `₱${salesTotal.toLocaleString()}`, color: "green" as const },
      { label: "Completed Orders", value: salesCount, color: "violet" as const },
      { label: "Avg Order Value", value: salesCount ? `₱${Math.round(salesTotal / salesCount).toLocaleString()}` : "₱0", color: "blue" as const },
    ],
    users: [
      { label: "Total Users", value: userRows.length, color: "violet" as const },
      { label: "Active", value: userRows.filter((u) => u.is_active).length, color: "green" as const },
      { label: "Admins", value: userRows.filter((u) => u.role === "admin").length, color: "blue" as const },
    ],
    orders: [
      { label: "Total Orders", value: orderRows.length, color: "blue" as const },
      { label: "Total Revenue", value: `₱${orderRows.filter((o) => o.status === "completed").reduce((s, o) => s + Number(o.total), 0).toLocaleString()}`, color: "green" as const },
      { label: "Completed", value: orderRows.filter((o) => o.status === "completed").length, color: "violet" as const },
    ],
    products: [
      { label: "Total Products", value: productRows.length, color: "blue" as const },
      { label: "Active", value: productRows.filter((p) => p.status === "active").length, color: "green" as const },
      { label: "Pending", value: productRows.filter((p) => p.status === "pending").length, color: "amber" as const },
    ],
  };

  const tableConfig = {
    sales: {
      headers: ["Month", "Completed Orders", "Revenue"],
      rows: salesRows.map((r) => [r.month, r.count, `₱${r.total.toLocaleString()}`]),
    },
    users: {
      headers: ["Name", "Email", "Role", "Joined"],
      rows: userRows.map((u) => [u.name, u.email, u.role, u.joined_at?.split("T")[0] ?? ""]),
    },
    orders: {
      headers: ["Order ID", "Status", "Total", "Date"],
      rows: orderRows.map((o) => [o.id, o.status, `₱${Number(o.total).toLocaleString()}`, new Date(o.created_at).toLocaleDateString()]),
    },
    products: {
      headers: ["Title", "Category", "Status", "Price", "Seller"],
      rows: productRows.map((p) => [p.title, p.category, p.status, `₱${Number(p.price).toLocaleString()}`, p.seller_name]),
    },
  };

  const table = tableConfig[reportType];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-slate-500 block mb-1">Report Type</label>
          <select value={reportType} onChange={(e) => setReportType(e.target.value as ReportType)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 bg-white focus:outline-none focus:border-violet-400">
            <option value="sales">Sales</option>
            <option value="users">Users</option>
            <option value="orders">Orders</option>
            <option value="products">Products</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">From</label>
          <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setDateError(""); }}
            className={`text-sm border rounded-lg px-3 py-1.5 text-slate-700 bg-white focus:outline-none focus:border-violet-400 ${dateError ? "border-red-400" : "border-slate-200"}`} />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">To</label>
          <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setDateError(""); }}
            className={`text-sm border rounded-lg px-3 py-1.5 text-slate-700 bg-white focus:outline-none focus:border-violet-400 ${dateError ? "border-red-400" : "border-slate-200"}`} />
        </div>
        <button onClick={fetchData} className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors">
          Generate
        </button>
        {dateError && <p className="text-xs text-red-500 self-center">{dateError}</p>}
        <div className="ml-auto">
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Print
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {summaryCards[reportType].map((c) => <StatCard key={c.label} label={c.label} value={c.value} color={c.color} icon={iconChart} />)}
        </div>
      )}

      {/* Sales chart */}
      {reportType === "sales" && salesRows.length > 0 && (
        <ChartCard title="Revenue Over Time">
          {loading ? <div className="h-40 bg-slate-100 rounded-xl animate-pulse" /> : (
            <div className="h-40 flex items-end gap-2">
              {salesRows.map((s) => (
                <div key={s.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-violet-500 hover:bg-violet-600 rounded-t transition-colors cursor-pointer"
                    style={{ height: `${(s.total / maxSales) * 130}px` }} title={`₱${s.total.toLocaleString()}`} />
                  <span className="text-[10px] text-slate-400">{s.month}</span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      )}

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700 capitalize">{reportType} Report</p>
          <span className="text-xs text-slate-400">{table.rows.length} rows</span>
        </div>
        {loading ? (
          <div className="p-4 space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />)}</div>
        ) : table.rows.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-10">No data found for the selected period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {table.headers.map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {table.rows.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    {row.map((cell, j) => (
                      <td key={j} className="px-5 py-3 text-slate-700">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
