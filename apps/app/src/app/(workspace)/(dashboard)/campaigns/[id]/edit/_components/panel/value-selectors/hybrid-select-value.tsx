"use client";

import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Input } from "@firebuzz/ui/components/ui/input";
import { Label } from "@firebuzz/ui/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@firebuzz/ui/components/ui/popover";
import { Plus, X } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import { useState } from "react";
import type { SingleSelectOption } from "./single-select-value";

interface HybridSelectValueProps {
	label?: string;
	value: string | string[];
	onChange: (value: string | string[]) => void;
	options: SingleSelectOption[];
	placeholder?: string;
	description?: string;
	required?: boolean;
	multiple?: boolean;
	customInputPlaceholder?: string;
	customInputLabel?: string;
	validateCustomInput?: (value: string) => { valid: boolean; error?: string };
}

export const HybridSelectValue = ({
	label,
	value,
	onChange,
	options,
	description,
	required = false,
	multiple = false,
	customInputPlaceholder = "Enter custom value",
	customInputLabel = "Custom Value",
	validateCustomInput,
}: HybridSelectValueProps) => {
	const [isCustomInputOpen, setIsCustomInputOpen] = useState(false);
	const [customInput, setCustomInput] = useState("");
	const [customInputError, setCustomInputError] = useState("");

	const values = multiple
		? Array.isArray(value)
			? value
			: [value].filter(Boolean)
		: [];
	const singleValue = !multiple && typeof value === "string" ? value : "";

	const handleSelect = (selectedValue: string) => {
		if (multiple) {
			const newValues = values.includes(selectedValue)
				? values.filter((v) => v !== selectedValue)
				: [...values, selectedValue];
			onChange(newValues);
		} else {
			onChange(selectedValue);
		}
	};

	const handleRemove = (valueToRemove: string) => {
		if (multiple) {
			onChange(values.filter((v) => v !== valueToRemove));
		} else {
			onChange("");
		}
	};

	const handleAddCustom = () => {
		if (!customInput.trim()) return;

		if (validateCustomInput) {
			const validation = validateCustomInput(customInput);
			if (!validation.valid) {
				setCustomInputError(validation.error || "Invalid input");
				return;
			}
		}

		if (multiple) {
			if (!values.includes(customInput)) {
				onChange([...values, customInput]);
			}
		} else {
			onChange(customInput);
		}

		setCustomInput("");
		setCustomInputError("");
		setIsCustomInputOpen(false);
	};

	const getDisplayLabel = (val: string) => {
		const option = options.find((opt) => opt.value === val);
		return option ? option.label : val;
	};

	const selectedOptions = multiple
		? values.map((val) => ({
				value: val,
				label: getDisplayLabel(val),
				icon: options.find((opt) => opt.value === val)?.icon,
			}))
		: singleValue
			? [
					{
						value: singleValue,
						label: getDisplayLabel(singleValue),
						icon: options.find((opt) => opt.value === singleValue)?.icon,
					},
				]
			: [];

	return (
		<div className="space-y-2">
			{label && (
				<Label>
					{label}
					{required && <span className="ml-1 text-destructive">*</span>}
				</Label>
			)}

			{/* Selected values display */}
			{selectedOptions.length > 0 && (
				<div className="flex flex-wrap gap-1 p-2 rounded-md border bg-muted/30">
					{selectedOptions.map((item) => (
						<Badge
							key={item.value}
							variant="outline"
							className="gap-1 pr-1 bg-muted"
						>
							{item.icon && (
								<div className="flex-shrink-0 size-3">{item.icon}</div>
							)}
							<span className="text-xs">{item.label}</span>
							<button
								type="button"
								onClick={() => handleRemove(item.value)}
								className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
							>
								<X className="size-3" />
							</button>
						</Badge>
					))}
				</div>
			)}

			{/* Options grid */}
			<div className="space-y-2">
				<div className="grid grid-cols-2 gap-2">
					{options.map((option) => {
						const isSelected = multiple
							? values.includes(option.value)
							: singleValue === option.value;
						return (
							<Button
								key={option.value}
								type="button"
								onClick={() => handleSelect(option.value)}
								variant="outline"
								className={cn(
									"flex items-center justify-start gap-2 rounded-md border text-sm transition-colors",
									"hover:bg-muted",
									isSelected &&
										"bg-brand/5 text-brand hover:bg-brand/10 border-brand",
								)}
							>
								{option.icon && (
									<div
										className={cn(
											"flex-shrink-0  rounded-md border text-primary bg-muted p-1",
											isSelected &&
												"bg-brand/5 hover:bg-brand/10 border-brand/10",
										)}
									>
										{option.icon}
									</div>
								)}
								<span className="text-left">{option.label}</span>
							</Button>
						);
					})}
				</div>

				{/* Custom input trigger */}
				<Popover open={isCustomInputOpen} onOpenChange={setIsCustomInputOpen}>
					<PopoverTrigger asChild>
						<Button
							type="button"
							variant="outline"
							className="gap-2 justify-start w-full"
						>
							<Plus className="w-4 h-4" />
							Add custom value
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-[var(--radix-popover-trigger-width)]">
						<div className="space-y-4">
							<div className="space-y-2">
								<Label className="sr-only">{customInputLabel}</Label>
								<Input
									value={customInput}
									onChange={(e) => {
										setCustomInput(e.target.value);
										setCustomInputError("");
									}}
									placeholder={customInputPlaceholder}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											e.preventDefault();
											handleAddCustom();
										}
									}}
									className="h-8"
								/>
								{customInputError && (
									<p className="text-sm text-destructive">{customInputError}</p>
								)}
							</div>
							<div className="flex gap-2 justify-end">
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="flex-1"
									onClick={() => {
										setIsCustomInputOpen(false);
										setCustomInput("");
										setCustomInputError("");
									}}
								>
									Cancel
								</Button>
								<Button
									type="button"
									size="sm"
									className="flex-1"
									onClick={handleAddCustom}
									disabled={!customInput.trim()}
								>
									Add
								</Button>
							</div>
						</div>
					</PopoverContent>
				</Popover>
			</div>

			{description && (
				<p className="text-sm text-muted-foreground">{description}</p>
			)}
		</div>
	);
};
