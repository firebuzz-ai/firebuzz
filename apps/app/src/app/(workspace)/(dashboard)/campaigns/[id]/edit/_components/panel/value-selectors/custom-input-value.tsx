"use client";

import { Input } from "@firebuzz/ui/components/ui/input";
import { Label } from "@firebuzz/ui/components/ui/label";
import { Textarea } from "@firebuzz/ui/components/ui/textarea";

interface CustomInputValueProps {
	label?: string;
	value: string | number;
	onChange: (value: string | number) => void;
	type?: "text" | "number" | "email" | "url" | "textarea";
	placeholder?: string;
	description?: string;
	required?: boolean;
	min?: number;
	max?: number;
	step?: number;
	rows?: number;
}

export const CustomInputValue = ({
	label,
	value,
	onChange,
	type = "text",
	placeholder,
	description,
	required = false,
	min,
	max,
	step,
	rows = 3,
}: CustomInputValueProps) => {
	const handleChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		const newValue = e.target.value;
		if (type === "number") {
			const numValue = newValue === "" ? "" : Number(newValue);
			onChange(numValue);
		} else {
			onChange(newValue);
		}
	};

	return (
		<div className="space-y-2">
			{label && (
				<Label>
					{label}
					{required && <span className="ml-1 text-destructive">*</span>}
				</Label>
			)}

			{type === "textarea" ? (
				<Textarea
					value={value}
					onChange={handleChange}
					placeholder={placeholder}
					rows={rows}
					required={required}
				/>
			) : (
				<Input
					type={type}
					className="h-8"
					value={value}
					onChange={handleChange}
					placeholder={placeholder}
					required={required}
					min={min}
					max={max}
					step={step}
				/>
			)}

			{description && (
				<p className="text-sm text-muted-foreground">{description}</p>
			)}
		</div>
	);
};
