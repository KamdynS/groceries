import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { rateLimitOrThrow } from "@/lib/rateLimit";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
	try {
		await rateLimitOrThrow(req, "grocery-item-patch");
		const { supabase, user } = await requireUser();
		const { id } = await params;
		const body = await req.json().catch(() => ({}));
		const updates: Record<string, any> = {};
		if (typeof body.purchased === "boolean") updates.purchased = body.purchased;
		if (Object.keys(updates).length === 0) {
			return NextResponse.json({ error: "No fields to update" }, { status: 400 });
		}
		// Verify ownership via grocery_list
		const { data: item, error: errItem } = await supabase
			.from("grocery_list_items")
			.select("grocery_list_id")
			.eq("id", id)
			.single();
		if (errItem) throw errItem;
		const { data: list, error: errList } = await supabase
			.from("grocery_lists")
			.select("user_id")
			.eq("id", (item as any).grocery_list_id)
			.single();
		if (errList) throw errList;
		if ((list as any).user_id !== user.id) {
			return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
		}
		const { data, error } = await supabase
			.from("grocery_list_items")
			.update(updates)
			.eq("id", id)
			.select("*")
			.single();
		if (error) throw error;
		return NextResponse.json({ item: data });
	} catch (err: any) {
		const status = err?.status === 429 ? 429 : err?.message === "UNAUTHORIZED" ? 401 : 500;
		return NextResponse.json({ error: err?.message ?? "Server error" }, { status });
	}
}

