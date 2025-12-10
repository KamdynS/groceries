import { requireUser } from "@/lib/supabase/server";
import { Navigation } from "@/components/Navigation";
import { GroceryListsClient } from "./components/GroceryListsClient";

export default async function GroceryPage() {
	const { supabase, user } = await requireUser();

	const [listsResult, recipesResult] = await Promise.all([
		supabase
			.from("grocery_lists")
			.select("*")
			.eq("user_id", user.id)
			.order("created_at", { ascending: false }),
		supabase.from("recipes").select("id, name").order("created_at", { ascending: false }),
	]);

	const lists = listsResult.data ?? [];
	const recipes = recipesResult.data ?? [];

	return (
		<div className="min-h-screen bg-background">
			<Navigation activePath="/grocery" />
			<main className="mx-auto max-w-6xl p-6">
				<GroceryListsClient initialLists={lists} initialRecipes={recipes} />
			</main>
		</div>
	);
}
