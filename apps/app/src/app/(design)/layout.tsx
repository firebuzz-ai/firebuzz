"use client";
import { buttonVariants } from "@firebuzz/ui/components/ui/button";
import { ChevronRight, Home } from "@firebuzz/ui/icons/lucide";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DesignLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const pathname = usePathname();
	const path = pathname.split("/").pop();
	return (
		<div className="flex flex-col flex-1">
			{/* Breadcrumb */}
			<div className="flex items-center gap-2 px-4 py-2 border-b">
				<Link
					className={buttonVariants({
						variant: "ghost",
						className: "!h-8 !p-1.5",
					})}
					href="/"
				>
					<Home className="size-4" />
				</Link>
				<ChevronRight className="size-4" />
				<Link
					className={buttonVariants({
						variant: "ghost",
						className: "!h-8 !p-1.5",
					})}
					href="/components"
				>
					Components
				</Link>
				<ChevronRight className="size-4" />
				<p className="text-sm text-muted-foreground capitalize">{path}</p>
			</div>
			{/* Content */}
			<div className="flex flex-col flex-1 px-5 py-4">{children}</div>
		</div>
	);
}
