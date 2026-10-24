import { NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const FILE = join(process.cwd(), "app-settings.json");

function readSettings() {
  if (!existsSync(FILE)) return { shippingFee: 80, categories: ["Electronics", "Books", "Clothing", "Furniture", "Sports", "Other"] };
  try { return JSON.parse(readFileSync(FILE, "utf-8")); } catch { return { shippingFee: 80, categories: ["Electronics", "Books", "Clothing", "Furniture", "Sports", "Other"] }; }
}

export async function GET() {
  return NextResponse.json(readSettings());
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const current = readSettings();
    const updated = { ...current, ...body };
    writeFileSync(FILE, JSON.stringify(updated));
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
