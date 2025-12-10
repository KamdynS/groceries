import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { rateLimitOrThrow } from "@/lib/rateLimit";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
	try {
		await rateLimitOrThrow(req, "recipe-ingredients-get");
		const { supabase } = await requireUser();
		const { id: recipeId } = await params;
		const { data, error } = await supabase
			.from("recipe_ingredients")
			.select("*")
			.eq("recipe_id", recipeId)
			.order("id", { ascending: true });
		if (error) throw error;
		return NextResponse.json({ ingredients: data ?? [] });
	} catch (err: any) {
		const status = err?.status === 429 ? 429 : err?.message === "UNAUTHORIZED" ? 401 : 500;
		return NextResponse.json({ error: err?.message ?? "Server error" }, { status });
	}
}

export async function POST(req: NextRequest, { params }: Params) {
	try {
		await rateLimitOrThrow(req, "recipe-ingredients-post");
		const { supabase } = await requireUser();
		const { id: recipeId } = await params;
		const body = await req.json().catch(() => ({}));
		const ingredient_name = (body?.ingredient_name ?? "").toString().trim();
		const unit = (body?.unit ?? "").toString().trim();
		const quantity = Number(body?.quantity);
		const allows_alternatives = !!body?.allows_alternatives;
		if (!ingredient_name || !unit || !Number.isFinite(quantity) || quantity < 0) {
			return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
		}
		const { data: ingredient, error } = await supabase
			.from("recipe_ingredients")
			.insert([{ recipe_id: recipeId, ingredient_name, unit, quantity, allows_alternatives }])
			.select("*")
			.single();
		if (error) throw error;

		// Auto-attach standard alternatives if allows_alternatives is true
		if (allows_alternatives) {
			const { data: standardAlts } = await supabase
				.from("ingredient_alternatives")
				.select("*")
				.eq("ingredient_name", ingredient_name);

			if (standardAlts && standardAlts.length > 0) {
				const altInserts = standardAlts.map((alt) => ({
					recipe_ingredient_id: ingredient.id,
					alternative_name: alt.alternative_name,
					conversion_ratio: alt.conversion_ratio,
					notes: alt.notes,
				}));

				await supabase.from("recipe_ingredient_alternatives").insert(altInserts);
			}
		}

		return NextResponse.json({ ingredient }, { status: 201 });
	} catch (err: any) {
		const status = err?.status === 429 ? 429 : err?.message === "UNAUTHORIZED" ? 401 : 500;
		return NextResponse.json({ error: err?.message ?? "Server error" }, { status });
	}
}


