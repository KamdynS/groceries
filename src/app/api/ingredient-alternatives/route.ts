import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { rateLimitOrThrow } from "@/lib/rateLimit";

export async function GET(req: NextRequest) {
	try {
		await rateLimitOrThrow(req, "ingredient-alternatives-get");
		const { supabase } = await requireUser();
		const ingredientName = new URL(req.url).searchParams.get("ingredient_name");

		let query = supabase
			.from("ingredient_alternatives")
			.select("*")
			.order("alternative_name", { ascending: true });

		if (ingredientName) {
			query = query.eq("ingredient_name", decodeURIComponent(ingredientName));
		}

		const { data, error } = await query;
		if (error) throw error;
		return NextResponse.json({ alternatives: data ?? [] });
	} catch (err: any) {
		const status = err?.status === 429 ? 429 : err?.message === "UNAUTHORIZED" ? 401 : 500;
		return NextResponse.json({ error: err?.message ?? "Server error" }, { status });
	}
}

export async function POST(req: NextRequest) {
	try {
		await rateLimitOrThrow(req, "ingredient-alternatives-post");
		const { supabase } = await requireUser();
		const body = await req.json().catch(() => ({}));
		const ingredient_name = (body?.ingredient_name ?? "").toString().trim();
		const alternative_name = (body?.alternative_name ?? "").toString().trim();
		const conversion_ratio = Number(body?.conversion_ratio);
		const notes = typeof body?.notes === "string" ? body.notes.trim() : null;

		if (!ingredient_name || !alternative_name || !Number.isFinite(conversion_ratio) || conversion_ratio <= 0) {
			return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
		}

		if (ingredient_name === alternative_name) {
			return NextResponse.json({ error: "Ingredient cannot be its own alternative" }, { status: 400 });
		}

		// Ensure both ingredients exist
		const { data: ing1 } = await supabase.from("ingredient_names").select("name").eq("name", ingredient_name).single();
		const { data: ing2 } = await supabase.from("ingredient_names").select("name").eq("name", alternative_name).single();

		if (!ing1 || !ing2) {
			return NextResponse.json({ error: "Both ingredients must exist" }, { status: 400 });
		}

		const { data, error } = await supabase
			.from("ingredient_alternatives")
			.insert([{ ingredient_name, alternative_name, conversion_ratio, notes }])
			.select("*")
			.single();

		if (error) {
			if (error.code === "23505") {
				return NextResponse.json({ error: "Alternative already exists" }, { status: 400 });
			}
			throw error;
		}

		return NextResponse.json({ alternative: data }, { status: 201 });
	} catch (err: any) {
		const status = err?.status === 429 ? 429 : err?.message === "UNAUTHORIZED" ? 401 : 500;
		return NextResponse.json({ error: err?.message ?? "Server error" }, { status });
	}
}

