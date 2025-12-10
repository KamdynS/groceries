"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type GroceryList = {
	id: string;
	user_id: string;
	created_at: string;
	completed: boolean;
	week_starting: string | null;
};

type GroceryListItem = {
	id: string;
	grocery_list_id: string;
	ingredient_name: string;
	quantity: number;
	unit: string;
	purchased: boolean;
};

export default function GroceryPage() {
	const router = useRouter();
	const [lists, setLists] = useState<GroceryList[]>([]);
	const [selectedList, setSelectedList] = useState<string | null>(null);
	const [listItems, setListItems] = useState<GroceryListItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [recipes, setRecipes] = useState<Array<{ id: string; name: string }>>([]);
	const [selectedRecipes, setSelectedRecipes] = useState<Set<string>>(new Set());
	const [showCreateForm, setShowCreateForm] = useState(false);

	useEffect(() => {
		loadLists();
		loadRecipes();
	}, []);

	async function loadLists() {
		try {
			const res = await fetch("/api/grocery-lists");
			if (res.ok) {
				const data = await res.json();
				setLists(data.lists || []);
			}
		} catch (err) {
			console.error("Failed to load lists", err);
		} finally {
			setLoading(false);
		}
	}

	async function loadRecipes() {
		try {
			const res = await fetch("/api/recipes");
			if (res.ok) {
				const data = await res.json();
				setRecipes(data.recipes || []);
			}
		} catch (err) {
			console.error("Failed to load recipes", err);
		}
	}

	async function loadListItems(listId: string) {
		try {
			const res = await fetch(`/api/grocery-lists/${listId}`);
			if (res.ok) {
				const data = await res.json();
				setListItems(data.items || []);
			}
		} catch (err) {
			console.error("Failed to load list items", err);
		}
	}

	async function handleCreateList() {
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
				const data = await res.json();
				setShowCreateForm(false);
				setSelectedRecipes(new Set());
				await loadLists();
				setSelectedList(data.list.id);
				await loadListItems(data.list.id);
			} else {
				const data = await res.json();
				alert(`Error: ${data.error || "Failed to create list"}`);
			}
		} catch (err) {
			alert("Failed to create list");
		}
	}

	async function handleTogglePurchased(itemId: string, purchased: boolean) {
		try {
			// Note: This assumes there's an API route for updating items
			// If not, we'll need to create it
			const res = await fetch(`/api/grocery-lists/items/${itemId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ purchased }),
			});
			if (res.ok) {
				await loadListItems(selectedList!);
			}
		} catch (err) {
			// Silently fail - might not have this route yet
			console.error("Failed to update item", err);
		}
	}

	async function handleToggleCompleted(listId: string, completed: boolean) {
		try {
			const res = await fetch(`/api/grocery-lists/${listId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ completed }),
			});
			if (res.ok) {
				await loadLists();
				if (selectedList === listId) {
					await loadListItems(listId);
				}
			}
		} catch (err) {
			alert("Failed to update list");
		}
	}

	async function handleDeleteList(listId: string) {
		if (!confirm("Delete this grocery list?")) return;
		try {
			const res = await fetch(`/api/grocery-lists/${listId}`, { method: "DELETE" });
			if (res.ok) {
				await loadLists();
				if (selectedList === listId) {
					setSelectedList(null);
					setListItems([]);
				}
			} else {
				const data = await res.json();
				alert(`Error: ${data.error || "Failed to delete list"}`);
			}
		} catch (err) {
			alert("Failed to delete list");
		}
	}

	if (loading) {
		return (
			<div className="min-h-screen bg-background p-6">
				<div className="text-foreground">Loading...</div>
			</div>
		);
	}

	const selectedListData = lists.find((l) => l.id === selectedList);

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
							<Link href="/grocery" className="text-accent font-medium">
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
					<h1 className="text-2xl font-semibold text-foreground">Grocery Lists</h1>
					<button
						onClick={() => setShowCreateForm(!showCreateForm)}
						className="rounded bg-accent px-4 py-2 text-background hover:bg-accent/90"
					>
						{showCreateForm ? "Cancel" : "New List"}
					</button>
				</div>

				{showCreateForm && (
					<div className="mb-6 rounded-lg border border-border bg-muted-bg p-4">
						<h2 className="mb-3 text-lg font-medium text-foreground">Select Recipes</h2>
						<div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
							{recipes.map((recipe) => (
								<label key={recipe.id} className="flex items-center gap-2 rounded border border-border bg-background p-2">
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
									<span className="text-sm text-foreground">{recipe.name}</span>
								</label>
							))}
						</div>
						<button
							onClick={handleCreateList}
							disabled={selectedRecipes.size === 0}
							className="rounded bg-accent px-4 py-2 text-background hover:bg-accent/90 disabled:opacity-50"
						>
							Generate List
						</button>
					</div>
				)}

				<div className="grid gap-4 lg:grid-cols-2">
					<div>
						<h2 className="mb-3 text-lg font-medium text-foreground">Lists</h2>
						{lists.length === 0 ? (
							<div className="rounded-lg border border-border bg-muted-bg p-4 text-muted">
								No grocery lists yet. Create one to get started.
							</div>
						) : (
							<div className="space-y-2">
								{lists.map((list) => (
									<div
										key={list.id}
										className={`rounded-lg border p-4 transition-colors ${
											selectedList === list.id
												? "border-accent bg-muted-bg"
												: "border-border bg-muted-bg hover:border-accent"
										}`}
									>
										<div className="flex items-start justify-between">
											<button
												onClick={() => {
													setSelectedList(list.id);
													loadListItems(list.id);
												}}
												className="flex-1 text-left"
											>
												<div className="font-medium text-foreground">
													{new Date(list.created_at).toLocaleDateString()}
												</div>
												{list.week_starting && (
													<div className="text-sm text-muted">
														Week of {new Date(list.week_starting).toLocaleDateString()}
													</div>
												)}
												<div className="mt-1 text-sm text-muted">
													{list.completed ? "Completed" : "Active"}
												</div>
											</button>
											<div className="flex gap-2">
												<button
													onClick={() => handleToggleCompleted(list.id, !list.completed)}
													className="text-sm text-blue hover:underline"
												>
													{list.completed ? "Mark Active" : "Mark Complete"}
												</button>
												<button
													onClick={() => handleDeleteList(list.id)}
													className="text-sm text-red hover:underline"
												>
													Delete
												</button>
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</div>

					{selectedListData && (
						<div>
							<h2 className="mb-3 text-lg font-medium text-foreground">Items</h2>
							{listItems.length === 0 ? (
								<div className="rounded-lg border border-border bg-muted-bg p-4 text-muted">
									This list is empty.
								</div>
							) : (
								<div className="space-y-2">
									{listItems.map((item) => (
										<label
											key={item.id}
											className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
												item.purchased
													? "border-border bg-muted-bg opacity-60"
													: "border-border bg-muted-bg"
											}`}
										>
											<input
												type="checkbox"
												checked={item.purchased}
												onChange={(e) => handleTogglePurchased(item.id, e.target.checked)}
												className="h-4 w-4"
											/>
											<div className="flex-1 text-sm text-foreground">
												{item.quantity} {item.unit} {item.ingredient_name}
											</div>
										</label>
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
