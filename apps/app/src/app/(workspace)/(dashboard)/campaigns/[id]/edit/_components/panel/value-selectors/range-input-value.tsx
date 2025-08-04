"use client";

import { Input } from "@firebuzz/ui/components/ui/input";
import { Label } from "@firebuzz/ui/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@firebuzz/ui/components/ui/select";
import type { SingleSelectOption } from "./single-select-value";

interface RangeInputValueProps {
	label?: string;
	minValue: string | number;
	maxValue: string | number;
	onChange: (values: [string | number, string | number]) => void;
	type?: "number" | "select" | "text";
	options?: SingleSelectOption[];
	minLabel?: string;
	maxLabel?: string;
	placeholder?: { min?: string; max?: string };
	description?: string;
	required?: boolean;
	min?: number;
	max?: number;
	step?: number;
}

export const RangeInputValue = ({
	label,
	minValue,
	maxValue,
	onChange,
	type = "number",
	options = [],
	minLabel = "From",
	maxLabel = "To",
	placeholder = {},
	description,
	required = false,
	min,
	max,
	step,
}: RangeInputValueProps) => {
	const handleMinChange = (value: string | number) => {
		onChange([value, maxValue]);
	};

	const handleMaxChange = (value: string | number) => {
		onChange([minValue, value]);
	};

	const renderInput = (
		value: string | number,
		onValueChange: (value: string | number) => void,
		placeholderText?: string,
		inputLabel?: string
	) => {
		if (type === "select" && options.length > 0) {
			return (
				<div className="space-y-2">
					{inputLabel && <Label className="text-xs">{inputLabel}</Label>}
					<Select
						value={String(value)}
						onValueChange={onValueChange}
					>
						<SelectTrigger>
							<SelectValue placeholder={placeholderText} />
						</SelectTrigger>
						<SelectContent>
							{options.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									<div className="flex items-center gap-2">
										{option.icon && (
											<div className="w-4 h-4">{option.icon}</div>
										)}
										{option.label}
									</div>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			);
		}

		return (
			<div className="space-y-2">
				{inputLabel && <Label className="text-xs">{inputLabel}</Label>}
				<Input
					type={type === "number" ? "number" : "text"}
					value={value}
					onChange={(e) => {
						const newValue = e.target.value;
						if (type === "number") {
							onValueChange(newValue === "" ? "" : Number(newValue));
						} else {
							onValueChange(newValue);
						}
					}}
					placeholder={placeholderText}
					min={min}
					max={max}
					step={step}
				/>
			</div>
		);
	};

	return (
		<div className="space-y-2">
			{label && (
				<Label>
					{label}
					{required && <span className="text-destructive ml-1">*</span>}
				</Label>
			)}

			<div className="grid grid-cols-2 gap-2 items-end">
				{renderInput(minValue, handleMinChange, placeholder.min, minLabel)}
				{renderInput(maxValue, handleMaxChange, placeholder.max, maxLabel)}
			</div>

			{description && (
				<p className="text-sm text-muted-foreground">{description}</p>
			)}
		</div>
	);
};