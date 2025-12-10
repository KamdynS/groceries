import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { rateLimitOrThrow } from "@/lib/rateLimit";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
	try {
		await rateLimitOrThrow(req, "inventory-patch");
		const { supabase, user } = await requireUser();
		const { id } = await params;
		const body = await req.json().catch(() => ({}));
		const updates: Record<string, any> = {};
		if (typeof body.name === "string") updates.name = body.name.trim();
		if (typeof body.unit === "string") updates.unit = body.unit.trim();
		if (body.quantity !== undefined) {
			const q = Number(body.quantity);
			if (!Number.isFinite(q) || q < 0) return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
			updates.quantity = q;
		}
		if (Object.keys(updates).length === 0) {
			return NextResponse.json({ error: "No fields to update" }, { status: 400 });
		}
		const { data, error } = await supabase
			.from("ingredients")
			.update(updates)
			.eq("id", id)
			.eq("user_id", user.id)
			.select("*")
			.single();
		if (error) throw error;
		return NextResponse.json({ item: data });
	} catch (err: any) {
		const status = err?.status === 429 ? 429 : err?.message === "UNAUTHORIZED" ? 401 : 500;
		return NextResponse.json({ error: err?.message ?? "Server error" }, { status });
	}
}

export async function DELETE(req: NextRequest, { params }: Params) {
	try {
		await rateLimitOrThrow(req, "inventory-delete");
		const { supabase, user } = await requireUser();
		const { id } = await params;
		const { error } = await supabase.from("ingredients").delete().eq("id", id).eq("user_id", user.id);
		if (error) throw error;
		return NextResponse.json({ ok: true });
	} catch (err: any) {
	 const status = err?.status === 429 ? 429 : err?.message === "UNAUTHORIZED" ? 401 : 500;
		return NextResponse.json({ error: err?.message ?? "Server error" }, { status });
	}
}


