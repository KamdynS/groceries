"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clientSupabase } from "@/lib/supabase/client";
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

type DiscoverData = {
	makeable: Recipe[];
	almost: Array<{
		recipe: Recipe;
		missingCount: number;
		missingItems: Array<{ ingredient_name: string; unit: string; missing_quantity: number }>;
	}>;
};

export default function Home() {
	const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [discoverData, setDiscoverData] = useState<DiscoverData | null>(null);
	const [selectedRecipes, setSelectedRecipes] = useState<Set<string>>(new Set());
	const [cookingRecipe, setCookingRecipe] = useState<string | null>(null);

	useEffect(() => {
		checkAuth();
	}, []);

	async function checkAuth() {
		const supabase = clientSupabase();
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) {
			router.replace("/login");
			return;
		}
		loadDiscover();
	}

	async function loadDiscover() {
		try {
			const res = await fetch("/api/discover");
			if (res.ok) {
				const data = await res.json();
				setDiscoverData(data);
			}
		} catch (err) {
			console.error("Failed to load discover data", err);
		} finally {
			setLoading(false);
		}
	}

	async function handleCook(recipeId: string) {
		setCookingRecipe(recipeId);
		try {
			const res = await fetch("/api/cook", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ recipeId, confirm: true }),
			});
			if (res.ok) {
				await loadDiscover();
				alert("Meal cooked! Ingredients deducted.");
			} else {
				const data = await res.json();
				alert(`Error: ${data.error || "Failed to cook meal"}`);
			}
		} catch (err) {
			alert("Failed to cook meal");
		} finally {
			setCookingRecipe(null);
		}
	}

	async function handleGenerateGroceryList() {
		if (selectedRecipes.size === 0) {
			alert("Select at least one recipe");
			return;
		}
		try {
			const res = await fetch("/api/grocery-lists", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ selectedRecipeIds: Array.from(selectedRecipes) }),
			});
			if (res.ok) {
				router.push("/grocery");
			} else {
				const data = await res.json();
				alert(`Error: ${data.error || "Failed to generate list"}`);
			}
		} catch (err) {
			alert("Failed to generate grocery list");
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
						<h1 className="text-xl font-semibold text-foreground">Grocery</h1>
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
							<Link href="/settings" className="text-foreground hover:text-accent">
								Settings
							</Link>
						</div>
					</div>
				</div>
			</nav>

			<main className="mx-auto max-w-6xl p-6">
				<div className="mb-8">
					<h2 className="mb-4 text-2xl font-semibold text-foreground">What Can I Make?</h2>

					{discoverData?.makeable && discoverData.makeable.length > 0 ? (
						<div className="mb-6">
							<h3 className="mb-3 text-lg font-medium text-green">Makeable Now ({discoverData.makeable.length})</h3>
							<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
								{discoverData.makeable.map((recipe) => (
									<div
										key={recipe.id}
										className="rounded-lg border border-border bg-muted-bg p-4 transition-colors hover:border-accent"
									>
										<div className="mb-2 flex items-start justify-between">
											<h4 className="font-medium text-foreground">{recipe.name}</h4>
											<label className="flex items-center gap-2">
												<input
													type="checkbox"
													checked={selectedRecipes.has(recipe.id)}
													onChange={(e) => {
														const newSet = new Set(selectedRecipes);
														if (e.target.checked) {
															newSet.add(recipe.id);
														} else {
															newSet.delete(recipe.id);
														}
														setSelectedRecipes(newSet);
													}}
													className="h-4 w-4"
												/>
											</label>
										</div>
										<div className="flex gap-2">
											<button
												onClick={() => handleCook(recipe.id)}
												disabled={cookingRecipe === recipe.id}
												className="rounded bg-green px-3 py-1 text-sm text-background hover:bg-green/90 disabled:opacity-50"
            >
												{cookingRecipe === recipe.id ? "Cooking..." : "I Made This"}
											</button>
											<Link
												href={`/recipes/${recipe.id}`}
												className="rounded border border-border bg-background px-3 py-1 text-sm text-foreground hover:bg-muted-bg"
											>
												View
											</Link>
										</div>
									</div>
								))}
							</div>
						</div>
					) : (
						<div className="mb-6 rounded-lg border border-border bg-muted-bg p-4 text-muted">
							No recipes can be made with current inventory.
        </div>
					)}

					{discoverData?.almost && discoverData.almost.length > 0 && (
						<div className="mb-6">
							<h3 className="mb-3 text-lg font-medium text-yellow">Almost Makeable ({discoverData.almost.length})</h3>
							<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
								{discoverData.almost.map((entry) => (
									<div
										key={entry.recipe.id}
										className="rounded-lg border border-border bg-muted-bg p-4 transition-colors hover:border-accent"
									>
										<div className="mb-2 flex items-start justify-between">
											<h4 className="font-medium text-foreground">{entry.recipe.name}</h4>
											<label className="flex items-center gap-2">
												<input
													type="checkbox"
													checked={selectedRecipes.has(entry.recipe.id)}
													onChange={(e) => {
														const newSet = new Set(selectedRecipes);
														if (e.target.checked) {
															newSet.add(entry.recipe.id);
														} else {
															newSet.delete(entry.recipe.id);
														}
														setSelectedRecipes(newSet);
													}}
													className="h-4 w-4"
												/>
											</label>
										</div>
										<div className="mb-2 text-sm text-muted">
											Missing {entry.missingCount} ingredient{entry.missingCount !== 1 ? "s" : ""}
										</div>
										<div className="flex gap-2">
											<Link
												href={`/recipes/${entry.recipe.id}`}
												className="rounded border border-border bg-background px-3 py-1 text-sm text-foreground hover:bg-muted-bg"
											>
												View
											</Link>
										</div>
									</div>
								))}
							</div>
						</div>
					)}
				</div>

				{selectedRecipes.size > 0 && (
					<div className="sticky bottom-4 rounded-lg border-2 border-accent bg-muted-bg p-4 shadow-lg">
						<div className="flex items-center justify-between">
							<div className="text-foreground">
								{selectedRecipes.size} recipe{selectedRecipes.size !== 1 ? "s" : ""} selected
							</div>
							<button
								onClick={handleGenerateGroceryList}
								className="rounded bg-accent px-4 py-2 font-medium text-background hover:bg-accent/90"
          >
								Generate Grocery List
							</button>
						</div>
        </div>
				)}
      </main>
    </div>
  );
}
