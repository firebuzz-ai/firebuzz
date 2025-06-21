"use client";

import { cn } from "@firebuzz/ui/lib/utils";
import { motion } from "motion/react";

export const Indicators = ({
	step,
	totalSteps,
}: {
	step: number;
	totalSteps: number;
}) => {
	return (
		<div className="relative flex items-center gap-2 px-10">
			<div className="relative flex items-center gap-6">
				{Array.from({ length: totalSteps }, (_, i) => i + 1).map((dot) => (
					<div
						key={dot}
						className={cn(
							"size-2 rounded-full relative z-10",
							dot <= step ? "bg-brand-foreground" : "bg-border",
						)}
					/>
				))}

				{/*  Progress overlay */}
				<motion.div
					initial={{ width: "12px", height: "16px", x: 0 }}
					animate={{
						width:
							step === 1
								? "24px"
								: step === 2
									? "56px"
									: step === 3
										? "88px"
										: step === 4
											? "120px"
											: "152px",
						x: 0,
					}}
					className="absolute -left-[8px] -top-[4px] -translate-y-1/2 h-3 bg-brand rounded-lg"
					transition={{
						type: "spring",
						stiffness: 300,
						damping: 20,
						mass: 0.8,
						bounce: 0.25,
						duration: 0.6,
					}}
				/>
			</div>
		</div>
	);
};
