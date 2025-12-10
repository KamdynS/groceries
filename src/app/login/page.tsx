/* eslint-disable react-hooks/rules-of-hooks */
"use client";
import { useState } from "react";
import { clientSupabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setLoading(true);
		try {
			const supabase = clientSupabase();
			const { error } = await supabase.auth.signInWithPassword({ email, password });
			if (error) {
				setError(error.message);
			} else {
				// Ensure whitelist row exists (idempotent)
				await fetch("/api/ensure-allowed", { method: "POST" });
				router.replace("/");
			}
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="min-h-screen bg-background flex items-center justify-center p-6">
			<div className="w-full max-w-sm">
				<h1 className="text-2xl font-semibold mb-6 text-foreground">Sign in</h1>
				<form onSubmit={onSubmit} className="space-y-4">
				<input
						className="w-full border border-border rounded bg-background px-3 py-2 text-foreground"
					placeholder="Email"
					type="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					required
				/>
				<input
						className="w-full border border-border rounded bg-background px-3 py-2 text-foreground"
					placeholder="Password"
					type="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					required
				/>
				<button
						className="w-full bg-accent text-background rounded px-3 py-2 hover:bg-accent/90 disabled:opacity-50"
					disabled={loading}
					type="submit"
				>
					{loading ? "Signing in..." : "Sign in"}
				</button>
					{error && <p className="text-red text-sm">{error}</p>}
			</form>
			</div>
		</div>
	);
}


