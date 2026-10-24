import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/components/Toast";
import { OrdersProvider } from "@/lib/orders-store";
import { NotificationsProvider } from "@/lib/notifications-store";
import { CartProvider } from "@/lib/cart-store";
import { SettingsProvider } from "@/lib/settings-store";
import UserShell from "@/components/UserShell";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Shopora — Student Marketplace",
  description: "Buy and sell on campus. Electronics, books, clothing and more.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-[#080812] text-white antialiased">
        <AuthProvider>
          <ToastProvider>
            <OrdersProvider>
              <NotificationsProvider>
              <CartProvider>
                <SettingsProvider>
                  <UserShell>{children}</UserShell>
                </SettingsProvider>
              </CartProvider>
              </NotificationsProvider>
            </OrdersProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
