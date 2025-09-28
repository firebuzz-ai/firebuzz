import { Badge } from "@firebuzz/ui/components/ui/badge";
import Image from "next/image";
import { FeaturedTabsEditor } from "../feature-tabs-editor";

export const Editor = () => {
	return (
		<div className="py-10 border-b">
			<div className="px-8 mx-auto max-w-6xl">
				{/* Image */}
				<div className="overflow-hidden relative z-10 bg-gradient-to-b to-transparent rounded-tl-xl via-brand/10 from-brand">
					<div
						className="absolute inset-0 z-10"
						style={{
							background:
								"radial-gradient(circle at center, transparent 8%, hsl(var(--background) / 0.3) 35%, hsl(var(--background) / 0.8) 100%)",
						}}
					/>
					<div className="pt-2 pl-2 w-full h-full md:pt-3 md:pl-3">
						<Image
							src="/landing/hero-dark.png"
							alt="Firebuzz"
							priority
							quality={100}
							width={1200}
							height={628}
							className="object-cover rounded-tl-xl rounded-br-xl"
						/>
					</div>
				</div>
				{/* Content */}
				<div className="mt-10">
					<Badge
						variant="outline"
						className="mb-4 bg-muted py-1.5 px-4 text-brand"
					>
						Editor
					</Badge>
					<h2 className="text-3xl font-bold">
						Need a Designer? That's old news.
					</h2>
					<p className="mt-1 max-w-2xl text-muted-foreground">
						Just explain your idea with your own words and Firebuzz will do the
						rest. Do you have an example? Just share a screenshot and consider
						it done.
					</p>
				</div>
				{/* Features */}
				<FeaturedTabsEditor />
			</div>
		</div>
	);
};
