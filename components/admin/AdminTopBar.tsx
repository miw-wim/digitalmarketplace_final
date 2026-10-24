"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

interface Props {
  title: string;
  onMenuToggle: () => void;
}

export default function AdminTopBar({ title, onMenuToggle }: Props) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState("");

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center gap-4 px-4 sm:px-6 shrink-0">
      {/* Mobile menu button */}
      <button onClick={onMenuToggle} className="md:hidden text-slate-500 hover:text-slate-800">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <h1 className="text-lg font-bold text-slate-800 shrink-0">{title}</h1>

      {/* Search */}
      <div className="flex-1 max-w-sm ml-auto sm:ml-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 ml-2">
        {/* Admin name + logout */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold select-none">
            {user?.name?.charAt(0).toUpperCase() ?? "A"}
          </div>
          <span className="hidden sm:block text-sm font-medium text-slate-700">{user?.name ?? "Admin"}</span>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="hidden sm:block">Logout</span>
        </button>
      </div>
    </header>
  );
}
