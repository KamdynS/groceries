import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { rateLimitOrThrow } from "@/lib/rateLimit";

export async function GET(req: NextRequest) {
	try {
		await rateLimitOrThrow(req, "grocery-lists-get");
		const { supabase, user } = await requireUser();
		const { data, error } = await supabase
			.from("grocery_lists")
			.select("*")
			.eq("user_id", user.id)
			.order("created_at", { ascending: false });
		if (error) throw error;
		return NextResponse.json({ lists: data ?? [] });
	} catch (err: any) {
		const status = err?.status === 429 ? 429 : err?.message === "UNAUTHORIZED" ? 401 : 500;
		return NextResponse.json({ error: err?.message ?? "Server error" }, { status });
	}
}

export async function POST(req: NextRequest) {
	try {
		await rateLimitOrThrow(req, "grocery-lists-post");
		const { supabase, user } = await requireUser();
		const body = await req.json().catch(() => ({}));
		const week_starting = body?.week_starting ? new Date(body.week_starting) : null;
		const selectedRecipeIds: string[] = Array.isArray(body?.selectedRecipeIds) ? body.selectedRecipeIds : [];

		// Create list
		const { data: list, error: errC } = await supabase
			.from("grocery_lists")
			.insert([{ user_id: user.id, week_starting }])
			.select("*")
			.single();
		if (errC) throw errC;

		// If no recipes provided, return empty list
		if (!selectedRecipeIds.length) {
			return NextResponse.json({ list, items: [] }, { status: 201 });
		}

		// Load ingredients for selected recipes
		const { data: recipeIngredients, error: errRI } = await supabase
			.from("recipe_ingredients")
			.select("*")
			.in("recipe_id", selectedRecipeIds);
		if (errRI) throw errRI;
		const ingIds = (recipeIngredients ?? []).map((ri: any) => ri.id);
		const { data: allAlts, error: errAlts } = await supabase
			.from("recipe_ingredient_alternatives")
			.select("*")
			.in("recipe_ingredient_id", ingIds.length ? ingIds : ["00000000-0000-0000-0000-000000000000"]);
		if (errAlts) throw errAlts;

		// User inventory
		const { data: inv, error: errInv } = await supabase.from("ingredients").select("*").eq("user_id", user.id);
		if (errInv) throw errInv;

		// Aggregate requirements by base ingredient name + unit
		type Need = { name: string; unit: string; qty: number; ingredient_ids: string[] };
		const needsMap = new Map<string, Need>();
		for (const ri of recipeIngredients ?? []) {
			const key = `${(ri as any).ingredient_name.toLowerCase()}|${(ri as any).unit.toLowerCase()}`;
			const entry =
				needsMap.get(key) ||
				({
					name: (ri as any).ingredient_name,
					unit: (ri as any).unit,
					qty: 0,
					ingredient_ids: [],
				} as Need);
			entry.qty += Number((ri as any).quantity || 0);
			entry.ingredient_ids.push((ri as any).id);
			needsMap.set(key, entry);
		}

		// Index inventory and alternatives
		const invByNameUnit = new Map<string, number>();
		for (const item of inv ?? []) {
			const key = `${(item as any).name.toLowerCase()}|${(item as any).unit.toLowerCase()}`;
			invByNameUnit.set(key, (invByNameUnit.get(key) ?? 0) + Number((item as any).quantity || 0));
		}
		const altsByIngredient = new Map<string, any[]>();
		for (const alt of allAlts ?? []) {
			const id = (alt as any).recipe_ingredient_id;
			if (!altsByIngredient.has(id)) altsByIngredient.set(id, []);
			altsByIngredient.get(id)!.push(alt);
		}

		// Compute shortages considering alternatives (equivalent amounts)
		const itemsToInsert: { grocery_list_id: string; ingredient_name: string; quantity: number; unit: string }[] = [];
		for (const [, need] of needsMap) {
			const exactAvail = invByNameUnit.get(`${need.name.toLowerCase()}|${need.unit.toLowerCase()}`) ?? 0;
			let equivalentAvail = exactAvail;
			// For all recipe ingredient rows that contributed to this base name, include their alternatives
			for (const ingId of need.ingredient_ids) {
				const alts = altsByIngredient.get(ingId) ?? [];
				for (const a of alts) {
					const altName = (a as any).alternative_name;
					const ratio = Number((a as any).conversion_ratio || 0);
					if (ratio <= 0) continue;
					const altAvail = invByNameUnit.get(`${altName.toLowerCase()}|${need.unit.toLowerCase()}`) ?? 0;
					equivalentAvail += altAvail * ratio;
				}
			}
			const shortage = Math.max(0, need.qty - equivalentAvail);
			if (shortage > 1e-9) {
				itemsToInsert.push({
					grocery_list_id: (list as any).id,
					ingredient_name: need.name,
					quantity: shortage,
					unit: need.unit,
				});
			}
		}

		let items: any[] = [];
		if (itemsToInsert.length) {
			const { data: insItems, error: errIns } = await supabase
				.from("grocery_list_items")
				.insert(itemsToInsert)
				.select("*");
			if (errIns) throw errIns;
			items = insItems ?? [];
		}

		return NextResponse.json({ list, items }, { status: 201 });
	} catch (err: any) {
		const status = err?.status === 429 ? 429 : err?.message === "UNAUTHORIZED" ? 401 : 500;
		return NextResponse.json({ error: err?.message ?? "Server error" }, { status });
	}
}


