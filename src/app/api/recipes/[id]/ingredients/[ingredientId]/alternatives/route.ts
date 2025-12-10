import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { rateLimitOrThrow } from "@/lib/rateLimit";

type Params = { params: Promise<{ id: string; ingredientId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
	try {
		await rateLimitOrThrow(req, "alts-get");
		const { supabase } = await requireUser();
		const { ingredientId } = await params;
		const { data, error } = await supabase
			.from("recipe_ingredient_alternatives")
			.select("*")
			.eq("recipe_ingredient_id", ingredientId)
			.order("id", { ascending: true });
		if (error) throw error;
		return NextResponse.json({ alternatives: data ?? [] });
	} catch (err: any) {
		const status = err?.status === 429 ? 429 : err?.message === "UNAUTHORIZED" ? 401 : 500;
		return NextResponse.json({ error: err?.message ?? "Server error" }, { status });
	}
}

export async function POST(req: NextRequest, { params }: Params) {
	try {
		await rateLimitOrThrow(req, "alts-post");
		const { supabase } = await requireUser();
		const { ingredientId } = await params;
		const body = await req.json().catch(() => ({}));
		const alternative_name = (body?.alternative_name ?? "").toString().trim();
		const conversion_ratio = Number(body?.conversion_ratio);
		const notes = typeof body?.notes === "string" ? body.notes : null;
		if (!alternative_name || !Number.isFinite(conversion_ratio) || conversion_ratio <= 0) {
			return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
		}
		const { data, error } = await supabase
			.from("recipe_ingredient_alternatives")
			.insert([{ recipe_ingredient_id: ingredientId, alternative_name, conversion_ratio, notes }])
			.select("*")
			.single();
		if (error) throw error;
		return NextResponse.json({ alternative: data }, { status: 201 });
	} catch (err: any) {
		const status = err?.status === 429 ? 429 : err?.message === "UNAUTHORIZED" ? 401 : 500;
		return NextResponse.json({ error: err?.message ?? "Server error" }, { status });
	}
}


