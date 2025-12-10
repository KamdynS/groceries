import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function serverClient() {
	const cookieStore = await cookies();
	return createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
		{
			cookies: {
				getAll() {
					return cookieStore.getAll();
				},
				setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
					try {
						cookiesToSet.forEach(({ name, value, options }) =>
							cookieStore.set(name, value, options)
						);
					} catch {
						// The `setAll` method was called from a Server Component.
						// This can be ignored if you have middleware refreshing
						// user sessions.
					}
				},
			},
		}
	);
}

export async function requireUser() {
	const supabase = await serverClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) {
		throw new Error("UNAUTHORIZED");
	}
	return { supabase, user };
}


