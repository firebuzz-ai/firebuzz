import { openAI } from "@/lib/ai/openai";
import { auth } from "@clerk/nextjs/server";
import { generateObject } from "ai";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const formFieldSchema = z.object({
  id: z.string().describe("Unique identifier for the field"),
  title: z.string().describe("Display title for the field"),
  placeholder: z
    .union([z.string(), z.undefined()])
    .describe("Placeholder text for the input"),
  description: z
    .union([z.string(), z.undefined()])
    .describe("Help description for the field"),
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
    .union([z.string(), z.number(), z.boolean(), z.undefined()])
    .describe("Default value for the field"),
  options: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
      })
    )
    .optional()
    .describe("Options for select/radio fields"),
});

const formSchemaResponse = z.object({
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

export async function POST(request: NextRequest) {
  const { prompt, existingSchema } = await request.json();

  const user = await auth();

  if (!user.userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const existingSchemaText =
    existingSchema && existingSchema.length > 0
      ? `\n\nExisting form schema to modify:\n${JSON.stringify(existingSchema, null, 2)}`
      : "";

  const response = await generateObject({
    model: openAI("gpt-4o-mini"),
    prompt: `
You are a helpful assistant that generates form schemas for lead generation forms.

Based on the user's prompt, generate a complete form schema with appropriate fields.

Guidelines:
- Generate meaningful field IDs (kebab-case)
- Choose appropriate input types for each field
- Set reasonable default values and placeholders
- Add helpful descriptions where needed
- For select/radio fields, provide relevant options
- Consider data validation requirements
- Make commonly important fields required (like email for lead gen)

User prompt: ${prompt}${existingSchemaText}

If there's an existing schema, modify it according to the prompt while preserving fields that aren't mentioned.
    `,
    schema: formSchemaResponse,
  });

  return NextResponse.json(response.object);
}
