"use client";

import { useState, useEffect } from "react";
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

export function RecipesClient({ initialRecipes }: { initialRecipes: Recipe[] }) {
	const router = useRouter();
	const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [formData, setFormData] = useState({ name: "", instructions: "", servings: "" });

	useEffect(() => {
		setRecipes(initialRecipes);
	}, [initialRecipes]);

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

	async function handleDelete(recipeId: string, recipeName: string) {
		if (!confirm(`Delete recipe "${recipeName}"?`)) return;
		try {
			const res = await fetch(`/api/recipes/${recipeId}`, { method: "DELETE" });
			if (res.ok) {
				setRecipes(recipes.filter((r) => r.id !== recipeId));
			} else {
				const data = await res.json();
				alert(`Error: ${data.error || "Failed to delete recipe"}`);
			}
		} catch (err) {
			alert("Failed to delete recipe");
		}
	}

	return (
		<>
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
									<p className="text-sm text-muted">
										{recipe.servings} serving{recipe.servings !== 1 ? "s" : ""}
									</p>
								)}
								{recipe.instructions && (
									<p className="mt-2 line-clamp-2 text-sm text-muted">{recipe.instructions}</p>
								)}
							</Link>
							<button
								onClick={(e) => {
									e.preventDefault();
									handleDelete(recipe.id, recipe.name);
								}}
								className="absolute right-2 top-2 opacity-0 text-sm text-red hover:underline group-hover:opacity-100"
							>
								Delete
							</button>
						</div>
					))}
				</div>
			)}
		</>
	);
}

