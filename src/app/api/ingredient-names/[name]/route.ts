import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { rateLimitOrThrow } from "@/lib/rateLimit";

type Params = { params: Promise<{ name: string }> };

export async function DELETE(req: NextRequest, { params }: Params) {
	try {
		await rateLimitOrThrow(req, "ingredient-name-delete");
		const { supabase } = await requireUser();
		const { name } = await params;
		const decodedName = decodeURIComponent(name);

		// Check if ingredient is used in any recipes
		const { data: usedInRecipes, error: errCheck } = await supabase
			.from("recipe_ingredients")
			.select("id")
			.eq("ingredient_name", decodedName)
			.limit(1);

		if (errCheck) throw errCheck;
		if (usedInRecipes && usedInRecipes.length > 0) {
			return NextResponse.json(
				{ error: "Cannot delete ingredient that is used in recipes" },
				{ status: 400 }
			);
		}

		const { error } = await supabase.from("ingredient_names").delete().eq("name", decodedName);
		if (error) throw error;
		return NextResponse.json({ ok: true });
	} catch (err: any) {
		const status = err?.status === 429 ? 429 : err?.message === "UNAUTHORIZED" ? 401 : 500;
		return NextResponse.json({ error: err?.message ?? "Server error" }, { status });
	}
}

