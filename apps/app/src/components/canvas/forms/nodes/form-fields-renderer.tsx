"use client";

import { Input } from "@firebuzz/ui/components/ui/input";
import { Textarea } from "@firebuzz/ui/components/ui/textarea";
import { Checkbox } from "@firebuzz/ui/components/ui/checkbox";
import { Button } from "@firebuzz/ui/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@firebuzz/ui/components/ui/select";
import {
	RadioGroup,
	RadioGroupItem,
} from "@firebuzz/ui/components/ui/radio-group";
import { DatePicker } from "@firebuzz/ui/components/ui/date-picker";
import type { FormField } from "../../../../app/(workspace)/(dashboard)/campaigns/[id]/form/_components/form-types";

interface FormFieldsRendererProps {
	fields: FormField[];
}

export const FormFieldsRenderer = ({ fields }: FormFieldsRendererProps) => {
	const renderFormField = (field: FormField) => {
		const fieldContent = (() => {
			switch (field.inputType) {
				case "text":
				case "email":
				case "url":
				case "tel":
				case "password": {
					return (
						<Input
							className="h-8"
							placeholder={
								field.placeholder || `Enter ${field.title.toLowerCase()}...`
							}
							type={field.inputType}
							disabled
							value=""
						/>
					);
				}
				case "number": {
					return (
						<Input
							className="h-8"
							placeholder={
								field.placeholder || `Enter ${field.title.toLowerCase()}...`
							}
							type="number"
							disabled
							value=""
						/>
					);
				}
				case "textarea": {
					return (
						<Textarea
							className="min-h-16"
							placeholder={
								field.placeholder || `Enter ${field.title.toLowerCase()}...`
							}
							disabled
							value=""
						/>
					);
				}
				case "checkbox": {
					return (
						<div className="flex items-center space-x-2">
							<Checkbox
								id={field.id}
								disabled
								checked={false}
							/>
							<label htmlFor={field.id} className="text-sm">
								{field.placeholder || field.title}
							</label>
						</div>
					);
				}
				case "radio": {
					return (
						<RadioGroup disabled value="">
							{field.options?.map((option) => (
								<div
									key={option.value}
									className="flex items-center space-x-2"
								>
									<RadioGroupItem
										value={option.value}
										id={`${field.id}-${option.value}`}
									/>
									<label
										htmlFor={`${field.id}-${option.value}`}
										className="text-sm"
									>
										{option.label}
									</label>
								</div>
							))}
						</RadioGroup>
					);
				}
				case "select": {
					return (
						<Select disabled value="">
							<SelectTrigger className="h-8">
								<SelectValue
									placeholder={
										field.placeholder ||
										`Select ${field.title.toLowerCase()}...`
									}
								/>
							</SelectTrigger>
							<SelectContent>
								{field.options?.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					);
				}
				case "date": {
					return (
						<DatePicker
							value={undefined}
							onChange={() => {}}
							placeholder={field.placeholder || "Select date..."}
						/>
					);
				}
				case "time": {
					return (
						<Input
							className="h-8"
							type="time"
							disabled
							value=""
						/>
					);
				}
				default:
					return (
						<Input
							className="h-8"
							placeholder={field.placeholder}
							disabled
							value=""
						/>
					);
			}
		})();

		return (
			<div key={field.id} className="space-y-2">
				<label className="text-sm font-medium text-foreground">
					{field.title}
					{field.required && (
						<span className="ml-1 text-destructive">*</span>
					)}
				</label>
				{fieldContent}
				{field.description && (
					<p className="text-xs text-muted-foreground">
						{field.description}
					</p>
				)}
			</div>
		);
	};

	return (
		<div className="space-y-4">
			{fields
				.filter((field) => field.visible !== false)
				.map(renderFormField)}
		</div>
	);
};