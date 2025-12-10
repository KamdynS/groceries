"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clientSupabase } from "@/lib/supabase/client";

export default function SettingsPage() {
	const router = useRouter();
	const [user, setUser] = useState<{ email: string } | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadUser();
	}, []);

	async function loadUser() {
		const supabase = clientSupabase();
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (user) {
			setUser({ email: user.email || "" });
		}
		setLoading(false);
	}

	async function handleLogout() {
		const supabase = clientSupabase();
		await supabase.auth.signOut();
		router.push("/login");
	}

	if (loading) {
		return (
			<div className="min-h-screen bg-background p-6">
				<div className="text-foreground">Loading...</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background">
			<nav className="border-b border-border bg-muted-bg/50">
				<div className="mx-auto max-w-6xl px-4 py-3">
					<div className="flex items-center justify-between">
						<Link href="/" className="text-xl font-semibold text-foreground hover:text-accent">
							Grocery
						</Link>
						<div className="flex gap-4 text-sm">
							<Link href="/inventory" className="text-foreground hover:text-accent">
								Inventory
							</Link>
							<Link href="/recipes" className="text-foreground hover:text-accent">
								Recipes
							</Link>
							<Link href="/ingredients" className="text-foreground hover:text-accent">
								Ingredients
							</Link>
							<Link href="/discover" className="text-foreground hover:text-accent">
								Discover
							</Link>
							<Link href="/grocery" className="text-foreground hover:text-accent">
								Grocery Lists
							</Link>
							<Link href="/settings" className="text-accent font-medium">
								Settings
							</Link>
						</div>
					</div>
				</div>
			</nav>

			<main className="mx-auto max-w-4xl p-6">
				<h1 className="mb-6 text-2xl font-semibold text-foreground">Settings</h1>

				<div className="space-y-6">
					<div className="rounded-lg border border-border bg-muted-bg p-4">
						<h2 className="mb-2 font-medium text-foreground">Account</h2>
						<div className="text-sm text-muted">Email: {user?.email}</div>
					</div>

					<div className="rounded-lg border border-border bg-muted-bg p-4">
						<button
							onClick={handleLogout}
							className="rounded bg-red px-4 py-2 text-background hover:bg-red/90"
						>
							Logout
						</button>
					</div>
				</div>
			</main>
		</div>
	);
}
