import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { rateLimitOrThrow } from "@/lib/rateLimit";

export async function GET(req: NextRequest) {
	try {
		await rateLimitOrThrow(req, "recipes-get");
		await requireUser(); // require auth even though recipes are global
		const { supabase } = await requireUser();
		const { data, error } = await supabase.from("recipes").select("*").order("created_at", { ascending: false });
		if (error) throw error;
		return NextResponse.json({ recipes: data ?? [] });
	} catch (err: any) {
		const status = err?.status === 429 ? 429 : err?.message === "UNAUTHORIZED" ? 401 : 500;
		return NextResponse.json({ error: err?.message ?? "Server error" }, { status });
	}
}

export async function POST(req: NextRequest) {
	try {
		await rateLimitOrThrow(req, "recipes-post");
		const { supabase, user } = await requireUser();
		const body = await req.json().catch(() => ({}));
		const name = (body?.name ?? "").toString().trim();
		if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
		const instructions = typeof body?.instructions === "string" ? body.instructions : null;
		const servings =
			body?.servings === undefined ? null : Number.isFinite(Number(body.servings)) ? Number(body.servings) : null;
		const { data, error } = await supabase
			.from("recipes")
			.insert([{ author_user_id: user.id, name, instructions, servings }])
			.select("*")
			.single();
		if (error) throw error;
		return NextResponse.json({ recipe: data }, { status: 201 });
	} catch (err: any) {
		const status = err?.status === 429 ? 429 : err?.message === "UNAUTHORIZED" ? 401 : 500;
		return NextResponse.json({ error: err?.message ?? "Server error" }, { status });
	}
}


