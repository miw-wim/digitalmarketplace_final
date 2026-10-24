import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("Service role key not configured.");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
}

export async function GET() {
  try {
    const admin = getAdmin();
    const [profilesRes, productsRes] = await Promise.all([
      admin.from("profiles").select("id, name, email, role, avatar, joined_at, status, is_active").eq("role", "user").order("joined_at", { ascending: false }),
      admin.from("products").select("seller_id"),
    ]);
    if (profilesRes.error) return NextResponse.json({ error: profilesRes.error.message }, { status: 500 });
    const countMap: Record<string, number> = {};
    (productsRes.data ?? []).forEach((p) => { countMap[p.seller_id] = (countMap[p.seller_id] ?? 0) + 1; });
    const data = (profilesRes.data ?? []).map((u) => ({ ...u, listings_count: countMap[u.id] ?? 0 }));
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = getAdmin();
    const { id, ...updates } = await req.json();
    const { error } = await admin.from("profiles").update(updates).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
