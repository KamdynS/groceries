"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Recipe = {
	id: string;
	name: string;
	author_user_id: string;
	instructions: string | null;
	servings: number | null;
	created_at: string;
	updated_at: string;
};

type AlmostRecipe = {
	recipe: Recipe;
	missingCount: number;
	missingItems: Array<{ ingredient_name: string; unit: string; missing_quantity: number }>;
};

export default function DiscoverPage() {
	const [makeable, setMakeable] = useState<Recipe[]>([]);
	const [almost, setAlmost] = useState<AlmostRecipe[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadDiscover();
	}, []);

	async function loadDiscover() {
		try {
			const res = await fetch("/api/discover");
			if (res.ok) {
				const data = await res.json();
				setMakeable(data.makeable || []);
				setAlmost(data.almost || []);
			}
		} catch (err) {
			console.error("Failed to load discover data", err);
		} finally {
			setLoading(false);
		}
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
							<Link href="/discover" className="text-accent font-medium">
								Discover
							</Link>
							<Link href="/grocery" className="text-foreground hover:text-accent">
								Grocery Lists
							</Link>
							<Link href="/settings" className="text-foreground hover:text-accent">
								Settings
							</Link>
						</div>
					</div>
				</div>
			</nav>

			<main className="mx-auto max-w-6xl p-6">
				<h1 className="mb-6 text-2xl font-semibold text-foreground">What Can I Make?</h1>

				{makeable.length > 0 ? (
					<div className="mb-8">
						<h2 className="mb-4 text-lg font-medium text-green">Makeable Now ({makeable.length})</h2>
						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{makeable.map((recipe) => (
								<Link
									key={recipe.id}
									href={`/recipes/${recipe.id}`}
									className="rounded-lg border border-green bg-muted-bg p-4 transition-colors hover:border-accent"
								>
									<h3 className="font-medium text-foreground">{recipe.name}</h3>
									{recipe.servings && (
										<p className="mt-1 text-sm text-muted">{recipe.servings} serving{recipe.servings !== 1 ? "s" : ""}</p>
									)}
								</Link>
							))}
						</div>
					</div>
				) : (
					<div className="mb-8 rounded-lg border border-border bg-muted-bg p-4 text-muted">
						No recipes can be made with current inventory.
					</div>
				)}

				{almost.length > 0 && (
					<div>
						<h2 className="mb-4 text-lg font-medium text-yellow">Almost Makeable ({almost.length})</h2>
						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{almost.map((entry) => (
								<div
									key={entry.recipe.id}
									className="rounded-lg border border-border bg-muted-bg p-4 transition-colors hover:border-accent"
								>
									<div className="mb-2 flex items-start justify-between">
										<Link href={`/recipes/${entry.recipe.id}`} className="font-medium text-foreground hover:text-accent">
											{entry.recipe.name}
										</Link>
									</div>
									<div className="mb-2 text-sm text-muted">
										Missing {entry.missingCount} ingredient{entry.missingCount !== 1 ? "s" : ""}:
									</div>
									<ul className="space-y-1 text-sm text-muted">
										{entry.missingItems.map((item, idx) => (
											<li key={idx}>
												{item.missing_quantity} {item.unit} {item.ingredient_name}
											</li>
										))}
									</ul>
								</div>
							))}
						</div>
					</div>
				)}
			</main>
		</div>
	);
}
