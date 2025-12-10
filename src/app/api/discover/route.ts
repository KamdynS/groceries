import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { rateLimitOrThrow } from "@/lib/rateLimit";

type Recipe = {
	id: string;
	name: string;
	author_user_id: string;
	instructions: string | null;
	servings: number | null;
	created_at: string;
	updated_at: string;
};

type RecipeIngredient = {
	id: string;
	recipe_id: string;
	ingredient_name: string;
	quantity: number;
	unit: string;
	allows_alternatives: boolean;
};

type Alternative = {
	id: string;
	recipe_ingredient_id: string;
	alternative_name: string;
	conversion_ratio: number;
	notes: string | null;
};

type InventoryItem = {
	id: string;
	user_id: string;
	name: string;
	quantity: number;
	unit: string;
};

export async function GET(req: NextRequest) {
	try {
		await rateLimitOrThrow(req, "discover-get");
		const { supabase, user } = await requireUser();

		// Fetch recipes
		const { data: recipes, error: errRecipes } = await supabase
			.from("recipes")
			.select("*")
			.order("created_at", { ascending: false });
		if (errRecipes) throw errRecipes;

		// Fetch ingredients for all recipes
		const recipeIds = (recipes ?? []).map((r: any) => r.id);
		const { data: allIngredients, error: errIng } = await supabase
			.from("recipe_ingredients")
			.select("*")
			.in("recipe_id", recipeIds.length ? recipeIds : ["00000000-0000-0000-0000-000000000000"]);
		if (errIng) throw errIng;

		// Fetch alternatives for all recipe ingredients
		const ingredientIds = (allIngredients ?? []).map((ri: any) => ri.id);
		const { data: allAlts, error: errAlts } = await supabase
			.from("recipe_ingredient_alternatives")
			.select("*")
			.in("recipe_ingredient_id", ingredientIds.length ? ingredientIds : ["00000000-0000-0000-0000-000000000000"]);
		if (errAlts) throw errAlts;

		// Fetch current user's inventory
		const { data: inventory, error: errInv } = await supabase
			.from("ingredients")
			.select("*")
			.eq("user_id", user.id);
		if (errInv) throw errInv;

		// Index inventory by name+unit for quick sums
		const invByNameUnit = new Map<string, number>();
		for (const item of (inventory as InventoryItem[]) ?? []) {
			const key = `${item.name.toLowerCase()}|${item.unit.toLowerCase()}`;
			invByNameUnit.set(key, (invByNameUnit.get(key) ?? 0) + Number(item.quantity || 0));
		}

		// Index ingredients and alternatives by recipe
		const ingredientsByRecipe = new Map<string, RecipeIngredient[]>();
		for (const ri of (allIngredients as RecipeIngredient[]) ?? []) {
			if (!ingredientsByRecipe.has(ri.recipe_id)) ingredientsByRecipe.set(ri.recipe_id, []);
			ingredientsByRecipe.get(ri.recipe_id)!.push(ri);
		}
		const altsByIngredient = new Map<string, Alternative[]>();
		for (const alt of (allAlts as Alternative[]) ?? []) {
			if (!altsByIngredient.has(alt.recipe_ingredient_id)) altsByIngredient.set(alt.recipe_ingredient_id, []);
			altsByIngredient.get(alt.recipe_ingredient_id)!.push(alt);
		}

		function availableFor(name: string, unit: string): number {
			const key = `${name.toLowerCase()}|${unit.toLowerCase()}`;
			return invByNameUnit.get(key) ?? 0;
		}

		const makeable: any[] = [];
		const almost: any[] = [];
		const detailed: any[] = [];

		for (const recipe of (recipes as Recipe[]) ?? []) {
			const reqs = ingredientsByRecipe.get(recipe.id) ?? [];
			let missingItems: { ingredient_name: string; unit: string; missing_quantity: number }[] = [];

			for (const ri of reqs) {
				const requiredQty = Number(ri.quantity || 0);
				const exactAvail = availableFor(ri.ingredient_name, ri.unit);
				let totalEquivalent = exactAvail;
				if (ri.allows_alternatives) {
					const alts = altsByIngredient.get(ri.id) ?? [];
					for (const alt of alts) {
						const altAvail = availableFor(alt.alternative_name, ri.unit);
						// Treat conversion_ratio as: alt quantity * ratio = equivalent base units
						totalEquivalent += (Number(altAvail) || 0) * Number(alt.conversion_ratio || 0);
					}
				}
				if (totalEquivalent + 1e-9 < requiredQty) {
					missingItems.push({
						ingredient_name: ri.ingredient_name,
						unit: ri.unit,
						missing_quantity: Math.max(0, requiredQty - totalEquivalent),
					});
				}
			}

			const entry = { recipe, missingCount: missingItems.length, missingItems };
			detailed.push(entry);
			if (missingItems.length === 0) makeable.push(recipe);
			else if (missingItems.length <= 2) almost.push(entry);
		}

		// Sort almost by fewest missing, then name
		almost.sort((a, b) => a.missingCount - b.missingCount || a.recipe.name.localeCompare(b.recipe.name));

		return NextResponse.json({ makeable, almost, detailed });
	} catch (err: any) {
		const status = err?.status === 429 ? 429 : err?.message === "UNAUTHORIZED" ? 401 : 500;
		return NextResponse.json({ error: err?.message ?? "Server error" }, { status });
	}
}


