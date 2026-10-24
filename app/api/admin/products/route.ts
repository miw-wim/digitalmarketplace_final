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
    const { data, error } = await admin
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = getAdmin();
    const { id, ...updates } = await req.json();
    const { error } = await admin.from("products").update(updates).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
