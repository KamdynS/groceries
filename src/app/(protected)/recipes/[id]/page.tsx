"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { UNITS } from "@/lib/units";

type Recipe = {
	id: string;
	name: string;
	author_user_id: string;
	instructions: string | null;
	servings: number | null;
	created_at: string;
	updated_at: string;
};

type RecipeIngredient = {
	id: string;
	recipe_id: string;
	ingredient_name: string;
	quantity: number;
	unit: string;
	allows_alternatives: boolean;
	alternatives?: Alternative[];
};

type Alternative = {
	id: string;
	recipe_ingredient_id: string;
	alternative_name: string;
	conversion_ratio: number;
	notes: string | null;
};

export default function RecipeDetailPage() {
	const params = useParams();
	const router = useRouter();
	const recipeId = params.id as string;
	const [recipe, setRecipe] = useState<Recipe | null>(null);
	const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
	const [loading, setLoading] = useState(true);
	const [showIngredientForm, setShowIngredientForm] = useState(false);
	const [showAltForm, setShowAltForm] = useState<string | null>(null);
	const [ingredientForm, setIngredientForm] = useState({
		ingredient_name: "",
		quantity: "",
		unit: "",
		allows_alternatives: false,
		no_measurement: false,
	});
	const [altForm, setAltForm] = useState({
		alternative_name: "",
		conversion_ratio: "1.0",
		notes: "",
	});
	const [ingredientSuggestions, setIngredientSuggestions] = useState<string[]>([]);
	const [showIngredientDropdown, setShowIngredientDropdown] = useState(false);
	const [altSuggestions, setAltSuggestions] = useState<string[]>([]);
	const [showAltDropdown, setShowAltDropdown] = useState(false);
	const ingredientInputRef = useRef<HTMLInputElement>(null);
	const altInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (recipeId) {
			loadRecipe();
		}
	}, [recipeId]);

	async function loadRecipe() {
		try {
			const res = await fetch(`/api/recipes/${recipeId}`);
			if (res.ok) {
				const data = await res.json();
				setRecipe(data.recipe);
				setIngredients(data.ingredients || []);
			} else {
				alert("Failed to load recipe");
				router.push("/recipes");
			}
		} catch (err) {
			console.error("Failed to load recipe", err);
			router.push("/recipes");
		} finally {
			setLoading(false);
		}
	}

	async function searchIngredients(query: string) {
		if (!query.trim()) {
			setIngredientSuggestions([]);
			return;
		}
		try {
			const res = await fetch(`/api/ingredient-names?search=${encodeURIComponent(query)}`);
			if (res.ok) {
				const data = await res.json();
				const suggestions = data.ingredients || [];
				// Check if the query exactly matches any suggestion (case-insensitive)
				const exactMatch = suggestions.some((ing: string) => ing.toLowerCase() === query.trim().toLowerCase());
				// If no exact match, add a "create" option
				if (!exactMatch && query.trim()) {
					setIngredientSuggestions([...suggestions, `CREATE:${query.trim()}`]);
				} else {
					setIngredientSuggestions(suggestions);
				}
			}
		} catch (err) {
			console.error("Failed to search ingredients", err);
		}
	}

	async function searchAltIngredients(query: string) {
		if (!query.trim()) {
			setAltSuggestions([]);
			return;
		}
		try {
			const res = await fetch(`/api/ingredient-names?search=${encodeURIComponent(query)}`);
			if (res.ok) {
				const data = await res.json();
				const suggestions = data.ingredients || [];
				// Check if the query exactly matches any suggestion (case-insensitive)
				const exactMatch = suggestions.some((ing: string) => ing.toLowerCase() === query.trim().toLowerCase());
				// If no exact match, add a "create" option
				if (!exactMatch && query.trim()) {
					setAltSuggestions([...suggestions, `CREATE:${query.trim()}`]);
				} else {
					setAltSuggestions(data.ingredients || []);
				}
			}
		} catch (err) {
			console.error("Failed to search ingredients", err);
		}
	}

	async function createIngredient(name: string) {
		try {
			const res = await fetch("/api/ingredient-names", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name }),
			});
			if (res.ok) {
				return name;
			}
		} catch (err) {
			console.error("Failed to create ingredient", err);
		}
		return name;
	}

	async function handleAddIngredient() {
		if (!ingredientForm.ingredient_name.trim()) {
			alert("Ingredient name required");
			return;
		}
		if (!ingredientForm.no_measurement && (!ingredientForm.quantity || !ingredientForm.unit)) {
			alert("Quantity and unit required (or check 'no measurement')");
			return;
		}

		// Ensure ingredient exists in database
		const ingredientName = await createIngredient(ingredientForm.ingredient_name.trim());

		try {
			const res = await fetch(`/api/recipes/${recipeId}/ingredients`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					ingredient_name: ingredientName,
					quantity: ingredientForm.no_measurement ? 0 : parseFloat(ingredientForm.quantity),
					unit: ingredientForm.no_measurement ? "count" : ingredientForm.unit.trim(),
					allows_alternatives: ingredientForm.allows_alternatives,
				}),
			});
			if (res.ok) {
				setIngredientForm({
					ingredient_name: "",
					quantity: "",
					unit: "",
					allows_alternatives: false,
					no_measurement: false,
				});
				setShowIngredientForm(false);
				setShowIngredientDropdown(false);
				await loadRecipe();
			} else {
				const data = await res.json();
				alert(`Error: ${data.error || "Failed to add ingredient"}`);
			}
		} catch (err) {
			alert("Failed to add ingredient");
		}
	}

	async function handleAddAlternative(ingredientId: string) {
		if (!altForm.alternative_name.trim() || !altForm.conversion_ratio) {
			alert("Name and conversion ratio required");
			return;
		}

		// Ensure ingredient exists in database
		const altName = await createIngredient(altForm.alternative_name.trim());

		try {
			const res = await fetch(`/api/recipes/${recipeId}/ingredients/${ingredientId}/alternatives`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					alternative_name: altName,
					conversion_ratio: parseFloat(altForm.conversion_ratio),
					notes: altForm.notes.trim() || null,
				}),
			});
			if (res.ok) {
				setAltForm({ alternative_name: "", conversion_ratio: "1.0", notes: "" });
				setShowAltForm(null);
				setShowAltDropdown(false);
				await loadRecipe();
			} else {
				const data = await res.json();
				alert(`Error: ${data.error || "Failed to add alternative"}`);
			}
		} catch (err) {
			alert("Failed to add alternative");
		}
	}

	async function handleDeleteIngredient(ingredientId: string) {
		if (!confirm("Delete this ingredient?")) return;
		try {
			const res = await fetch(`/api/recipes/${recipeId}/ingredients/${ingredientId}`, { method: "DELETE" });
			if (res.ok) {
				await loadRecipe();
			} else {
				const data = await res.json();
				alert(`Error: ${data.error || "Failed to delete ingredient"}`);
			}
		} catch (err) {
			alert("Failed to delete ingredient");
		}
	}

	async function handleDeleteAlternative(ingredientId: string, altId: string) {
		if (!confirm("Delete this alternative?")) return;
		try {
			const res = await fetch(`/api/recipes/${recipeId}/ingredients/${ingredientId}/alternatives/${altId}`, {
				method: "DELETE",
			});
			if (res.ok) {
				await loadRecipe();
			} else {
				const data = await res.json();
				alert(`Error: ${data.error || "Failed to delete alternative"}`);
			}
		} catch (err) {
			alert("Failed to delete alternative");
		}
	}

	if (loading) {
		return (
			<div className="min-h-screen bg-background p-6">
				<div className="text-foreground">Loading...</div>
			</div>
		);
	}

	if (!recipe) {
		return null;
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

			<main className="mx-auto max-w-4xl p-6">
				<div className="mb-6">
					<Link href="/recipes" className="text-sm text-muted hover:text-accent">
						← Back to Recipes
					</Link>
					<div className="mt-2 flex items-start justify-between">
						<div>
							<h1 className="text-2xl font-semibold text-foreground">{recipe.name}</h1>
							{recipe.servings && (
								<p className="mt-1 text-sm text-muted">{recipe.servings} serving{recipe.servings !== 1 ? "s" : ""}</p>
							)}
						</div>
						<button
							onClick={async () => {
								if (confirm(`Delete recipe "${recipe.name}"?`)) {
									try {
										const res = await fetch(`/api/recipes/${recipeId}`, { method: "DELETE" });
										if (res.ok) {
											router.push("/recipes");
										} else {
											const data = await res.json();
											alert(`Error: ${data.error || "Failed to delete recipe"}`);
										}
									} catch (err) {
										alert("Failed to delete recipe");
									}
								}
							}}
							className="rounded bg-red px-3 py-1 text-sm text-background hover:bg-red/90"
						>
							Delete Recipe
						</button>
					</div>
					{recipe.instructions && (
						<div className="mt-4 rounded-lg border border-border bg-muted-bg p-4">
							<h2 className="mb-2 font-medium text-foreground">Instructions</h2>
							<p className="whitespace-pre-wrap text-sm text-foreground">{recipe.instructions}</p>
						</div>
					)}
				</div>

				<div className="mb-4 flex items-center justify-between">
					<h2 className="text-xl font-semibold text-foreground">Ingredients</h2>
					<button
						onClick={() => setShowIngredientForm(!showIngredientForm)}
						className="rounded bg-accent px-3 py-1 text-sm text-background hover:bg-accent/90"
					>
						{showIngredientForm ? "Cancel" : "Add Ingredient"}
					</button>
				</div>

				{showIngredientForm && (
					<div className="mb-4 rounded-lg border border-border bg-muted-bg p-4">
						<div className="space-y-3">
							<div className="relative">
								<input
									ref={ingredientInputRef}
									type="text"
									placeholder="Ingredient name"
									value={ingredientForm.ingredient_name}
									onChange={(e) => {
										setIngredientForm({ ...ingredientForm, ingredient_name: e.target.value });
										searchIngredients(e.target.value);
										setShowIngredientDropdown(true);
									}}
									onFocus={() => {
										if (ingredientForm.ingredient_name) {
											searchIngredients(ingredientForm.ingredient_name);
											setShowIngredientDropdown(true);
										}
									}}
									onBlur={() => {
										// Delay to allow click on suggestion
										setTimeout(() => setShowIngredientDropdown(false), 200);
									}}
									className="w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground"
								/>
								{showIngredientDropdown && ingredientSuggestions.length > 0 && (
									<div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded border border-border bg-background shadow-lg">
										{ingredientSuggestions.map((suggestion) => {
											if (suggestion.startsWith("CREATE:")) {
												const newName = suggestion.replace("CREATE:", "");
												return (
													<button
														key={suggestion}
														type="button"
														onClick={async () => {
															const created = await createIngredient(newName);
															setIngredientForm({ ...ingredientForm, ingredient_name: created });
															setShowIngredientDropdown(false);
														}}
														className="w-full px-3 py-2 text-left text-sm text-accent hover:bg-muted-bg font-medium"
													>
														+ Add "{newName}" to ingredients
													</button>
												);
											}
											return (
												<button
													key={suggestion}
													type="button"
													onClick={() => {
														setIngredientForm({ ...ingredientForm, ingredient_name: suggestion });
														setShowIngredientDropdown(false);
													}}
													className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted-bg"
												>
													{suggestion}
												</button>
											);
										})}
									</div>
								)}
							</div>
							<div className="grid gap-3 sm:grid-cols-3">
								<input
									type="number"
									step="0.01"
									placeholder="Quantity"
									value={ingredientForm.quantity}
									onChange={(e) => setIngredientForm({ ...ingredientForm, quantity: e.target.value })}
									disabled={ingredientForm.no_measurement}
									className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-50"
								/>
								<select
									value={ingredientForm.unit}
									onChange={(e) => setIngredientForm({ ...ingredientForm, unit: e.target.value })}
									disabled={ingredientForm.no_measurement}
									className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-50"
								>
									<option value="">Select unit</option>
									{UNITS.map((unit) => (
										<option key={unit} value={unit}>
											{unit}
										</option>
									))}
								</select>
								<label className="flex items-center gap-2">
									<input
										type="checkbox"
										checked={ingredientForm.no_measurement}
										onChange={(e) => {
											setIngredientForm({
												...ingredientForm,
												no_measurement: e.target.checked,
												quantity: e.target.checked ? "" : ingredientForm.quantity,
												unit: e.target.checked ? "" : ingredientForm.unit,
											});
										}}
										className="h-4 w-4"
									/>
									<span className="text-sm text-foreground">No measurement</span>
								</label>
							</div>
							<label className="flex items-center gap-2">
								<input
									type="checkbox"
									checked={ingredientForm.allows_alternatives}
									onChange={(e) =>
										setIngredientForm({ ...ingredientForm, allows_alternatives: e.target.checked })
									}
									className="h-4 w-4"
								/>
								<span className="text-sm text-foreground">
									Allow alternatives (you can add them after saving this ingredient)
								</span>
							</label>
							<button
								onClick={handleAddIngredient}
								className="rounded bg-accent px-4 py-2 text-sm text-background hover:bg-accent/90"
							>
								Add
							</button>
						</div>
					</div>
				)}

				{ingredients.length === 0 ? (
					<div className="rounded-lg border border-border bg-muted-bg p-4 text-center text-muted">
						No ingredients yet. Add ingredients to get started.
					</div>
				) : (
					<div className="space-y-4">
						{ingredients.map((ing) => (
							<div key={ing.id} className="rounded-lg border border-border bg-muted-bg p-4">
								<div className="mb-2 flex items-start justify-between">
									<div>
										<div className="font-medium text-foreground">
											{ing.quantity > 0 ? `${ing.quantity} ${ing.unit} ` : ""}
											{ing.ingredient_name}
										</div>
										{ing.allows_alternatives && (
											<div className="mt-1 text-xs text-muted">Allows alternatives</div>
										)}
									</div>
									<button
										onClick={() => handleDeleteIngredient(ing.id)}
										className="text-sm text-red hover:underline"
									>
										Delete
									</button>
								</div>

								{ing.allows_alternatives && (
									<div className="mt-3 rounded-lg border border-border bg-background p-3">
										<div className="mb-3 flex items-center justify-between">
											<div className="text-sm font-medium text-foreground">Alternatives</div>
											<button
												onClick={() => setShowAltForm(showAltForm === ing.id ? null : ing.id)}
												className="rounded bg-blue px-3 py-1 text-sm text-background hover:bg-blue/90"
											>
												{showAltForm === ing.id ? "Cancel" : "+ Add Alternative"}
											</button>
										</div>

										{showAltForm === ing.id && (
											<div className="mb-3 space-y-2">
												<div className="relative">
													<input
														ref={altInputRef}
														type="text"
														placeholder="Alternative ingredient name"
														value={altForm.alternative_name}
														onChange={(e) => {
															setAltForm({ ...altForm, alternative_name: e.target.value });
															searchAltIngredients(e.target.value);
															setShowAltDropdown(true);
														}}
														onFocus={() => {
															if (altForm.alternative_name) {
																searchAltIngredients(altForm.alternative_name);
																setShowAltDropdown(true);
															}
														}}
														onBlur={() => {
															setTimeout(() => setShowAltDropdown(false), 200);
														}}
														className="w-full rounded border border-border bg-background px-2 py-1 text-sm text-foreground"
													/>
													{showAltDropdown && altSuggestions.length > 0 && (
														<div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded border border-border bg-background shadow-lg">
															{altSuggestions.map((suggestion) => {
																if (suggestion.startsWith("CREATE:")) {
																	const newName = suggestion.replace("CREATE:", "");
																	return (
																		<button
																			key={suggestion}
																			type="button"
																			onClick={async () => {
																				const created = await createIngredient(newName);
																				setAltForm({ ...altForm, alternative_name: created });
																				setShowAltDropdown(false);
																			}}
																			className="w-full px-3 py-2 text-left text-sm text-accent hover:bg-muted-bg font-medium"
																		>
																			+ Add "{newName}" to ingredients
																		</button>
																	);
																}
																return (
																	<button
																		key={suggestion}
																		type="button"
																		onClick={() => {
																			setAltForm({ ...altForm, alternative_name: suggestion });
																			setShowAltDropdown(false);
																		}}
																		className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted-bg"
																	>
																		{suggestion}
																	</button>
																);
															})}
														</div>
													)}
												</div>
												<div className="grid gap-2 sm:grid-cols-2">
													<input
														type="number"
														step="0.01"
														placeholder="Conversion ratio"
														value={altForm.conversion_ratio}
														onChange={(e) => setAltForm({ ...altForm, conversion_ratio: e.target.value })}
														className="rounded border border-border bg-background px-2 py-1 text-sm text-foreground"
													/>
													<button
														onClick={() => handleAddAlternative(ing.id)}
														className="rounded bg-accent px-3 py-1 text-sm text-background hover:bg-accent/90"
													>
														Add
													</button>
												</div>
											</div>
										)}

										{ing.alternatives && ing.alternatives.length > 0 && (
											<div className="space-y-1">
												{ing.alternatives.map((alt) => (
													<div key={alt.id} className="flex items-center justify-between rounded border border-border bg-background p-2 text-sm">
														<div className="text-foreground">
															{alt.alternative_name} (ratio: {alt.conversion_ratio})
															{alt.notes && <span className="text-muted"> - {alt.notes}</span>}
														</div>
														<button
															onClick={() => handleDeleteAlternative(ing.id, alt.id)}
															className="text-red hover:underline"
														>
															Delete
														</button>
													</div>
												))}
											</div>
										)}
									</div>
								)}
							</div>
						))}
					</div>
				)}
			</main>
		</div>
	);
}
