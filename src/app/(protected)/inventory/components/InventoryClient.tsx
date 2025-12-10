"use client";

import { useState, useEffect } from "react";

type InventoryItem = {
	id: string;
	name: string;
	quantity: number;
	unit: string;
	created_at: string;
	updated_at: string;
};

export function InventoryClient({ initialItems }: { initialItems: InventoryItem[] }) {
	const [items, setItems] = useState<InventoryItem[]>(initialItems);
	const [editing, setEditing] = useState<string | null>(null);
	const [showAddForm, setShowAddForm] = useState(false);
	const [formData, setFormData] = useState({ name: "", quantity: "", unit: "" });

	useEffect(() => {
		setItems(initialItems);
	}, [initialItems]);

	async function handleAdd() {
		if (!formData.name || !formData.quantity || !formData.unit) {
			alert("All fields required");
			return;
		}
		try {
			const res = await fetch("/api/inventory", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: formData.name,
					quantity: parseFloat(formData.quantity),
					unit: formData.unit,
				}),
			});
			if (res.ok) {
				const data = await res.json();
				setItems([...items, data.item]);
				setFormData({ name: "", quantity: "", unit: "" });
				setShowAddForm(false);
			} else {
				const data = await res.json();
				alert(`Error: ${data.error || "Failed to add item"}`);
			}
		} catch (err) {
			alert("Failed to add item");
		}
	}

	async function handleUpdate(id: string, name: string, quantity: number, unit: string) {
		try {
			const res = await fetch(`/api/inventory/${id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name, quantity, unit }),
			});
			if (res.ok) {
				const data = await res.json();
				setItems(items.map((item) => (item.id === id ? data.item : item)));
				setEditing(null);
			} else {
				const data = await res.json();
				alert(`Error: ${data.error || "Failed to update item"}`);
			}
		} catch (err) {
			alert("Failed to update item");
		}
	}

	async function handleDelete(id: string) {
		if (!confirm("Delete this item?")) return;
		try {
			const res = await fetch(`/api/inventory/${id}`, { method: "DELETE" });
			if (res.ok) {
				setItems(items.filter((item) => item.id !== id));
			} else {
				const data = await res.json();
				alert(`Error: ${data.error || "Failed to delete item"}`);
			}
		} catch (err) {
			alert("Failed to delete item");
		}
	}

	return (
		<>
			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-2xl font-semibold text-foreground">Fridge Inventory</h1>
				<button
					onClick={() => setShowAddForm(!showAddForm)}
					className="rounded bg-accent px-4 py-2 text-background hover:bg-accent/90"
				>
					{showAddForm ? "Cancel" : "Add Item"}
				</button>
			</div>

			{showAddForm && (
				<div className="mb-6 rounded-lg border border-border bg-muted-bg p-4">
					<h2 className="mb-3 text-lg font-medium text-foreground">Add Item</h2>
					<div className="grid gap-3 sm:grid-cols-3">
						<input
							type="text"
							placeholder="Name"
							value={formData.name}
							onChange={(e) => setFormData({ ...formData, name: e.target.value })}
							className="rounded border border-border bg-background px-3 py-2 text-foreground"
						/>
						<input
							type="number"
							step="0.01"
							placeholder="Quantity"
							value={formData.quantity}
							onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
							className="rounded border border-border bg-background px-3 py-2 text-foreground"
						/>
						<input
							type="text"
							placeholder="Unit (oz, lb, cup, etc.)"
							value={formData.unit}
							onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
							className="rounded border border-border bg-background px-3 py-2 text-foreground"
						/>
					</div>
					<button
						onClick={handleAdd}
						className="mt-3 rounded bg-accent px-4 py-2 text-background hover:bg-accent/90"
					>
						Add
					</button>
				</div>
			)}

			{items.length === 0 ? (
				<div className="rounded-lg border border-border bg-muted-bg p-8 text-center text-muted">
					Your fridge is empty. Add items to get started.
				</div>
			) : (
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{items.map((item) => (
						<div key={item.id} className="rounded-lg border border-border bg-muted-bg p-4">
							{editing === item.id ? (
								<EditForm
									item={item}
									onSave={(name, quantity, unit) => handleUpdate(item.id, name, quantity, unit)}
									onCancel={() => setEditing(null)}
								/>
							) : (
								<>
									<div className="mb-2 flex items-start justify-between">
										<div>
											<h3 className="font-medium text-foreground">{item.name}</h3>
											<p className="text-sm text-muted">
												{item.quantity} {item.unit}
											</p>
										</div>
										<div className="flex gap-2">
											<button
												onClick={() => setEditing(item.id)}
												className="text-sm text-blue hover:underline"
											>
												Edit
											</button>
											<button
												onClick={() => handleDelete(item.id)}
												className="text-sm text-red hover:underline"
											>
												Delete
											</button>
										</div>
									</div>
								</>
							)}
						</div>
					))}
				</div>
			)}
		</>
	);
}

function EditForm({
	item,
	onSave,
	onCancel,
}: {
	item: InventoryItem;
	onSave: (name: string, quantity: number, unit: string) => void;
	onCancel: () => void;
}) {
	const [name, setName] = useState(item.name);
	const [quantity, setQuantity] = useState(item.quantity.toString());
	const [unit, setUnit] = useState(item.unit);

	return (
		<div className="space-y-2">
			<input
				type="text"
				value={name}
				onChange={(e) => setName(e.target.value)}
				className="w-full rounded border border-border bg-background px-2 py-1 text-sm text-foreground"
			/>
			<div className="grid grid-cols-2 gap-2">
				<input
					type="number"
					step="0.01"
					value={quantity}
					onChange={(e) => setQuantity(e.target.value)}
					className="rounded border border-border bg-background px-2 py-1 text-sm text-foreground"
				/>
				<input
					type="text"
					value={unit}
					onChange={(e) => setUnit(e.target.value)}
					className="rounded border border-border bg-background px-2 py-1 text-sm text-foreground"
				/>
			</div>
			<div className="flex gap-2">
				<button
					onClick={() => onSave(name, parseFloat(quantity) || 0, unit)}
					className="rounded bg-accent px-3 py-1 text-sm text-background hover:bg-accent/90"
				>
					Save
				</button>
				<button onClick={onCancel} className="rounded border border-border px-3 py-1 text-sm text-foreground hover:bg-muted-bg">
					Cancel
				</button>
			</div>
		</div>
	);
}

