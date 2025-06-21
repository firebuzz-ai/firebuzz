import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import { motion } from "motion/react";

interface EmptyStateProps {
	icon: React.ReactNode;
	title: string;
	description: string;
	buttonTitle: string;
	buttonShortcut: string;
	onClick: () => void;
}

export const EmptyState = ({
	title,
	description,
	buttonTitle,
	buttonShortcut,
	onClick,
	icon,
}: EmptyStateProps) => {
	return (
		<div className="relative flex flex-col items-center justify-center flex-1 w-full h-full">
			<div className="relative z-10 flex flex-col items-center justify-center px-4 py-8 border rounded-md bg-muted/50">
				{/* Border Trail Animation */}
				<div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]">
					<motion.div
						className="absolute rounded-full aspect-square bg-brand opacity-80"
						style={{
							offsetPath: "rect(0 auto auto 0 round 6px)",
						}}
						animate={{
							offsetDistance: ["0%", "100%"],
							width: [64, 32, 32, 64, 32, 32, 64],
							height: [64, 32, 32, 64, 32, 32, 64],
						}}
						transition={{
							repeat: Number.POSITIVE_INFINITY,
							duration: 6,
							ease: "linear",
							times: [0, 0.25, 0.375, 0.5, 0.75, 0.875, 1],
						}}
					/>

					{/* Glow effect */}
					<motion.div
						className="absolute rounded-full aspect-square bg-brand opacity-70 blur-md"
						style={{
							offsetPath: "rect(0 auto auto 0 round 6px)",
						}}
						animate={{
							offsetDistance: ["0%", "100%"],
							width: [80, 48, 48, 80, 48, 48, 80],
							height: [80, 48, 48, 80, 48, 48, 80],
						}}
						transition={{
							repeat: Number.POSITIVE_INFINITY,
							duration: 6,
							ease: "linear",
							times: [0, 0.25, 0.375, 0.5, 0.75, 0.875, 1],
						}}
					/>
				</div>

				{/* Content */}
				<div className="relative z-20 flex flex-col items-center justify-center">
					<div className="flex items-center justify-center border rounded-md size-12 text-muted-foreground bg-background-subtle/50">
						{icon}
					</div>
					<div className="flex flex-col items-center justify-center max-w-sm mx-auto mt-3 text-center">
						<h1 className="text-xl font-bold">{title}</h1>
						<p className="text-sm text-muted-foreground">{description}</p>
					</div>
					<Button variant="outline" className="mt-5" onClick={onClick}>
						{buttonTitle} <ButtonShortcut>{buttonShortcut}</ButtonShortcut>
					</Button>
				</div>
			</div>
		</div>
	);
};
