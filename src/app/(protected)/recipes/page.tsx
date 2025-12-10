"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Recipe = {
	id: string;
	name: string;
	author_user_id: string;
	instructions: string | null;
	servings: number | null;
	created_at: string;
	updated_at: string;
};

export default function RecipesPage() {
	const router = useRouter();
	const [recipes, setRecipes] = useState<Recipe[]>([]);
	const [loading, setLoading] = useState(true);
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [formData, setFormData] = useState({ name: "", instructions: "", servings: "" });

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

	async function handleCreate() {
		if (!formData.name.trim()) {
			alert("Recipe name required");
			return;
		}
		try {
			const res = await fetch("/api/recipes", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: formData.name.trim(),
					instructions: formData.instructions.trim() || null,
					servings: formData.servings ? parseInt(formData.servings) : null,
				}),
			});
			if (res.ok) {
				const data = await res.json();
				router.push(`/recipes/${data.recipe.id}`);
			} else {
				const data = await res.json();
				alert(`Error: ${data.error || "Failed to create recipe"}`);
			}
		} catch (err) {
			alert("Failed to create recipe");
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
							<Link href="/recipes" className="text-accent font-medium">
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
				<div className="mb-6 flex items-center justify-between">
					<h1 className="text-2xl font-semibold text-foreground">Recipes</h1>
					<button
						onClick={() => setShowCreateForm(!showCreateForm)}
						className="rounded bg-accent px-4 py-2 text-background hover:bg-accent/90"
					>
						{showCreateForm ? "Cancel" : "New Recipe"}
					</button>
				</div>

				{showCreateForm && (
					<div className="mb-6 rounded-lg border border-border bg-muted-bg p-4">
						<h2 className="mb-3 text-lg font-medium text-foreground">Create Recipe</h2>
						<div className="space-y-3">
							<input
								type="text"
								placeholder="Recipe name *"
								value={formData.name}
								onChange={(e) => setFormData({ ...formData, name: e.target.value })}
								className="w-full rounded border border-border bg-background px-3 py-2 text-foreground"
								onKeyDown={(e) => {
									if (e.key === "Enter" && formData.name.trim()) {
										handleCreate();
									}
								}}
								autoFocus
							/>
							<textarea
								placeholder="Instructions (optional)"
								value={formData.instructions}
								onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
								className="w-full rounded border border-border bg-background px-3 py-2 text-foreground"
								rows={4}
							/>
							<input
								type="number"
								placeholder="Servings (optional)"
								value={formData.servings}
								onChange={(e) => setFormData({ ...formData, servings: e.target.value })}
								className="w-full rounded border border-border bg-background px-3 py-2 text-foreground"
							/>
							<button
								onClick={handleCreate}
								className="rounded bg-accent px-4 py-2 text-background hover:bg-accent/90"
							>
								Create & Add Ingredients
							</button>
						</div>
					</div>
				)}

				{recipes.length === 0 ? (
					<div className="rounded-lg border border-border bg-muted-bg p-8 text-center text-muted">
						No recipes yet. Create your first recipe!
					</div>
				) : (
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{recipes.map((recipe) => (
							<div
								key={recipe.id}
								className="group relative rounded-lg border border-border bg-muted-bg p-4 transition-colors hover:border-accent"
							>
								<Link href={`/recipes/${recipe.id}`} className="block">
									<h3 className="mb-1 font-medium text-foreground">{recipe.name}</h3>
									{recipe.servings && (
										<p className="text-sm text-muted">{recipe.servings} serving{recipe.servings !== 1 ? "s" : ""}</p>
									)}
									{recipe.instructions && (
										<p className="mt-2 line-clamp-2 text-sm text-muted">{recipe.instructions}</p>
									)}
								</Link>
								<button
									onClick={async (e) => {
										e.preventDefault();
										if (confirm(`Delete recipe "${recipe.name}"?`)) {
											try {
												const res = await fetch(`/api/recipes/${recipe.id}`, { method: "DELETE" });
												if (res.ok) {
													await loadRecipes();
												} else {
													const data = await res.json();
													alert(`Error: ${data.error || "Failed to delete recipe"}`);
												}
											} catch (err) {
												alert("Failed to delete recipe");
											}
										}
									}}
									className="absolute right-2 top-2 opacity-0 text-sm text-red hover:underline group-hover:opacity-100"
								>
									Delete
								</button>
							</div>
						))}
					</div>
				)}
			</main>
		</div>
	);
}
