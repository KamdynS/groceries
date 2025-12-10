import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { rateLimitOrThrow } from "@/lib/rateLimit";

type Params = { params: Promise<{ id: string; ingredientId: string; altId: string }> };

export async function DELETE(req: NextRequest, { params }: Params) {
	try {
		await rateLimitOrThrow(req, "recipe-alternative-delete");
		const { supabase } = await requireUser();
		const { altId } = await params;
		const { error } = await supabase.from("recipe_ingredient_alternatives").delete().eq("id", altId);
		if (error) throw error;
		return NextResponse.json({ ok: true });
	} catch (err: any) {
		const status = err?.status === 429 ? 429 : err?.message === "UNAUTHORIZED" ? 401 : 500;
		return NextResponse.json({ error: err?.message ?? "Server error" }, { status });
	}
}

