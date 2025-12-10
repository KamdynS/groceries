"use client";

import { useState, useEffect } from "react";
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

type Recipe = {
	id: string;
	name: string;
};

export function GroceryListsClient({
	initialLists,
	initialRecipes,
}: {
	initialLists: GroceryList[];
	initialRecipes: Recipe[];
}) {
	const router = useRouter();
	const [lists, setLists] = useState<GroceryList[]>(initialLists);
	const [selectedList, setSelectedList] = useState<string | null>(null);
	const [listItems, setListItems] = useState<GroceryListItem[]>([]);
	const [recipes] = useState<Recipe[]>(initialRecipes);
	const [selectedRecipes, setSelectedRecipes] = useState<Set<string>>(new Set());
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [loadingItems, setLoadingItems] = useState(false);

	useEffect(() => {
		setLists(initialLists);
	}, [initialLists]);

	async function loadListItems(listId: string) {
		setLoadingItems(true);
		try {
			const res = await fetch(`/api/grocery-lists/${listId}`);
			if (res.ok) {
				const data = await res.json();
				setListItems(data.items || []);
			}
		} catch (err) {
			console.error("Failed to load list items", err);
		} finally {
			setLoadingItems(false);
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
				router.refresh();
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
			const res = await fetch(`/api/grocery-lists/items/${itemId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ purchased }),
			});
			if (res.ok) {
				await loadListItems(selectedList!);
			}
		} catch (err) {
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
				router.refresh();
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
				router.refresh();
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

	const selectedListData = lists.find((l) => l.id === selectedList);

	return (
		<>
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
						{loadingItems ? (
							<div className="rounded-lg border border-border bg-muted-bg p-4 text-muted">Loading...</div>
						) : listItems.length === 0 ? (
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
		</>
	);
}

