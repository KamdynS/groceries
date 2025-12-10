import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { rateLimitOrThrow } from "@/lib/rateLimit";

export async function GET(req: NextRequest) {
	try {
		await rateLimitOrThrow(req, "ingredient-names-get");
		const { supabase } = await requireUser();
		const search = new URL(req.url).searchParams.get("search")?.toLowerCase().trim() || "";

		let query = supabase.from("ingredient_names").select("name").order("name", { ascending: true });

		if (search) {
			// Match on word boundaries - search for ingredients containing the search term
			query = query.ilike("name", `%${search}%`);
		}

		const { data, error } = await query.limit(50);
		if (error) throw error;

		// If search provided and no results, return empty array (user can create new)
		// If no search, return all (up to limit)
		return NextResponse.json({ ingredients: (data ?? []).map((i) => i.name) });
	} catch (err: any) {
		const status = err?.status === 429 ? 429 : err?.message === "UNAUTHORIZED" ? 401 : 500;
		return NextResponse.json({ error: err?.message ?? "Server error" }, { status });
	}
}

export async function POST(req: NextRequest) {
	try {
		await rateLimitOrThrow(req, "ingredient-names-post");
		const { supabase } = await requireUser();
		const body = await req.json().catch(() => ({}));
		const name = (body?.name ?? "").toString().trim();

		if (!name) {
			return NextResponse.json({ error: "Name required" }, { status: 400 });
		}

		// Try to insert, but ignore if already exists (unique constraint)
		const { data, error } = await supabase
			.from("ingredient_names")
			.insert([{ name }])
			.select("name")
			.single();

		if (error) {
			// If unique constraint violation, just return the existing name
			if (error.code === "23505") {
				return NextResponse.json({ ingredient: name });
			}
			throw error;
		}

		return NextResponse.json({ ingredient: data.name }, { status: 201 });
	} catch (err: any) {
		const status = err?.status === 429 ? 429 : err?.message === "UNAUTHORIZED" ? 401 : 500;
		return NextResponse.json({ error: err?.message ?? "Server error" }, { status });
	}
}

