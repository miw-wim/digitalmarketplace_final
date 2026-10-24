"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { Order, OrderStatus, PaymentStatus, Dispute } from "./types";
import { supabase } from "./supabase";
import { pushNotification } from "./notifications-store";

function rowToOrder(row: Record<string, unknown>): Order {
  return {
    id: row.id as string,
    listingId: row.listing_id as string,
    listingTitle: row.listing_title as string,
    listingImage: row.listing_image as string,
    listingPrice: Number(row.listing_price),
    shippingFee: Number(row.shipping_fee),
    total: Number(row.total),
    sellerId: row.seller_id as string,
    sellerName: row.seller_name as string,
    sellerCity: row.seller_city as string,
    buyerId: row.buyer_id as string,
    buyerName: row.buyer_name as string,
    shippingAddress: row.shipping_address as Order["shippingAddress"],
    paymentMethod: row.payment_method as Order["paymentMethod"],
    paymentStatus: row.payment_status as Order["paymentStatus"],
    gcashPayment: (row.gcash_payment as Order["gcashPayment"]) ?? undefined,
    status: row.status as Order["status"],
    timeline: (row.timeline as Order["timeline"]) ?? [],
    courierName: (row.courier_name as string) ?? undefined,
    trackingNumber: (row.tracking_number as string) ?? undefined,
    dispute: (row.dispute as Order["dispute"]) ?? undefined,
    createdAt: row.created_at as string,
  };
}

interface OrdersContextValue {
  orders: Order[];
  sellerOrders: Order[];
  loading: boolean;
  addOrder: (order: Order) => Promise<void>;
  updateStatus: (orderId: string, status: OrderStatus, paymentStatus: PaymentStatus, note?: string) => Promise<void>;
  sellerUpdateStatus: (orderId: string, status: OrderStatus, sellerName: string, courierName?: string, trackingNumber?: string) => Promise<void>;
  submitDispute: (orderId: string, dispute: Dispute) => Promise<void>;
  resolveDispute: (orderId: string, outcome: NonNullable<Dispute["outcome"]>) => Promise<void>;
}

