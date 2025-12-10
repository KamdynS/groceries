import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { rateLimitOrThrow } from "@/lib/rateLimit";

export async function GET(req: NextRequest) {
	try {
		await rateLimitOrThrow(req, "inventory-get");
		const { supabase, user } = await requireUser();
		const { data, error } = await supabase
			.from("ingredients")
			.select("*")
			.eq("user_id", user.id)
			.order("name", { ascending: true });
		if (error) throw error;
		return NextResponse.json({ items: data ?? [] });
	} catch (err: any) {
		const status = err?.status === 429 ? 429 : err?.message === "UNAUTHORIZED" ? 401 : 500;
		return NextResponse.json({ error: err?.message ?? "Server error" }, { status });
	}
}

export async function POST(req: NextRequest) {
	try {
		await rateLimitOrThrow(req, "inventory-post");
		const { supabase, user } = await requireUser();
		const body = await req.json().catch(() => ({}));
		const name = (body?.name ?? "").toString().trim();
		const unit = (body?.unit ?? "").toString().trim();
		const quantityNum = Number(body?.quantity);
		if (!name || !unit || !Number.isFinite(quantityNum) || quantityNum < 0) {
			return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
		}
		const { data, error } = await supabase
			.from("ingredients")
			.insert([{ user_id: user.id, name, unit, quantity: quantityNum }])
			.select("*")
			.single();
		if (error) throw error;
		return NextResponse.json({ item: data }, { status: 201 });
	} catch (err: any) {
		const status = err?.status === 429 ? 429 : err?.message === "UNAUTHORIZED" ? 401 : 500;
		return NextResponse.json({ error: err?.message ?? "Server error" }, { status });
	}
}


