import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { rateLimitOrThrow } from "@/lib/rateLimit";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
	try {
		await rateLimitOrThrow(req, "grocery-list-get");
		const { supabase, user } = await requireUser();
		const { id } = await params;
		const { data: list, error: errL } = await supabase.from("grocery_lists").select("*").eq("id", id).eq("user_id", user.id).single();
		if (errL) throw errL;
		const { data: items, error: errI } = await supabase.from("grocery_list_items").select("*").eq("grocery_list_id", id).order("ingredient_name", { ascending: true });
		if (errI) throw errI;
		return NextResponse.json({ list, items: items ?? [] });
	} catch (err: any) {
		const status = err?.status === 429 ? 429 : err?.message === "UNAUTHORIZED" ? 401 : 500;
		return NextResponse.json({ error: err?.message ?? "Server error" }, { status });
	}
}

export async function PATCH(req: NextRequest, { params }: Params) {
	try {
		await rateLimitOrThrow(req, "grocery-list-patch");
		const { supabase, user } = await requireUser();
		const { id } = await params;
		const body = await req.json().catch(() => ({}));
		const updates: Record<string, any> = {};
		if (typeof body.completed === "boolean") updates.completed = body.completed;
		if (body.week_starting !== undefined) updates.week_starting = body.week_starting ? new Date(body.week_starting) : null;
		if (Object.keys(updates).length === 0) return NextResponse.json({ error: "No fields" }, { status: 400 });
		const { data, error } = await supabase.from("grocery_lists").update(updates).eq("id", id).eq("user_id", user.id).select("*").single();
		if (error) throw error;
		return NextResponse.json({ list: data });
	} catch (err: any) {
		const status = err?.status === 429 ? 429 : err?.message === "UNAUTHORIZED" ? 401 : 500;
		return NextResponse.json({ error: err?.message ?? "Server error" }, { status });
	}
}

export async function DELETE(req: NextRequest, { params }: Params) {
	try {
		await rateLimitOrThrow(req, "grocery-list-delete");
		const { supabase, user } = await requireUser();
		const { id } = await params;
		// Ensure ownership
		const { data: list, error: errL } = await supabase.from("grocery_lists").select("id").eq("id", id).eq("user_id", user.id).single();
		if (errL) throw errL;
		// Cascade delete via FK; but ensure items removed if needed
		const { error: errD } = await supabase.from("grocery_lists").delete().eq("id", list.id);
		if (errD) throw errD;
		return NextResponse.json({ ok: true });
	} catch (err: any) {
		const status = err?.status === 429 ? 429 : err?.message === "UNAUTHORIZED" ? 401 : 500;
		return NextResponse.json({ error: err?.message ?? "Server error" }, { status });
	}
}


