import type { Listing, User, Conversation, Message, ActivityItem, DashboardStats, AdminStats } from "./types";
import {
  MOCK_USERS, MOCK_ACTIVITY, MOCK_DASHBOARD_STATS, MOCK_ADMIN_STATS,
} from "./mock-data";
import { supabase } from "./supabase";

// Stub delay — used for non-Supabase mocks only
const delay = () => new Promise((r) => setTimeout(r, 800));

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Maps Supabase snake_case row → app camelCase Listing
function rowToListing(row: Record<string, unknown>): Listing {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    price: Number(row.price),
    category: row.category as Listing["category"],
    status: row.status as Listing["status"],
    images: (row.images as string[]) ?? [],
    sellerId: row.seller_id as string,
    sellerName: row.seller_name as string,
    createdAt: row.created_at as string,
    stock: Number(row.stock),
    stockSold: Number(row.stock_sold),
  };
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export async function apiRegister(_data: { name: string; email: string; password: string }) {
  await delay();
  return { success: true };
}

export async function apiLogin(_email: string, _password: string) {
  await delay();
  return { success: true };
}

export async function apiForgotPassword(_email: string) {
  await delay();
  return { success: true };
}

export async function apiResetPassword(_email: string, _password: string) {
  await delay();
  return { success: true };
}

// ─── Products (Supabase) ──────────────────────────────────────────────────────
export async function apiGetListings(): Promise<Listing[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .gt("stock", 0)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("apiGetListings error:", error.message);
    return [];
  }
  return (data ?? []).map(rowToListing);
}

export async function apiGetListing(id: string): Promise<Listing | null> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    console.error("apiGetListing error:", error.message);
    return null;
  }
  return rowToListing(data);
}

export async function apiCreateListing(data: Partial<Listing>): Promise<Listing> {
  const { data: row, error } = await supabase
    .from("products")
    .insert({
      title: data.title,
      description: data.description,
      price: data.price,
      category: data.category,
      status: data.status ?? "active",
      images: data.images ?? [],
      seller_id: data.sellerId,
      seller_name: data.sellerName,
      stock: data.stock ?? 0,
      stock_sold: data.stockSold ?? 0,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToListing(row);
}

export async function apiUpdateListing(id: string, data: Partial<Listing>): Promise<Listing> {
  const payload: Record<string, unknown> = {};
  if (data.title !== undefined) payload.title = data.title;
  if (data.description !== undefined) payload.description = data.description;
  if (data.price !== undefined) payload.price = data.price;
  if (data.category !== undefined) payload.category = data.category;
  if (data.status !== undefined) payload.status = data.status;
  if (data.images !== undefined) payload.images = data.images;
  if (data.stock !== undefined) payload.stock = data.stock;
  if (data.stockSold !== undefined) payload.stock_sold = data.stockSold;

  const { data: row, error } = await supabase
    .from("products")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToListing(row);
}

export async function apiDeleteListing(id: string): Promise<void> {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ─── Users (admin) ────────────────────────────────────────────────────────────
export async function apiGetUsers(): Promise<User[]> {
  await delay();
  return MOCK_USERS;
}

export async function apiToggleUserStatus(_id: string): Promise<void> {
  await delay();
}

// ─── Messages (Supabase) ──────────────────────────────────────────────────────

function rowToMessage(row: Record<string, unknown>): Message {
  return {
    id: row.id as string,
    senderId: row.sender_id as string,
    senderName: row.sender_name as string,
    content: row.content as string,
    createdAt: row.created_at as string,
    read: row.read as boolean,
  };
}

export async function apiGetConversations(currentUserId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, last_message, last_message_at, participant_a, participant_b")
    .or(`participant_a.eq.${currentUserId},participant_b.eq.${currentUserId}`)
    .order("last_message_at", { ascending: false });

  if (error) {
    console.error("apiGetConversations error:", error.message);
    return [];
  }

  // Fetch other participant names from profiles
  const rows = data ?? [];
  const otherIds = rows.map((r) => r.participant_a === currentUserId ? r.participant_b : r.participant_a);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name")
    .in("id", otherIds);

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.name]));

  return rows.map((r) => {
    const otherId = r.participant_a === currentUserId ? r.participant_b : r.participant_a;
    return {
      id: r.id as string,
      participantId: otherId as string,
      participantName: profileMap[otherId] ?? "Unknown",
      lastMessage: r.last_message ?? "",
      lastMessageAt: r.last_message_at as string,
      unreadCount: 0,
      isAdmin: false,
    };
  });
}

export async function apiGetMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("apiGetMessages error:", error.message);
    return [];
  }
  return (data ?? []).map(rowToMessage);
}

export async function apiSendMessage(conversationId: string, content: string, senderId: string, senderName: string): Promise<Message> {
  // Insert the message
  const { data: msgRow, error: msgError } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, sender_name: senderName, content })
    .select()
    .single();
  if (msgError) throw new Error(msgError.message);

  // Update last_message on the conversation
  await supabase
    .from("conversations")
    .update({ last_message: content, last_message_at: new Date().toISOString() })
    .eq("id", conversationId);

  return rowToMessage(msgRow);
}

// Creates a conversation between two users or returns the existing one
export async function apiGetOrCreateConversation(currentUserId: string, otherUserId: string): Promise<string> {
  // Check if conversation already exists (in either direction)
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .or(
      `and(participant_a.eq.${currentUserId},participant_b.eq.${otherUserId}),and(participant_a.eq.${otherUserId},participant_b.eq.${currentUserId})`
    )
    .maybeSingle();

  if (existing) return existing.id as string;

  // Create new conversation, ignore duplicate key conflict
  const { data: created, error } = await supabase
    .from("conversations")
    .upsert(
      { participant_a: currentUserId, participant_b: otherUserId, last_message: "" },
      { onConflict: "participant_a,participant_b", ignoreDuplicates: false }
    )
    .select("id")
    .single();

  if (error) {
    // If still a duplicate, fetch the existing one
    const { data: fallback } = await supabase
      .from("conversations")
      .select("id")
      .or(`and(participant_a.eq.${currentUserId},participant_b.eq.${otherUserId}),and(participant_a.eq.${otherUserId},participant_b.eq.${currentUserId})`)
      .maybeSingle();
    if (fallback) return fallback.id as string;
    throw new Error(error.message);
  }
  return created.id as string;
}

// ─── Orders ──────────────────────────────────────────────────────────────────
export async function apiBuyProduct(listing: Listing, buyerId: string, buyerName: string): Promise<void> {
  const { error } = await supabase.from("orders").insert({
    buyer_id: buyerId,
    buyer_name: buyerName,
    product_id: listing.id,
    product_title: listing.title,
    product_price: listing.price,
    seller_id: listing.sellerId,
    seller_name: listing.sellerName,
  });
  if (error) throw new Error(error.message);
}

export async function apiGetMyPurchases(buyerId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("id, product_id, product_title, product_price, seller_name, created_at")
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false });
  if (error) { console.error("apiGetMyPurchases error:", error.message); return []; }
  return data ?? [];
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export async function apiGetDashboardStats(): Promise<DashboardStats> {
  await delay();
  return MOCK_DASHBOARD_STATS;
}

export async function apiGetAdminStats(): Promise<AdminStats> {
  await delay();
  return MOCK_ADMIN_STATS;
}

export async function apiGetActivity(): Promise<ActivityItem[]> {
  await delay();
  return MOCK_ACTIVITY;
}
