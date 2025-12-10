import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { rateLimitOrThrow } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
	try {
		await rateLimitOrThrow(req, "cook-post");
		const { supabase, user } = await requireUser();
		const body = await req.json().catch(() => ({}));
		const recipeId = (body?.recipeId ?? "").toString().trim();
		const confirm = !!body?.confirm;
		if (!recipeId) return NextResponse.json({ error: "recipeId required" }, { status: 400 });

		// Load recipe, ingredients, alts, inventory
		const { data: recipe, error: errR } = await supabase.from("recipes").select("*").eq("id", recipeId).single();
		if (errR) throw errR;
		const { data: ingredients, error: errI } = await supabase
			.from("recipe_ingredients")
			.select("*")
			.eq("recipe_id", recipeId);
		if (errI) throw errI;
		const ingIds = (ingredients ?? []).map((ri: any) => ri.id);
		const { data: alts, error: errA } = await supabase
			.from("recipe_ingredient_alternatives")
			.select("*")
			.in("recipe_ingredient_id", ingIds.length ? ingIds : ["00000000-0000-0000-0000-000000000000"]);
		if (errA) throw errA;
		const { data: inventory, error: errInv } = await supabase
			.from("ingredients")
			.select("*")
			.eq("user_id", user.id);
		if (errInv) throw errInv;

		const invByNameUnit = new Map<string, { id: string; quantity: number }[]>();
		for (const item of inventory ?? []) {
			const key = `${(item as any).name.toLowerCase()}|${(item as any).unit.toLowerCase()}`;
			if (!invByNameUnit.has(key)) invByNameUnit.set(key, []);
			invByNameUnit.get(key)!.push({ id: (item as any).id, quantity: Number((item as any).quantity || 0) });
		}
		// Sort by insertion order (no created_at in projection? assumed default ordering is fine)

		const altsByIngredient = new Map<string, any[]>();
		for (const a of alts ?? []) {
			if (!altsByIngredient.has((a as any).recipe_ingredient_id)) altsByIngredient.set((a as any).recipe_ingredient_id, []);
			altsByIngredient.get((a as any).recipe_ingredient_id)!.push(a);
		}

		type Deduction = {
			ingredient_name: string;
			unit: string;
			source_name: string;
			from_alternative: boolean;
			conversion_ratio?: number;
			quantity_to_deduct: number;
		};
		const deductions: Deduction[] = [];
		const missing: { ingredient_name: string; unit: string; missing_quantity: number }[] = [];

		for (const ri of (ingredients as any[]) ?? []) {
			const need = Number(ri.quantity || 0);
			let remaining = need;

			// 1) exact
			const exactKey = `${ri.ingredient_name.toLowerCase()}|${ri.unit.toLowerCase()}`;
			const exactRows = invByNameUnit.get(exactKey) ?? [];
			let exactAvail = exactRows.reduce((s, r) => s + r.quantity, 0);
			if (exactAvail > 0) {
				const take = Math.min(remaining, exactAvail);
				if (take > 0) {
					deductions.push({
						ingredient_name: ri.ingredient_name,
						unit: ri.unit,
						source_name: ri.ingredient_name,
						from_alternative: false,
						quantity_to_deduct: take,
					});
					remaining -= take;
					// Virtually decrement pool
					let left = take;
					for (const row of exactRows) {
						const used = Math.min(row.quantity, left);
						row.quantity -= used;
						left -= used;
						if (left <= 0) break;
					}
				}
			}

			// 2) alternatives
			if (remaining > 1e-9 && ri.allows_alternatives) {
				const aList = altsByIngredient.get(ri.id) ?? [];
				for (const a of aList) {
					if (remaining <= 1e-9) break;
					const aKey = `${(a as any).alternative_name.toLowerCase()}|${ri.unit.toLowerCase()}`;
					const aRows = invByNameUnit.get(aKey) ?? [];
					const altAvail = aRows.reduce((s, r) => s + r.quantity, 0);
					const ratio = Number((a as any).conversion_ratio || 0);
					if (ratio <= 0 || altAvail <= 0) continue;
					// altAvail * ratio contributes toward remaining
					const neededAltQty = Math.min(altAvail, remaining / ratio);
					if (neededAltQty > 0) {
						deductions.push({
							ingredient_name: ri.ingredient_name,
							unit: ri.unit,
							source_name: (a as any).alternative_name,
							from_alternative: true,
							conversion_ratio: ratio,
							quantity_to_deduct: neededAltQty,
						});
						remaining -= neededAltQty * ratio;
						// Virtually decrement
						let left = neededAltQty;
						for (const row of aRows) {
							const used = Math.min(row.quantity, left);
							row.quantity -= used;
							left -= used;
							if (left <= 0) break;
						}
					}
				}
			}

			if (remaining > 1e-6) {
				missing.push({
					ingredient_name: ri.ingredient_name,
					unit: ri.unit,
					missing_quantity: remaining,
				});
			}
		}

		if (missing.length > 0) {
			return NextResponse.json({ recipe, missing, preview: deductions }, { status: 400 });
		}

		// If not confirming, just preview
		if (!confirm) {
			return NextResponse.json({ recipe, preview: deductions });
		}

		// Apply deductions
		for (const d of deductions) {
			// Fetch rows again to ensure we update real DB quantities (reduce possibility of drift)
			const { data: rows, error: errRows } = await supabase
				.from("ingredients")
				.select("id, quantity")
				.eq("user_id", user.id)
				.eq("name", d.source_name)
				.eq("unit", d.unit)
				.order("created_at", { ascending: true });
			if (errRows) throw errRows;
			let left = d.quantity_to_deduct;
			for (const row of rows ?? []) {
				if (left <= 1e-9) break;
				const current = Number((row as any).quantity || 0);
				const use = Math.min(current, left);
				const newQty = Math.max(0, current - use);
				const { error: errU } = await supabase.from("ingredients").update({ quantity: newQty }).eq("id", (row as any).id);
				if (errU) throw errU;
				left -= use;
			}
			if (left > 1e-6) {
				// Safety: should not happen because we prechecked, but abort if it does
				throw new Error("Concurrent update detected; insufficient inventory");
			}
		}

		return NextResponse.json({ ok: true });
	} catch (err: any) {
		const status = err?.status === 429 ? 429 : err?.message === "UNAUTHORIZED" ? 401 : 500;
		return NextResponse.json({ error: err?.message ?? "Server error" }, { status });
	}
}


