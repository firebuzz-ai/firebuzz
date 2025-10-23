import { z } from "zod";

export const formFieldSchema = z.object({
	id: z.string().describe("Unique identifier for the field"),
	title: z.string().describe("Display title for the field"),
	placeholder: z.string().optional().describe("Placeholder text for the input"),
	description: z.string().optional().describe("Help description for the field"),
	type: z
		.enum(["string", "number", "boolean"])
		.describe("Data type of the field"),
	inputType: z
		.enum([
			"text",
			"number",
			"checkbox",
			"radio",
			"select",
			"textarea",
			"date",
			"time",
			"email",
			"url",
			"tel",
			"password",
		])
		.describe("UI input type for the field"),
	required: z.boolean().describe("Whether the field is required"),
	unique: z.boolean().describe("Whether the field value should be unique"),
	visible: z
		.boolean()
		.default(true)
		.describe("Whether the field is visible to users"),
	default: z
		.union([z.string(), z.number(), z.boolean()])
		.optional()
		.describe("Default value for the field"),
	options: z
		.array(
			z.object({
				label: z.string(),
				value: z.string(),
			}),
		)
		.optional()
		.describe("Options for select/radio fields"),
});

export const formSchemaResponse = z.object({
	schema: z.array(formFieldSchema).describe("Array of form fields"),
	submitButtonText: z
		.string()
		.optional()
		.describe("Text for the submit button"),
	successMessage: z
		.string()
		.optional()
		.describe("Message shown after successful submission"),
});

export type FormField = z.infer<typeof formFieldSchema>;
export type FormSchemaResponse = z.infer<typeof formSchemaResponse>;