const OrdersContext = createContext<OrdersContextValue>({
  orders: [],
  sellerOrders: [],
  loading: false,
  addOrder: async () => {},
  updateStatus: async () => {},
  sellerUpdateStatus: async () => {},
  submitDispute: async () => {},
  resolveDispute: async () => {},
});

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [sellerOrders, setSellerOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async (userId: string) => {
      setLoading(true);
      const [buyerRes, sellerRes] = await Promise.all([
        supabase.from("buyer_orders").select("*").eq("buyer_id", userId).order("created_at", { ascending: false }),
        supabase.from("buyer_orders").select("*").eq("seller_id", userId).order("created_at", { ascending: false }),
      ]);
      if (!buyerRes.error && buyerRes.data) setOrders(buyerRes.data.map(rowToOrder));
      if (!sellerRes.error && sellerRes.data) setSellerOrders(sellerRes.data.map(rowToOrder));
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) load(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) load(session.user.id);
      else { setOrders([]); setSellerOrders([]); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const addOrder = async (order: Order) => {
    const { error } = await supabase.from("buyer_orders").insert({
      id: order.id,
      buyer_id: order.buyerId,
      buyer_name: order.buyerName,
      seller_id: order.sellerId,
      seller_name: order.sellerName,
      seller_city: order.sellerCity,
      listing_id: order.listingId,
      listing_title: order.listingTitle,
      listing_image: order.listingImage,
      listing_price: order.listingPrice,
      shipping_fee: order.shippingFee,
      total: order.total,
      shipping_address: order.shippingAddress,
      payment_method: order.paymentMethod,
      payment_status: order.paymentStatus,
      gcash_payment: order.gcashPayment ?? null,
      status: order.status,
      timeline: order.timeline,
      courier_name: order.courierName ?? null,
      tracking_number: order.trackingNumber ?? null,
      dispute: order.dispute ?? null,
    });
    if (!error) {
      setOrders((prev) => [order, ...prev]);
      // Notify seller that someone bought their product
      await pushNotification(
        order.sellerId,
        "New Order Received! 🛍️",
        `${order.buyerName} placed an order for "${order.listingTitle}" — ₱${order.total}`,
        order.id
      );
    }
  };

  // Buyer-side status update (confirm received, cancel, dispute resolve)
  const updateStatus = async (orderId: string, status: OrderStatus, paymentStatus: PaymentStatus, note?: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const newTimeline = [...order.timeline, { status, timestamp: new Date().toISOString(), note }];
    await supabase.from("buyer_orders").update({ status, payment_status: paymentStatus, timeline: newTimeline }).eq("id", orderId);

    setOrders((prev) => prev.map((o) => o.id !== orderId ? o : { ...o, status, paymentStatus, timeline: newTimeline }));
    setSellerOrders((prev) => prev.map((o) => o.id !== orderId ? o : { ...o, status, paymentStatus, timeline: newTimeline }));
  };

  // Seller-side status update (processing → shipped → out_for_delivery → delivered)
  const sellerUpdateStatus = async (orderId: string, status: OrderStatus, sellerName: string, courierName?: string, trackingNumber?: string) => {
    const order = sellerOrders.find((o) => o.id === orderId);
    if (!order) return;

    const newTimeline = [...order.timeline, {
      status,
      timestamp: new Date().toISOString(),
      changedBy: sellerName,
      note: courierName ? `${courierName} · ${trackingNumber}` : undefined,
    }];

    // For COD delivered, show "to be collected"
    const newPaymentStatus: PaymentStatus =
      status === "delivered" && order.paymentMethod === "cod"
        ? "to_be_paid"
        : order.paymentStatus;

    const update: Record<string, unknown> = {
      status,
      payment_status: newPaymentStatus,
      timeline: newTimeline,
    };
    if (courierName) update.courier_name = courierName;
    if (trackingNumber) update.tracking_number = trackingNumber;

    await supabase.from("buyer_orders").update(update).eq("id", orderId);

    // Decrement stock when delivered
    if (status === "delivered") {
      const { data: product } = await supabase
        .from("products")
        .select("stock, stock_sold")
        .eq("id", order.listingId)
        .single();
      if (product) {
        await supabase.from("products").update({
          stock: Math.max(0, product.stock - 1),
          stock_sold: product.stock_sold + 1,
        }).eq("id", order.listingId);
      }
    }

    // Notify buyer of status change
    const statusLabel = status.replace(/_/g, " ");
    const statusMessages: Partial<Record<OrderStatus, string>> = {
      processing: "Your order is being prepared by the seller.",
      shipped: `Your order has been shipped${courierName ? ` via ${courierName} (${trackingNumber})` : ""}.`,
      out_for_delivery: "Your order is out for delivery!",
      delivered: "Your order has been delivered. Please confirm receipt.",
    };
    await pushNotification(
      order.buyerId,
      `Order ${statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}`,
      statusMessages[status] ?? `Your order "${order.listingTitle}" status updated to ${statusLabel}.`,
      orderId
    );

    const updated = {
      ...order,
      status,
      paymentStatus: newPaymentStatus,
      timeline: newTimeline,
      courierName: courierName ?? order.courierName,
      trackingNumber: trackingNumber ?? order.trackingNumber,
    };
    setSellerOrders((prev) => prev.map((o) => o.id !== orderId ? o : updated));
    setOrders((prev) => prev.map((o) => o.id !== orderId ? o : updated));
  };

  const submitDispute = async (orderId: string, dispute: Dispute) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const newTimeline = [...order.timeline, { status: "disputed" as OrderStatus, timestamp: new Date().toISOString() }];
    await supabase.from("buyer_orders").update({ status: "disputed", dispute, timeline: newTimeline }).eq("id", orderId);
    const updated = { ...order, status: "disputed" as OrderStatus, dispute, timeline: newTimeline };
    setOrders((prev) => prev.map((o) => o.id !== orderId ? o : updated));
    setSellerOrders((prev) => prev.map((o) => o.id !== orderId ? o : updated));
  };

  const resolveDispute = async (orderId: string, outcome: NonNullable<Dispute["outcome"]>) => {
    const order = orders.find((o) => o.id === orderId) ?? sellerOrders.find((o) => o.id === orderId);
    if (!order || !order.dispute) return;
    const newStatus: OrderStatus = outcome === "refunded" ? "refunded" : outcome === "cancelled" ? "cancelled" : "completed";
    const newPayment: PaymentStatus = outcome === "refunded" ? "refunded" : outcome === "released" ? "released" : order.paymentStatus;
    const newTimeline = [...order.timeline, { status: newStatus, timestamp: new Date().toISOString() }];
    const newDispute = { ...order.dispute, outcome };
    await supabase.from("buyer_orders").update({ status: newStatus, payment_status: newPayment, dispute: newDispute, timeline: newTimeline }).eq("id", orderId);
    const updated = { ...order, status: newStatus, paymentStatus: newPayment, dispute: newDispute, timeline: newTimeline };
    setOrders((prev) => prev.map((o) => o.id !== orderId ? o : updated));
    setSellerOrders((prev) => prev.map((o) => o.id !== orderId ? o : updated));
  };

  return (
    <OrdersContext.Provider value={{ orders, sellerOrders, loading, addOrder, updateStatus, sellerUpdateStatus, submitDispute, resolveDispute }}>
      {children}
    </OrdersContext.Provider>
  );
}

export const useOrders = () => useContext(OrdersContext);
