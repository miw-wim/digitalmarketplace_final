import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#080812] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 sm:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2 font-bold text-lg mb-3">
            <span className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center text-white text-xs font-black">S</span>
            <span className="text-white">Shop<span className="text-violet-400">ora</span></span>
          </div>
          <p className="text-sm text-gray-500">Shopora is an online marketplace where anyone can buy and sell items, pay with GCash or cash on delivery, and track every order.</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white mb-3">Marketplace</h4>
          <ul className="space-y-2 text-sm text-gray-500">
            <li><Link href="/listings" className="hover:text-violet-400 transition-colors">Browse Listings</Link></li>
            <li><Link href="/listings?action=create" className="hover:text-violet-400 transition-colors">Sell Something</Link></li>
            <li><Link href="/register" className="hover:text-violet-400 transition-colors">Create Account</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white mb-3">Support</h4>
          <ul className="space-y-2 text-sm text-gray-500">
            <li><Link href="/messages" className="hover:text-violet-400 transition-colors">Contact Support</Link></li>
            <li><span className="cursor-default">help@shopora.com</span></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5 px-4 sm:px-6 py-4 text-center text-xs text-gray-600">
        © {new Date().getFullYear()} Shopora. All rights reserved.
      </div>
    </footer>
  );
}
