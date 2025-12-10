import { requireUser } from "@/lib/supabase/server";
import { Navigation } from "@/components/Navigation";
import { InventoryClient } from "./components/InventoryClient";

export default async function InventoryPage() {
	const { supabase, user } = await requireUser();
	const { data, error } = await supabase
		.from("ingredients")
		.select("*")
		.eq("user_id", user.id)
		.order("name", { ascending: true });

	const items = data ?? [];

	return (
		<div className="min-h-screen bg-background">
			<Navigation activePath="/inventory" />
			<main className="mx-auto max-w-6xl p-6">
				<InventoryClient initialItems={items} />
			</main>
		</div>
	);
}
