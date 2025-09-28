"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

export interface IntervalToggleProps {
	value?: "monthly" | "yearly";
	onChange?: (value: "monthly" | "yearly") => void;
	className?: string;
}

export const IntervalToggle = ({
	value,
	onChange,
	className,
}: IntervalToggleProps) => {
	const [internalValue, setInternalValue] = useState<"monthly" | "yearly">(
		"monthly",
	);
	const [dimensions, setDimensions] = useState({
		monthlyWidth: 0,
		yearlyWidth: 0,
		monthlyX: 0,
		yearlyX: 0,
	});

	const monthlyRef = useRef<HTMLButtonElement>(null);
	const yearlyRef = useRef<HTMLButtonElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	const isYearly = (value ?? internalValue) === "yearly";

	useEffect(() => {
		const calculateDimensions = () => {
			if (monthlyRef.current && yearlyRef.current && containerRef.current) {
				const containerRect = containerRef.current.getBoundingClientRect();
				const monthlyRect = monthlyRef.current.getBoundingClientRect();
				const yearlyRect = yearlyRef.current.getBoundingClientRect();

				setDimensions({
					monthlyWidth: monthlyRect.width,
					yearlyWidth: yearlyRect.width,
					monthlyX: monthlyRect.left - containerRect.left,
					yearlyX: yearlyRect.left - containerRect.left,
				});
			}
		};

		calculateDimensions();
		window.addEventListener("resize", calculateDimensions);
		return () => window.removeEventListener("resize", calculateDimensions);
	}, []);

	const handleToggle = (newValue: "monthly" | "yearly") => {
		if (onChange) {
			onChange(newValue);
		} else {
			setInternalValue(newValue);
		}
	};

	return (
		<div
			className={`flex justify-center items-center w-full px-2 ${className || ""}`}
		>
			<div
				ref={containerRef}
				className="flex relative gap-1 items-center py-2 w-full"
			>
				<motion.div
					className="absolute inset-y-3 rounded-lg shadow-sm bg-primary"
					initial={false}
					animate={{
						x: isYearly ? dimensions.yearlyX : dimensions.monthlyX,
						width: isYearly ? dimensions.yearlyWidth : dimensions.monthlyWidth,
					}}
					transition={{
						type: "spring",
						stiffness: 300,
						damping: 30,
					}}
				/>
				<button
					ref={monthlyRef}
					type="button"
					onClick={() => handleToggle("monthly")}
					className={`relative z-10 px-3 py-2 rounded-2xl flex-1 text-sm font-medium transition-all duration-100 ease-out ${
						!isYearly
							? "text-primary-foreground"
							: "opacity-50 hover:opacity-100"
					}`}
				>
					Monthly
				</button>
				<button
					ref={yearlyRef}
					type="button"
					onClick={() => handleToggle("yearly")}
					className={`relative z-10 px-3 py-2 flex-1 group rounded-2xl text-nowrap text-sm font-medium transition-all duration-100 ease-out flex items-center gap-2 ${
						isYearly
							? "text-primary-foreground"
							: "opacity-50 hover:opacity-100"
					}`}
				>
					Yearly
					<motion.span
						className="bg-brand px-2 py-0.5 rounded-lg text-xs group-hover:text-brand-foreground"
						initial={{ scale: 0.8, opacity: 0.8 }}
						animate={{ scale: 1, opacity: 1 }}
						transition={{ delay: 0.1 }}
					>
						Save a Month
					</motion.span>
				</button>
			</div>
		</div>
	);
};
