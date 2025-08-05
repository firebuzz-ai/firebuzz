"use client";

import { Button } from "@firebuzz/ui/components/ui/button";
import { Label } from "@firebuzz/ui/components/ui/label";
import { UserCheck, UserPlus, Users } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";

const VISITOR_TYPES = [
	{
		value: "all",
		label: "All Visitors",
		description: "Both new and returning visitors",
		icon: Users,
	},
	{
		value: "new",
		label: "New Visitors",
		description: "First-time visitors to your site",
		icon: UserPlus,
	},
	{
		value: "returning",
		label: "Returning Visitors",
		description: "Visitors who have been here before",
		icon: UserCheck,
	},
];

interface VisitorTypeSelectorProps {
	label?: string;
	value: string;
	onChange: (value: string) => void;
	description?: string;
	required?: boolean;
}

export const VisitorTypeSelector = ({
	label,
	value,
	onChange,
	description,
	required = false,
}: VisitorTypeSelectorProps) => {
	const handleToggle = (visitorType: string) => {
		onChange(visitorType);
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

			{/* Visitor Type Cards */}
			<div className="grid grid-cols-1 gap-3">
				{VISITOR_TYPES.map((visitorType) => {
					const isSelected = value === visitorType.value;
					const Icon = visitorType.icon;

					return (
						<Button
							key={visitorType.value}
							type="button"
							variant="outline"
							onClick={() => handleToggle(visitorType.value)}
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
										{visitorType.label}
									</div>
									<div
										className={cn(
											"text-xs text-muted-foreground mt-0.5 transition-colors duration-100 ease-in-out",
											isSelected ? "text-brand/70" : "text-muted-foreground",
										)}
									>
										{visitorType.description}
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
