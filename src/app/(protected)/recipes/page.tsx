import { requireUser } from "@/lib/supabase/server";
import { Navigation } from "@/components/Navigation";
import { RecipesClient } from "./components/RecipesClient";

export default async function RecipesPage() {
	const { supabase } = await requireUser();
	const { data, error } = await supabase.from("recipes").select("*").order("created_at", { ascending: false });

	const recipes = data ?? [];

	return (
		<div className="min-h-screen bg-background">
			<Navigation activePath="/recipes" />
			<main className="mx-auto max-w-6xl p-6">
				<RecipesClient initialRecipes={recipes} />
			</main>
		</div>
	);
}
