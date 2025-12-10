import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { rateLimitOrThrow } from "@/lib/rateLimit";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
	try {
		await rateLimitOrThrow(req, "recipe-get");
		const { supabase } = await requireUser();
		const { id } = await params;
		const { data: recipe, error: errR } = await supabase.from("recipes").select("*").eq("id", id).single();
		if (errR) throw errR;
		const { data: ingredients, error: errI } = await supabase
			.from("recipe_ingredients")
			.select("*")
			.eq("recipe_id", id)
			.order("id", { ascending: true });
		if (errI) throw errI;
		// Fetch alternatives per ingredient
		const ingredientIds = (ingredients ?? []).map((ri) => ri.id);
		let alternativesByIngredient: Record<string, any[]> = {};
		if (ingredientIds.length > 0) {
			const { data: alts, error: errA } = await supabase
				.from("recipe_ingredient_alternatives")
				.select("*")
				.in("recipe_ingredient_id", ingredientIds);
			if (errA) throw errA;
			for (const alt of alts ?? []) {
				const key = alt.recipe_ingredient_id as string;
				if (!alternativesByIngredient[key]) alternativesByIngredient[key] = [];
				alternativesByIngredient[key].push(alt);
			}
		}
		const ingredientsWithAlts = (ingredients ?? []).map((ri) => ({
			...ri,
			alternatives: alternativesByIngredient[ri.id] ?? [],
		}));
		return NextResponse.json({ recipe, ingredients: ingredientsWithAlts });
	} catch (err: any) {
		const status = err?.status === 429 ? 429 : err?.message === "UNAUTHORIZED" ? 401 : 500;
		return NextResponse.json({ error: err?.message ?? "Server error" }, { status });
	}
}

export async function PUT(req: NextRequest, { params }: Params) {
	try {
		await rateLimitOrThrow(req, "recipe-put");
		const { supabase } = await requireUser();
		const { id } = await params;
		const body = await req.json().catch(() => ({}));
		const updates: Record<string, any> = {};
		if (typeof body.name === "string") updates.name = body.name.trim();
		if (typeof body.instructions === "string" || body.instructions === null) updates.instructions = body.instructions;
		if (body.servings !== undefined) {
			const s = Number(body.servings);
			if (!Number.isFinite(s) || s < 0) return NextResponse.json({ error: "Invalid servings" }, { status: 400 });
			updates.servings = s;
		}
		if (Object.keys(updates).length === 0) return NextResponse.json({ error: "No fields" }, { status: 400 });
		const { data, error } = await supabase.from("recipes").update(updates).eq("id", id).select("*").single();
		if (error) throw error;
		return NextResponse.json({ recipe: data });
	} catch (err: any) {
		const status = err?.status === 429 ? 429 : err?.message === "UNAUTHORIZED" ? 401 : 500;
		return NextResponse.json({ error: err?.message ?? "Server error" }, { status });
	}
}

export async function DELETE(req: NextRequest, { params }: Params) {
	try {
		await rateLimitOrThrow(req, "recipe-delete");
		const { supabase } = await requireUser();
		const { id } = await params;
		const { error } = await supabase.from("recipes").delete().eq("id", id);
		if (error) throw error;
		return NextResponse.json({ ok: true });
	} catch (err: any) {
		const status = err?.status === 429 ? 429 : err?.message === "UNAUTHORIZED" ? 401 : 500;
		return NextResponse.json({ error: err?.message ?? "Server error" }, { status });
	}
}


