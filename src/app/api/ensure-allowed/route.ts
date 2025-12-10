import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { rateLimitOrThrow } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
	try {
		await rateLimitOrThrow(req, "ensure-allowed");
		const { supabase, user } = await requireUser();
		const email = user.email ?? null;
		const { data, error } = await supabase
			.from("app_users")
			.upsert({ user_id: user.id, email }, { onConflict: "user_id" })
			.select("user_id")
			.single();
		if (error) throw error;
		return NextResponse.json({ ok: true, user_id: data?.user_id ?? user.id });
	} catch (err: any) {
		const status = err?.status === 429 ? 429 : err?.message === "UNAUTHORIZED" ? 401 : 500;
		return NextResponse.json({ error: err?.message ?? "Server error" }, { status });
	}
}


