import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { rateLimitOrThrow } from "@/lib/rateLimit";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
	try {
		await rateLimitOrThrow(req, "ingredient-alternative-put");
		const { supabase } = await requireUser();
		const { id } = await params;
		const body = await req.json().catch(() => ({}));
		const updates: Record<string, any> = {};

		if (body.conversion_ratio !== undefined) {
			const ratio = Number(body.conversion_ratio);
			if (!Number.isFinite(ratio) || ratio <= 0) {
				return NextResponse.json({ error: "Invalid conversion ratio" }, { status: 400 });
			}
			updates.conversion_ratio = ratio;
		}
		if (body.notes !== undefined) {
			updates.notes = typeof body.notes === "string" ? body.notes.trim() || null : null;
		}

		if (Object.keys(updates).length === 0) {
			return NextResponse.json({ error: "No fields to update" }, { status: 400 });
		}

		const { data, error } = await supabase
			.from("ingredient_alternatives")
			.update(updates)
			.eq("id", id)
			.select("*")
			.single();

		if (error) throw error;
		return NextResponse.json({ alternative: data });
	} catch (err: any) {
		const status = err?.status === 429 ? 429 : err?.message === "UNAUTHORIZED" ? 401 : 500;
		return NextResponse.json({ error: err?.message ?? "Server error" }, { status });
	}
}

export async function DELETE(req: NextRequest, { params }: Params) {
	try {
		await rateLimitOrThrow(req, "ingredient-alternative-delete");
		const { supabase } = await requireUser();
		const { id } = await params;

		const { error } = await supabase.from("ingredient_alternatives").delete().eq("id", id);
		if (error) throw error;
		return NextResponse.json({ ok: true });
	} catch (err: any) {
		const status = err?.status === 429 ? 429 : err?.message === "UNAUTHORIZED" ? 401 : 500;
		return NextResponse.json({ error: err?.message ?? "Server error" }, { status });
	}
}

