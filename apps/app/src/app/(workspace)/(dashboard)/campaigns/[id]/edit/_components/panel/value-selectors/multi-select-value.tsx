"use client";

import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Checkbox } from "@firebuzz/ui/components/ui/checkbox";
import { Input } from "@firebuzz/ui/components/ui/input";
import { Label } from "@firebuzz/ui/components/ui/label";
import { ScrollArea } from "@firebuzz/ui/components/ui/scroll-area";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { Search, X } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import { useMemo, useState } from "react";
import type { SingleSelectOption } from "./single-select-value";

interface MultiSelectValueProps {
	label?: string;
	values: string[];
	onChange: (values: string[]) => void;
	options: SingleSelectOption[];
	placeholder?: string;
	description?: string;
	required?: boolean;
	maxHeight?: number;
}

export const MultiSelectValue = ({
	label,
	values,
	onChange,
	options,
	placeholder = "Select options",
	description,
	required = false,
	maxHeight = 300,
}: MultiSelectValueProps) => {
	const [searchTerm, setSearchTerm] = useState("");

	// Filter options based on search term
	const filteredOptions = useMemo(() => {
		if (!searchTerm) return options;

		return options.filter(
			(option) =>
				option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
				option.value.toLowerCase().includes(searchTerm.toLowerCase()),
		);
	}, [options, searchTerm]);

	const handleToggle = (value: string) => {
		const newValues = values.includes(value)
			? values.filter((v) => v !== value)
			: [...values, value];
		onChange(newValues);
	};

	const handleRemove = (value: string) => {
		onChange(values.filter((v) => v !== value));
	};

	const handleClearAll = () => {
		onChange([]);
	};

	const selectedOptions = options.filter((opt) => values.includes(opt.value));

	return (
		<div className="space-y-3">
			{label && (
				<Label>
					{label}
					{required && <span className="ml-1 text-destructive">*</span>}
				</Label>
			)}

			{/* Selected values as badges */}
			{selectedOptions.length > 0 && (
				<div className="flex relative flex-wrap gap-1 p-3 rounded-md border bg-muted/30">
					{selectedOptions.map((option) => (
						<Badge key={option.value} variant="outline" className="gap-1 pr-1">
							{option.icon && (
								<div className="flex-shrink-0 size-3">{option.icon}</div>
							)}
							<span className="text-xs">{option.label}</span>
							<button
								type="button"
								onClick={() => handleRemove(option.value)}
								className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
							>
								<X className="size-3" />
							</button>
						</Badge>
					))}
					{/* Clear all button */}
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="iconXs"
								className="absolute top-2 right-2"
								onClick={handleClearAll}
								disabled={values.length === 0}
							>
								<X className="size-3" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Clear all</TooltipContent>
					</Tooltip>
				</div>
			)}

			{/* Search and actions */}
			<div className="space-y-2">
				<div className="relative">
					<Search className="absolute left-3 top-2.5 size-3 text-muted-foreground" />
					<Input
						placeholder="Search options..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="pl-9 h-8"
						type="search"
					/>
				</div>
			</div>

			{/* Options list */}
			<div className="rounded-md border">
				<ScrollArea style={{ height: maxHeight }} className="w-full">
					<div className="p-2 space-y-1">
						{filteredOptions.length === 0 ? (
							<div className="py-8 text-center">
								<p className="text-sm text-muted-foreground">
									{searchTerm ? "No options found" : placeholder}
								</p>
							</div>
						) : (
							filteredOptions.map((option) => {
								const isSelected = values.includes(option.value);
								return (
									<div
										key={option.value}
										className={cn(
											"flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
											"hover:bg-muted",
											isSelected &&
												"bg-brand/5 hover:bg-brand/10 border border-brand",
										)}
										onClick={() => handleToggle(option.value)}
									>
										<Checkbox
											checked={isSelected}
											onCheckedChange={() => handleToggle(option.value)}
										/>
										<div className="flex-1">
											<div className="flex gap-2 items-center">
												{option.icon && (
													<div className="flex flex-shrink-0 justify-center items-center p-1 rounded-md border size-6 bg-muted">
														{option.icon}
													</div>
												)}
												<span className="text-sm font-medium">
													{option.label}
												</span>
											</div>
											{option.description && (
												<p className="text-xs text-muted-foreground">
													{option.description}
												</p>
											)}
										</div>
									</div>
								);
							})
						)}
					</div>
				</ScrollArea>
			</div>

			{description && (
				<p className="text-sm text-muted-foreground">{description}</p>
			)}
		</div>
	);
};
