"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { UNITS } from "@/lib/units";

type IngredientAlternative = {
	id: string;
	ingredient_name: string;
	alternative_name: string;
	conversion_ratio: number;
	notes: string | null;
	created_at: string;
};

export default function IngredientsPage() {
	const [ingredients, setIngredients] = useState<string[]>([]);
	const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null);
	const [alternatives, setAlternatives] = useState<IngredientAlternative[]>([]);
	const [loading, setLoading] = useState(true);
	const [showAddForm, setShowAddForm] = useState(false);
	const [showAltForm, setShowAltForm] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [suggestions, setSuggestions] = useState<string[]>([]);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [altForm, setAltForm] = useState({
		alternative_name: "",
		conversion_ratio: "1.0",
		notes: "",
	});
	const [altSuggestions, setAltSuggestions] = useState<string[]>([]);
	const [showAltSuggestions, setShowAltSuggestions] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const altInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		loadIngredients();
	}, []);

	useEffect(() => {
		if (selectedIngredient) {
			loadAlternatives(selectedIngredient);
		} else {
			setAlternatives([]);
		}
	}, [selectedIngredient]);

	async function loadIngredients() {
		try {
			const res = await fetch("/api/ingredient-names");
			if (res.ok) {
				const data = await res.json();
				setIngredients(data.ingredients || []);
			}
		} catch (err) {
			console.error("Failed to load ingredients", err);
		} finally {
			setLoading(false);
		}
	}

	async function loadAlternatives(ingredientName: string) {
		try {
			const res = await fetch(`/api/ingredient-alternatives?ingredient_name=${encodeURIComponent(ingredientName)}`);
			if (res.ok) {
				const data = await res.json();
				setAlternatives(data.alternatives || []);
			}
		} catch (err) {
			console.error("Failed to load alternatives", err);
		}
	}

	async function searchIngredients(query: string) {
		if (!query.trim()) {
			setSuggestions([]);
			return;
		}
		try {
			const res = await fetch(`/api/ingredient-names?search=${encodeURIComponent(query)}`);
			if (res.ok) {
				const data = await res.json();
				setSuggestions(data.ingredients || []);
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
				setAltSuggestions(data.ingredients || []);
			}
		} catch (err) {
			console.error("Failed to search ingredients", err);
		}
	}

	async function handleCreateIngredient() {
		if (!searchQuery.trim()) {
			alert("Ingredient name required");
			return;
		}
		try {
			const res = await fetch("/api/ingredient-names", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: searchQuery.trim() }),
			});
			if (res.ok) {
				setSearchQuery("");
				setShowAddForm(false);
				await loadIngredients();
			} else {
				const data = await res.json();
				alert(`Error: ${data.error || "Failed to create ingredient"}`);
			}
		} catch (err) {
			alert("Failed to create ingredient");
		}
	}

	async function handleDeleteIngredient(name: string) {
		console.log("handleDeleteIngredient called with:", name);
		if (!confirm(`Delete ingredient "${name}"? This will also delete all its standard alternatives.`)) {
			console.log("User cancelled delete");
			return;
		}
		console.log("Making DELETE request for:", name);
		try {
			const url = `/api/ingredient-names/${encodeURIComponent(name)}`;
			console.log("DELETE URL:", url);
			const res = await fetch(url, { method: "DELETE" });
			console.log("Response status:", res.status);
			if (res.ok) {
				if (selectedIngredient === name) {
					setSelectedIngredient(null);
				}
				await loadIngredients();
			} else {
				const data = await res.json();
				console.error("Delete error:", data);
				alert(`Error: ${data.error || "Failed to delete ingredient"}`);
			}
		} catch (err) {
			console.error("Delete exception:", err);
			alert("Failed to delete ingredient");
		}
	}

	async function handleAddAlternative() {
		if (!selectedIngredient || !altForm.alternative_name.trim() || !altForm.conversion_ratio) {
			alert("Alternative name and conversion ratio required");
			return;
		}
		try {
			// Ensure alternative ingredient exists
			await fetch("/api/ingredient-names", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: altForm.alternative_name.trim() }),
			});

			const res = await fetch("/api/ingredient-alternatives", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					ingredient_name: selectedIngredient,
					alternative_name: altForm.alternative_name.trim(),
					conversion_ratio: parseFloat(altForm.conversion_ratio),
					notes: altForm.notes.trim() || null,
				}),
			});
			if (res.ok) {
				setAltForm({ alternative_name: "", conversion_ratio: "1.0", notes: "" });
				setShowAltForm(false);
				setShowAltSuggestions(false);
				await loadAlternatives(selectedIngredient);
			} else {
				const data = await res.json();
				alert(`Error: ${data.error || "Failed to add alternative"}`);
			}
		} catch (err) {
			alert("Failed to add alternative");
		}
	}

	async function handleDeleteAlternative(altId: string) {
		if (!confirm("Delete this standard alternative?")) return;
		try {
			const res = await fetch(`/api/ingredient-alternatives/${altId}`, { method: "DELETE" });
			if (res.ok) {
				await loadAlternatives(selectedIngredient!);
			} else {
				const data = await res.json();
				alert(`Error: ${data.error || "Failed to delete alternative"}`);
			}
		} catch (err) {
			alert("Failed to delete alternative");
		}
	}

	const filteredIngredients = ingredients.filter((ing) =>
		ing.toLowerCase().includes(searchQuery.toLowerCase())
	);

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
							<Link href="/ingredients" className="text-accent font-medium">
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
					<h1 className="text-2xl font-semibold text-foreground">Ingredients</h1>
					<button
						onClick={() => setShowAddForm(!showAddForm)}
						className="rounded bg-accent px-4 py-2 text-background hover:bg-accent/90"
					>
						{showAddForm ? "Cancel" : "Add Ingredient"}
					</button>
				</div>

				{showAddForm && (
					<div className="mb-6 rounded-lg border border-border bg-muted-bg p-4">
						<div className="relative">
							<input
								ref={inputRef}
								type="text"
								placeholder="Ingredient name"
								value={searchQuery}
								onChange={(e) => {
									setSearchQuery(e.target.value);
									searchIngredients(e.target.value);
									setShowSuggestions(true);
								}}
								onFocus={() => {
									if (searchQuery) {
										searchIngredients(searchQuery);
										setShowSuggestions(true);
									}
								}}
								onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
								className="w-full rounded border border-border bg-background px-3 py-2 text-foreground"
								onKeyDown={(e) => {
									if (e.key === "Enter" && searchQuery.trim()) {
										handleCreateIngredient();
									}
								}}
							/>
							{showSuggestions && suggestions.length > 0 && (
								<div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded border border-border bg-background shadow-lg">
									{suggestions.map((suggestion) => (
										<button
											key={suggestion}
											type="button"
											onClick={() => {
												setSearchQuery(suggestion);
												setShowSuggestions(false);
											}}
											className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted-bg"
										>
											{suggestion}
										</button>
									))}
								</div>
							)}
						</div>
						<button
							onClick={handleCreateIngredient}
							className="mt-3 rounded bg-accent px-4 py-2 text-background hover:bg-accent/90"
						>
							Create
						</button>
					</div>
				)}

				<div className="grid gap-6 lg:grid-cols-2">
					<div>
						<h2 className="mb-3 text-lg font-medium text-foreground">All Ingredients</h2>
						<div className="space-y-2">
							{filteredIngredients.length === 0 ? (
								<div className="rounded-lg border border-border bg-muted-bg p-4 text-muted">
									No ingredients found.
								</div>
							) : (
								filteredIngredients.map((ing) => (
									<div
										key={ing}
										className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
											selectedIngredient === ing
												? "border-accent bg-muted-bg"
												: "border-border bg-muted-bg hover:border-accent"
										}`}
									>
										<button
											type="button"
											onClick={() => setSelectedIngredient(selectedIngredient === ing ? null : ing)}
											className="flex-1 text-left font-medium text-foreground"
										>
											{ing}
										</button>
										<button
											type="button"
											onClick={(e) => {
												console.log("Delete button clicked for:", ing);
												e.preventDefault();
												e.stopPropagation();
												handleDeleteIngredient(ing);
											}}
											className="text-sm text-red hover:underline"
										>
											Delete
										</button>
									</div>
								))
							)}
						</div>
					</div>

					{selectedIngredient && (
						<div>
							<h2 className="mb-3 text-lg font-medium text-foreground">
								Standard Alternatives for "{selectedIngredient}"
							</h2>
							<p className="mb-3 text-sm text-muted">
								These alternatives will automatically be available when this ingredient is used in recipes.
							</p>

							<button
								onClick={() => setShowAltForm(!showAltForm)}
								className="mb-4 rounded bg-accent px-3 py-1 text-sm text-background hover:bg-accent/90"
							>
								{showAltForm ? "Cancel" : "Add Alternative"}
							</button>

							{showAltForm && (
								<div className="mb-4 rounded-lg border border-border bg-muted-bg p-4">
									<div className="space-y-3">
										<div className="relative">
											<input
												ref={altInputRef}
												type="text"
												placeholder="Alternative ingredient name"
												value={altForm.alternative_name}
												onChange={(e) => {
													setAltForm({ ...altForm, alternative_name: e.target.value });
													searchAltIngredients(e.target.value);
													setShowAltSuggestions(true);
												}}
												onFocus={() => {
													if (altForm.alternative_name) {
														searchAltIngredients(altForm.alternative_name);
														setShowAltSuggestions(true);
													}
												}}
												onBlur={() => setTimeout(() => setShowAltSuggestions(false), 200)}
												className="w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground"
											/>
											{showAltSuggestions && altSuggestions.length > 0 && (
												<div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded border border-border bg-background shadow-lg">
													{altSuggestions.map((suggestion) => (
														<button
															key={suggestion}
															type="button"
															onClick={() => {
																setAltForm({ ...altForm, alternative_name: suggestion });
																setShowAltSuggestions(false);
															}}
															className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted-bg"
														>
															{suggestion}
														</button>
													))}
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
												className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground"
											/>
											<input
												type="text"
												placeholder="Notes (optional)"
												value={altForm.notes}
												onChange={(e) => setAltForm({ ...altForm, notes: e.target.value })}
												className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground"
											/>
										</div>
										<button
											onClick={handleAddAlternative}
											className="rounded bg-accent px-4 py-2 text-sm text-background hover:bg-accent/90"
										>
											Add
										</button>
									</div>
								</div>
							)}

							{alternatives.length === 0 ? (
								<div className="rounded-lg border border-border bg-muted-bg p-4 text-muted">
									No standard alternatives defined yet.
								</div>
							) : (
								<div className="space-y-2">
									{alternatives.map((alt) => (
										<div
											key={alt.id}
											className="flex items-center justify-between rounded-lg border border-border bg-muted-bg p-3"
										>
											<div>
												<div className="font-medium text-foreground">{alt.alternative_name}</div>
												<div className="text-sm text-muted">
													Ratio: {alt.conversion_ratio}
													{alt.notes && ` - ${alt.notes}`}
												</div>
											</div>
											<button
												onClick={() => handleDeleteAlternative(alt.id)}
												className="text-sm text-red hover:underline"
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
			</main>
		</div>
	);
}

