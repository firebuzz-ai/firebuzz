"use client";

import { ComboboxSelectValue, type ComboboxSelectOption } from "./combobox-select-value";

export interface SingleSelectOption {
	value: string;
	label: string;
	icon?: React.ReactNode;
	description?: string;
}

interface SingleSelectValueProps {
	label?: string;
	value: string;
	onChange: (value: string) => void;
	options: SingleSelectOption[];
	placeholder?: string;
	description?: string;
	required?: boolean;
}

export const SingleSelectValue = ({
	label,
	value,
	onChange,
	options,
	placeholder = "Select an option",
	description,
	required = false,
}: SingleSelectValueProps) => {
	// Convert SingleSelectOption to ComboboxSelectOption (they're compatible except for description)
	const comboboxOptions: ComboboxSelectOption[] = options.map(({ value, label, icon }) => ({
		value,
		label,
		icon,
	}));

	return (
		<ComboboxSelectValue
			label={label}
			value={value}
			onChange={onChange}
			options={comboboxOptions}
			placeholder={placeholder}
			description={description}
			required={required}
			searchPlaceholder={`Search ${label?.toLowerCase() || 'options'}...`}
		/>
	);
};