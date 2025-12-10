import Link from "next/link";

type NavItem = {
	href: string;
	label: string;
	isActive?: boolean;
};

export function Navigation({ activePath }: { activePath?: string }) {
	const navItems: NavItem[] = [
		{ href: "/inventory", label: "Inventory" },
		{ href: "/recipes", label: "Recipes" },
		{ href: "/ingredients", label: "Ingredients" },
		{ href: "/discover", label: "Discover" },
		{ href: "/grocery", label: "Grocery Lists" },
		{ href: "/settings", label: "Settings" },
	];

	return (
		<nav className="border-b border-border bg-muted-bg/50">
			<div className="mx-auto max-w-6xl px-4 py-3">
				<div className="flex items-center justify-between">
					<Link href="/" className="text-xl font-semibold text-foreground hover:text-accent">
						Grocery
					</Link>
					<div className="flex gap-4 text-sm">
						{navItems.map((item) => (
							<Link
								key={item.href}
								href={item.href}
								className={activePath === item.href ? "text-accent font-medium" : "text-foreground hover:text-accent"}
							>
								{item.label}
							</Link>
						))}
					</div>
				</div>
			</div>
		</nav>
	);
}

