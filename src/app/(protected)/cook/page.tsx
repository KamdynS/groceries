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

type Deduction = {
	ingredient_name: string;
	unit: string;
	source_name: string;
	from_alternative: boolean;
	conversion_ratio?: number;
	quantity_to_deduct: number;
};

export default function CookPage() {
	const [recipes, setRecipes] = useState<Recipe[]>([]);
	const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null);
	const [preview, setPreview] = useState<Deduction[] | null>(null);
	const [loading, setLoading] = useState(true);
	const [cooking, setCooking] = useState(false);

	useEffect(() => {
		loadRecipes();
	}, []);

	async function loadRecipes() {
		try {
			const res = await fetch("/api/recipes");
			if (res.ok) {
				const data = await res.json();
				setRecipes(data.recipes || []);
			}
		} catch (err) {
			console.error("Failed to load recipes", err);
		} finally {
			setLoading(false);
		}
	}

	async function handlePreview(recipeId: string) {
		setSelectedRecipe(recipeId);
		try {
			const res = await fetch("/api/cook", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ recipeId, confirm: false }),
			});
			if (res.ok) {
				const data = await res.json();
				setPreview(data.preview || []);
			} else {
				const data = await res.json();
				alert(`Error: ${data.error || "Failed to preview"}`);
				setPreview(null);
			}
		} catch (err) {
			alert("Failed to preview");
			setPreview(null);
		}
	}

	async function handleCook() {
		if (!selectedRecipe) return;
		setCooking(true);
		try {
			const res = await fetch("/api/cook", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ recipeId: selectedRecipe, confirm: true }),
			});
			if (res.ok) {
				alert("Meal cooked! Ingredients deducted.");
				setSelectedRecipe(null);
				setPreview(null);
			} else {
				const data = await res.json();
				alert(`Error: ${data.error || "Failed to cook meal"}`);
			}
		} catch (err) {
			alert("Failed to cook meal");
		} finally {
			setCooking(false);
		}
	}

	if (loading) {
		return (
			<div className="min-h-screen bg-background p-6">
				<div className="text-foreground">Loading...</div>
			</div>
		);
	}

	const selectedRecipeData = recipes.find((r) => r.id === selectedRecipe);

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
							<Link href="/settings" className="text-foreground hover:text-accent">
								Settings
							</Link>
						</div>
					</div>
				</div>
			</nav>

			<main className="mx-auto max-w-4xl p-6">
				<h1 className="mb-6 text-2xl font-semibold text-foreground">Cook a Meal</h1>

				<div className="mb-6">
					<h2 className="mb-3 text-lg font-medium text-foreground">Select Recipe</h2>
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{recipes.map((recipe) => (
							<button
								key={recipe.id}
								onClick={() => handlePreview(recipe.id)}
								className={`rounded-lg border p-4 text-left transition-colors ${
									selectedRecipe === recipe.id
										? "border-accent bg-muted-bg"
										: "border-border bg-muted-bg hover:border-accent"
								}`}
							>
								<h3 className="font-medium text-foreground">{recipe.name}</h3>
								{recipe.servings && (
									<p className="mt-1 text-sm text-muted">{recipe.servings} serving{recipe.servings !== 1 ? "s" : ""}</p>
								)}
							</button>
						))}
					</div>
				</div>

				{preview && preview.length > 0 && selectedRecipeData && (
					<div className="rounded-lg border border-border bg-muted-bg p-6">
						<h2 className="mb-4 text-lg font-medium text-foreground">
							Preview: {selectedRecipeData.name}
						</h2>
						<div className="mb-4 space-y-2">
							{preview.map((deduction, idx) => (
								<div key={idx} className="flex items-center justify-between rounded border border-border bg-background p-2">
									<div className="text-sm text-foreground">
										{deduction.quantity_to_deduct} {deduction.unit} {deduction.source_name}
										{deduction.from_alternative && (
											<span className="text-muted"> (alternative for {deduction.ingredient_name})</span>
										)}
									</div>
								</div>
							))}
						</div>
						<button
							onClick={handleCook}
							disabled={cooking}
							className="rounded bg-accent px-4 py-2 text-background hover:bg-accent/90 disabled:opacity-50"
						>
							{cooking ? "Cooking..." : "Confirm & Cook"}
						</button>
					</div>
				)}

				{preview && preview.length === 0 && (
					<div className="rounded-lg border border-red bg-muted-bg p-4 text-red">
						This recipe cannot be made with current inventory.
					</div>
				)}
			</main>
		</div>
	);
}
