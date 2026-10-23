"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import SignInModal from "@/components/SignInModal";
import { useNotifications } from "@/lib/notifications-store";

const userLinks = [
  { href: "/", label: "Home" },
  { href: "/listings", label: "Products" },
  { href: "/messages", label: "Messages" },
  { href: "/sales", label: "My Sales" },
];

const adminLinks = [
  { href: "/", label: "Home" },
  { href: "/listings", label: "Products" },
  { href: "/admin", label: "Admin" },
  { href: "/messages", label: "Messages" },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const links = user?.role === "admin" ? adminLinks : userLinks;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    setDropdownOpen(false);
    router.push("/");
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const AvatarCircle = () =>
    user?.avatar
      ? <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
      : <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold select-none">{getInitials(user!.name)}</div>;

  return (
    <>
    <nav className="sticky top-0 z-40 bg-[#080812]/90 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative flex items-center justify-between h-16">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl shrink-0">
          <Image src="/logo.jpg" alt="Shopora logo" width={32} height={32} className="rounded-lg" />
          <span className="text-white">Shop<span className="text-violet-400">ora</span></span>
        </Link>

        {/* Desktop nav links — centered */}
        <div className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          {links.map((l) => (
            <Link key={l.href} href={l.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(l.href) ? "bg-violet-600/20 text-violet-300" : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Desktop right side */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              {/* Notification bell */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => { setNotifOpen((o) => !o); setDropdownOpen(false); }}
                  className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/5 transition-colors text-gray-400 hover:text-white"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-[#0f0f1a] border border-white/10 rounded-2xl shadow-2xl z-50">
                    <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                      <p className="text-white font-semibold text-sm">Notifications</p>
                      {unreadCount > 0 && (
                        <button onClick={markAllAsRead} className="text-xs text-violet-400 cursor-pointer hover:text-violet-300">Mark all read</button>
                      )}
                    </div>
                    <div className="py-2 max-h-72 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-center">
                          <p className="text-sm text-gray-500">No notifications yet</p>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => markAsRead(n.id)}
                            className={`px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer border-l-2 ${
                              n.read ? "border-transparent" : "border-violet-500"
                            }`}
                          >
                            <p className={`text-sm ${n.read ? "text-gray-400" : "text-white font-medium"}`}>{n.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                            <p className="text-xs text-gray-600 mt-0.5">{new Date(n.createdAt).toLocaleString()}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Avatar + profile dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => { setDropdownOpen((o) => !o); setNotifOpen(false); }}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <AvatarCircle />
                  {user.role === "admin" && (
                    <span className="text-xs bg-violet-600/30 text-violet-300 px-1.5 py-0.5 rounded-full">Admin</span>
                  )}
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-[#0f0f1a] border border-white/10 rounded-2xl shadow-2xl py-1.5 overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
                      <AvatarCircle />
                      <div className="min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{user.name}</p>
                        <p className="text-gray-500 text-xs truncate">{user.email}</p>
                      </div>
                    </div>
                    <Link href={user.role === "admin" ? "/admin" : "/dashboard"} onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      {user.role === "admin" ? "Admin Dashboard" : "Dashboard"}
                    </Link>
                    <Link href="/profile" onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Edit Profile
                    </Link>
                    <div className="border-t border-white/10 mt-1 pt-1">
                      <button onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <button onClick={() => setSignInOpen(true)} className="text-sm text-gray-400 hover:text-white transition-colors">Sign in</button>
              <Link href="/register" className="text-sm bg-violet-600 hover:bg-violet-500 text-white px-4 py-1.5 rounded-lg font-medium transition-colors">
                Sign up
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden text-gray-400 hover:text-white" onClick={() => setMenuOpen(!menuOpen)}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#080812] px-4 py-3 flex flex-col gap-1">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive(l.href) ? "bg-violet-600/20 text-violet-300" : "text-gray-400 hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <div className="border-t border-white/10 mt-2 pt-2">
            {user ? (
              <>
                <div className="flex items-center gap-3 px-3 py-2 mb-1">
                  {user.avatar
                    ? <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full object-cover" />
                    : <div className="w-9 h-9 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold">{getInitials(user.name)}</div>
                  }
                  <div>
                    <p className="text-white text-sm font-medium">{user.name}</p>
                    <p className="text-gray-500 text-xs">{user.email}</p>
                  </div>
                </div>
                <Link href={user.role === "admin" ? "/admin" : "/dashboard"} onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm text-gray-400 hover:text-white">{user.role === "admin" ? "Admin Dashboard" : "Dashboard"}</Link>
                <Link href="/profile" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm text-gray-400 hover:text-white">Edit Profile</Link>
                <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-sm text-red-400 hover:text-red-300">Sign out</button>
              </>
            ) : (
              <>
                <button onClick={() => { setMenuOpen(false); setSignInOpen(true); }} className="block w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white">Sign in</button>
                <Link href="/register" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm text-violet-400 hover:text-violet-300">Sign up</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>

    {signInOpen && <SignInModal onClose={() => setSignInOpen(false)} />}
    </>
  );
}
