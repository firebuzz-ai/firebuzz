import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { z } from "zod";
import { campaignConfiguration } from "@/configuration/campaign";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Create dynamic schema based on campaign configuration
export function createZodSchemaFromFormConfig(
  fields: typeof campaignConfiguration.schema
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
        } else if (field.inputType === "tel") {
          fieldSchema = z.string().regex(/^\d{10}$/, "Invalid phone number");
        } else if (field.inputType === "date") {
          fieldSchema = z.string().datetime("Invalid date format");
        } else if (field.inputType === "time") {
          fieldSchema = z
            .string()
            .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format");
        } else if (field.inputType === "textarea") {
          fieldSchema = z.string().min(1, "Required");
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
