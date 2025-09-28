"use client";
import { DotScreenShader } from "@/components/landing/animated-grid";
import { Badge } from "@firebuzz/ui/components/ui/badge";

export const Hero = () => {
	return (
		<div className="relative py-10 border-b">
			<DotScreenShader />
			{/* Content */}
			<div className="flex flex-col justify-center items-center px-8 mx-auto max-w-6xl text-center">
				<Badge
					variant="outline"
					className="relative z-10 text-muted-foreground py-1.5 gap-1 bg-muted"
				>
					<div className="w-2 h-2 rounded-full animate-pulse bg-brand" />
					Why We Built Firebuzz?
				</Badge>
				<div className="relative z-10 mt-6 space-y-2 max-w-xl">
					<h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
						Find the perfect plan for you and your team
					</h1>
					<p className="mx-auto max-w-md text-muted-foreground">
						We offer competitive rates with no hidden fees, ensuring you get the
						best deal for your business.
					</p>
				</div>
			</div>
		</div>
	);
};
