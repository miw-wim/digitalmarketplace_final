"use client";
import { useState, useEffect } from "react";
import AdminDataTable, { Column } from "@/components/admin/AdminDataTable";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/Toast";
import type { AdminUser, Role } from "@/lib/types";

type Filter = { role: "all" | Role; verified: "all" | "yes" | "no"; status: "all" | "active" | "suspended" };

function rowToAdminUser(row: Record<string, unknown>): AdminUser {
  return {
    id: row.id as string,
    name: (row.name as string) || "Unknown",
    email: (row.email as string) || "",
    role: (row.role as Role) || "user",
    verified: !!(row.email as string),
    listingsCount: Number(row.listings_count ?? 0),
    joinedAt: (row.joined_at as string) || new Date().toISOString(),
    status: (row.status as AdminUser["status"]) || "active",
    avatar: (row.avatar as string) || undefined,
  };
}

export default function AdminUsersPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<Filter>({ role: "all", verified: "all", status: "all" });
  const [confirm, setConfirm] = useState<{ type: "toggle" | "role"; user: AdminUser } | null>(null);
  const [newRole, setNewRole] = useState<Role>("user");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/admin/users");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load users.");
        setUsers((json as Record<string, unknown>[]).map(rowToAdminUser));
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = users.filter((u) => {
    if (filters.role !== "all" && u.role !== filters.role) return false;
    if (filters.verified === "yes" && !u.verified) return false;
    if (filters.verified === "no" && u.verified) return false;
    if (filters.status !== "all" && u.status !== filters.status) return false;
    return true;
  });

  const handleToggle = async () => {
    if (!confirm || confirm.type !== "toggle") return;
    const nextStatus = confirm.user.status === "active" ? "suspended" : "active";
    const res = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: confirm.user.id, status: nextStatus }) });
    if (!res.ok) { showToast("Failed to update user.", "error"); setConfirm(null); return; }
    setUsers((prev) => prev.map((u) => u.id === confirm.user.id ? { ...u, status: nextStatus } : u));
    showToast(`User ${nextStatus === "suspended" ? "suspended" : "reactivated"}.`, "success");
    setConfirm(null);
  };

  const handleRoleChange = async () => {
    if (!confirm || confirm.type !== "role") return;
    const res = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: confirm.user.id, role: newRole }) });
    if (!res.ok) { showToast("Failed to update role.", "error"); setConfirm(null); return; }
    setUsers((prev) => prev.map((u) => u.id === confirm.user.id ? { ...u, role: newRole } : u));
    showToast("Role updated.", "success");
    setConfirm(null);
  };

  const columns: Column<AdminUser>[] = [
    { key: "name", header: "Name", sortable: true, render: (u) => (
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold shrink-0">{u.name.charAt(0)}</div>
        <span className="font-medium text-slate-800">{u.name}</span>
      </div>
    )},
    { key: "email", header: "Email", sortable: true },
    { key: "role", header: "Role", render: (u) => (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.role === "admin" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-600"}`}>{u.role}</span>
    )},
    { key: "verified", header: "Verified", render: (u) => (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.verified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{u.verified ? "Verified" : "Unverified"}</span>
    )},
    { key: "listingsCount", header: "Products", sortable: true, render: (u) => (
      <span className="inline-flex items-center justify-center min-w-[1.5rem] px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">{u.listingsCount}</span>
    )},
    { key: "joinedAt", header: "Joined", sortable: true, render: (u) => new Date(u.joinedAt).toLocaleDateString() },
    { key: "status", header: "Status", render: (u) => (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{u.status}</span>
    )},
    { key: "actions", header: "Actions", render: (u) => (
      <div className="flex gap-1.5">
        <button onClick={() => setConfirm({ type: "toggle", user: u })}
          className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${u.status === "active" ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"}`}>
          {u.status === "active" ? "Suspend" : "Activate"}
        </button>

      </div>
    )},
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
      )}
      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap gap-3">
        <select value={filters.role} onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value as Filter["role"] }))}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 bg-white focus:outline-none focus:border-violet-400">
          <option value="all">All Roles</option>
          <option value="user">User</option>
        </select>
        <select value={filters.verified} onChange={(e) => setFilters((f) => ({ ...f, verified: e.target.value as Filter["verified"] }))}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 bg-white focus:outline-none focus:border-violet-400">
          <option value="all">All Verification</option>
          <option value="yes">Verified</option>
          <option value="no">Unverified</option>
        </select>
        <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as Filter["status"] }))}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 bg-white focus:outline-none focus:border-violet-400">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <span className="text-sm text-slate-400 self-center ml-auto">{filtered.length} user{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4">
        <AdminDataTable columns={columns} data={filtered} loading={loading}
          keyExtractor={(u) => u.id} emptyMessage="No users found." searchable
          searchKeys={["name", "email"]} pageSize={8} />
      </div>

      <ConfirmDialog open={confirm?.type === "toggle"} title={confirm?.user.status === "active" ? "Suspend User" : "Reactivate User"}
        message={`Are you sure you want to ${confirm?.user.status === "active" ? "suspend" : "reactivate"} ${confirm?.user.name}?`}
        confirmLabel={confirm?.user.status === "active" ? "Suspend" : "Reactivate"}
        confirmClass={confirm?.user.status === "active" ? "bg-red-600 hover:bg-red-500" : "bg-emerald-600 hover:bg-emerald-500"}
        onConfirm={handleToggle} onCancel={() => setConfirm(null)} />

      <ConfirmDialog open={confirm?.type === "role"} title="Change Role"
        message={`Change ${confirm?.user.name}'s role to:`}
        confirmLabel="Save" onConfirm={handleRoleChange} onCancel={() => setConfirm(null)}>
        <select value={newRole} onChange={(e) => setNewRole(e.target.value as Role)}
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 bg-white focus:outline-none focus:border-violet-400">
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
      </ConfirmDialog>
    </div>
  );
}
