"use client";

import { Button } from "@firebuzz/ui/components/ui/button";
import { Label } from "@firebuzz/ui/components/ui/label";
import { Globe, Shield } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";

const EU_COUNTRY_OPTIONS = [
	{
		value: "true",
		label: "EU Visitors",
		description: "Target visitors from EU countries",
		icon: Shield,
	},
	{
		value: "false",
		label: "Non-EU Visitors",
		description: "Target visitors outside the EU",
		icon: Globe,
	},
];

interface EUCountrySelectorProps {
	label?: string;
	value: string;
	onChange: (value: string) => void;
	description?: string;
	required?: boolean;
}

export const EUCountrySelector = ({
	label,
	value,
	onChange,
	description,
	required = false,
}: EUCountrySelectorProps) => {
	const handleToggle = (euStatus: string) => {
		onChange(euStatus);
	};

	return (
		<div className="space-y-3">
			{label && (
				<Label
					className={cn(
						required && "after:content-['*'] after:ml-0.5 after:text-red-500",
					)}
				>
					{label}
				</Label>
			)}

			{/* EU Status Cards */}
			<div className="grid grid-cols-1 gap-3">
				{EU_COUNTRY_OPTIONS.map((option) => {
					const isSelected = value === option.value;
					const Icon = option.icon;

					return (
						<Button
							key={option.value}
							type="button"
							variant="outline"
							onClick={() => handleToggle(option.value)}
							className={cn(
								"justify-start p-4 h-auto transition-all duration-100 ease-in-out",
								isSelected
									? "border shadow-sm border-brand bg-brand/5 text-brand hover:text-brand"
									: "hover:bg-muted/50 border-border",
							)}
						>
							<div className="flex gap-4 items-center w-full">
								<div
									className={cn(
										"p-2 rounded-lg border transition-colors",
										isSelected
											? "bg-brand/10 text-brand border-brand"
											: "bg-muted",
									)}
								>
									<Icon className="w-5 h-5" />
								</div>
								<div className="flex-1 text-left">
									<div className={cn("text-sm font-medium transition-colors")}>
										{option.label}
									</div>
									<div
										className={cn(
											"text-xs text-muted-foreground mt-0.5 transition-colors duration-100 ease-in-out",
											isSelected ? "text-brand/70" : "text-muted-foreground",
										)}
									>
										{option.description}
									</div>
								</div>
							</div>
						</Button>
					);
				})}
			</div>

			{description && (
				<p className="text-sm text-muted-foreground">{description}</p>
			)}
		</div>
	);
};
