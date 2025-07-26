// Types for form schema
export interface FormField {
	id: string;
	title: string;
	placeholder: string; // Now always a string (empty string if not set)
	description: string; // Now always a string (empty string if not set)
	type: "string" | "number" | "boolean";
	inputType:
		| "text"
		| "number"
		| "checkbox"
		| "radio"
		| "select"
		| "textarea"
		| "date"
		| "time"
		| "email"
		| "url"
		| "tel"
		| "password";
	required: boolean;
	unique: boolean; // Now always a boolean
	visible?: boolean; // New visibility flag
	default?: string | number | boolean;
	options?: { label: string; value: string }[];
}

// Available input types with metadata
export interface InputTypeOption {
	type: FormField["inputType"];
	label: string;
	description: string;
	icon: string;
	defaultSettings: Partial<FormField>;
}

export const INPUT_TYPES: InputTypeOption[] = [
	{
		type: "text",
		label: "Text Input",
		description: "Single line text input",
		icon: "Type",
		defaultSettings: {
			type: "string",
			required: false,
			placeholder: "Enter text...",
		},
	},
	{
		type: "textarea",
		label: "Text Area",
		description: "Multi-line text input",
		icon: "AlignLeft",
		defaultSettings: {
			type: "string",
			required: false,
			placeholder: "Enter your message...",
		},
	},
	{
		type: "email",
		label: "Email",
		description: "Email address input",
		icon: "Mail",
		defaultSettings: {
			type: "string",
			required: true,
			placeholder: "example@domain.com",
		},
	},
	{
		type: "number",
		label: "Number",
		description: "Numeric input",
		icon: "Hash",
		defaultSettings: { type: "number", required: false, placeholder: "0" },
	},
	{
		type: "tel",
		label: "Phone",
		description: "Phone number input",
		icon: "Phone",
		defaultSettings: {
			type: "string",
			required: false,
			placeholder: "+1 (555) 000-0000",
		},
	},
	{
		type: "url",
		label: "URL",
		description: "Website URL input",
		icon: "Link",
		defaultSettings: {
			type: "string",
			required: false,
			placeholder: "https://example.com",
		},
	},
	{
		type: "select",
		label: "Select Dropdown",
		description: "Dropdown selection",
		icon: "ChevronDown",
		defaultSettings: {
			type: "string",
			required: false,
			options: [
				{ label: "Option 1", value: "option1" },
				{ label: "Option 2", value: "option2" },
			],
		},
	},
	{
		type: "radio",
		label: "Radio Buttons",
		description: "Single choice from options",
		icon: "Circle",
		defaultSettings: {
			type: "string",
			required: false,
			options: [
				{ label: "Option 1", value: "option1" },
				{ label: "Option 2", value: "option2" },
			],
		},
	},
	{
		type: "checkbox",
		label: "Checkbox",
		description: "True/false checkbox",
		icon: "Check",
		defaultSettings: { type: "boolean", required: false },
	},
	{
		type: "date",
		label: "Date",
		description: "Date picker",
		icon: "Calendar",
		defaultSettings: { type: "string", required: false },
	},
	{
		type: "time",
		label: "Time",
		description: "Time picker",
		icon: "Clock",
		defaultSettings: { type: "string", required: false },
	},
];

// Panel screens
export type PanelScreen =
	| "form-settings"
	| "input-types"
	| "field-settings"
	| "option-edit";
