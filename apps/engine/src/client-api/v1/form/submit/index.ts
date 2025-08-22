import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";

// Error Response Schema
const errorResponses = {
	400: {
		content: {
			"application/json": {
				schema: z.object({
					success: z.literal(false),
					message: z.string(),
					errors: z.record(z.string(), z.string()).optional(),
				}),
			},
		},
		description: "Bad Request - Validation failed or wrong payload",
	},
	404: {
		content: {
			"application/json": {
				schema: z.object({
					success: z.literal(false),
					message: z.literal("Form not found"),
				}),
			},
		},
		description: "Form not found",
	},
	429: {
		content: {
			"application/json": {
				schema: z.object({
					success: z.literal(false),
					message: z.literal("Rate limit exceeded"),
				}),
			},
		},
		description: "Rate limit exceeded",
	},
	500: {
		content: {
			"application/json": {
				schema: z.object({
					success: z.literal(false),
					message: z.literal("Internal Server Error"),
				}),
			},
		},
		description: "Internal Server Error",
	},
};

// Form field schema (matches the Convex schema)
const formFieldSchema = z.object({
	id: z.string(),
	title: z.string(),
	placeholder: z.string().optional(),
	description: z.string().optional(),
	type: z.enum(["string", "number", "boolean"]),
	inputType: z.enum([
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
	]),
	required: z.boolean(),
	unique: z.boolean(),
	visible: z.boolean().optional(),
	default: z.union([z.string(), z.number(), z.boolean()]).optional(),
	options: z
		.array(
			z.object({
				label: z.string(),
				value: z.string(),
			}),
		)
		.optional(),
});

// Form config schema (stored in KV)
const formConfigSchema = z.object({
	campaignId: z.string(),
	schema: z.array(formFieldSchema),
});

// Request/Response schemas
export const submitFormParamsSchema = z.object({
	formId: z.string(),
});

export const submitFormBodySchema = z.record(z.string(), z.any()).and(
	z.object({
		isTest: z.boolean().optional(),
	}),
);

export const submitFormResponseSchema = z.object({
	success: z.boolean(),
	message: z.string(),
	data: z
		.object({
			formId: z.string(),
			campaignId: z.string(),
			submissionId: z.string().optional(),
			validationErrors: z.record(z.string(), z.string()).optional(),
		})
		.optional(),
});

// Helper function to convert form schema to Zod schema
function createZodSchemaFromFormFields(
	fields: z.infer<typeof formFieldSchema>[],
): z.ZodSchema {
	const schemaObject: Record<string, z.ZodSchema> = {};

	for (const field of fields) {
		let fieldSchema: z.ZodSchema;

		// Create base schema based on type
		switch (field.type) {
			case "string":
				fieldSchema = z.string();
				// Add specific validations based on inputType
				if (field.inputType === "email") {
					fieldSchema = z.string().email("Invalid email format");
				} else if (field.inputType === "url") {
					fieldSchema = z.string().url("Invalid URL format");
				}
				break;
			case "number":
				fieldSchema = z.coerce.number();
				break;
			case "boolean":
				fieldSchema = z.coerce.boolean();
				break;
			default:
				fieldSchema = z.string();
		}

		// Handle options for select/radio fields
		if (field.options && field.options.length > 0) {
			const validValues = field.options.map((opt) => opt.value);
			fieldSchema = z.enum(validValues as [string, ...string[]]);
		}

		// Make optional if not required
		if (!field.required) {
			fieldSchema = fieldSchema.optional();
		}

		schemaObject[field.id] = fieldSchema;
	}

	return z.object(schemaObject);
}

const submitFormRoute = createRoute({
	path: "/{formId}",
	method: "post",
	request: {
		params: submitFormParamsSchema,
		body: {
			content: {
				"application/json": {
					schema: submitFormBodySchema,
				},
			},
		},
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: submitFormResponseSchema,
				},
			},
			description: "Form submitted successfully",
		},
		...errorResponses,
	},
});

const app = new OpenAPIHono<{ Bindings: Env }>();

export const formSubmitRoute = app
	.openapi(submitFormRoute, async (c) => {
		const { formId } = c.req.valid("param");
		const submissionData = c.req.valid("json");

		try {
			// Get form config from KV store
			const configResult = await c.env.CAMPAIGN.get(`form:${formId}`, {
				type: "json",
			});

			if (!configResult) {
				return c.json(
					{
						success: false as const,
						message: "Form not found" as const,
					},
					404,
				);
			}

			// Parse and validate the config
			const config = formConfigSchema.parse(configResult);

			// Extract isTest flag from submission data
			const { isTest, ...formData } = submissionData;

			// Create Zod schema from form fields
			const validationSchema = createZodSchemaFromFormFields(config.schema);

			// Validate the submitted data
			const validationResult = validationSchema.safeParse(formData);

			if (!validationResult.success) {
				// Format validation errors
				const validationErrors: Record<string, string> = {};
				for (const issue of validationResult.error.issues) {
					const path = issue.path.join(".");
					validationErrors[path] = issue.message;
				}

				return c.json(
					{
						success: false as const,
						message: "Validation failed",
						errors: validationErrors,
					},
					400,
				);
			}

			// Validation passed - now submit to Convex
			const convexUrl = c.env.CONVEX_HTTP_URL;
			if (!convexUrl) {
				throw new Error("CONVEX_URL not configured");
			}

			const convexResponse = await fetch(`${convexUrl}/form/submit`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: c.env.SERVICE_TOKEN || "",
				},
				body: JSON.stringify({
					formId,
					data: validationResult.data,
					isTest: isTest || false,
				}),
			});

			// Handle different response status codes from Convex
			switch (convexResponse.status) {
				case 200: {
					const result = (await convexResponse.json()) as {
						submissionId: string;
					};
					return c.json(
						{
							success: true,
							message: "Form submitted successfully",
							data: {
								formId,
								campaignId: config.campaignId,
								submissionId: result.submissionId,
							},
						},
						200,
					);
				}
				case 401:
					return c.json(
						{
							success: false as const,
							message: "Internal Server Error" as const,
						},
						500,
					);
				case 404:
					return c.json(
						{
							success: false as const,
							message: "Form not found" as const,
						},
						404,
					);
				case 422:
					return c.json(
						{
							success: false as const,
							message: "Invalid submission data",
						},
						400,
					);
				case 429:
					return c.json(
						{
							success: false as const,
							message: "Rate limit exceeded" as const,
						},
						429,
					);
				default:
					console.error(
						"Unexpected Convex response:",
						convexResponse.status,
						await convexResponse.text(),
					);
					return c.json(
						{
							success: false as const,
							message: "Internal Server Error" as const,
						},
						500,
					);
			}
		} catch (error) {
			console.error("Form submission error:", error);
			return c.json(
				{
					success: false as const,
					message: "Internal Server Error" as const,
				},
				500,
			);
		}
	})
	.options("*", (c) => {
		return c.text("", {
			status: 200,
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, Authorization",
				"Access-Control-Max-Age": "86400",
			},
		});
	});
