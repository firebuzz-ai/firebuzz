import { campaignConfiguration } from "@/configuration/campaign";
import { z } from "zod";

// API Response Types (matching the endpoint schemas)
const submitFormResponseSchema = z.object({
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

const errorResponseSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  errors: z.record(z.string(), z.string()).optional(),
});

export type SubmitFormResponse = z.infer<typeof submitFormResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
// Form submission data type (form fields only)
export type FormSubmissionData = Record<string, string | number | boolean>;
// Extended form data with optional test flag
export type FormSubmissionPayload = FormSubmissionData & {
  isTest?: boolean;
};

// API Client Result Types
export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  message: string;
}

export interface ApiError {
  success: false;
  message: string;
  statusCode: number;
  validationErrors?: Record<string, string>;
}

export type ApiResult<T = unknown> = ApiSuccess<T> | ApiError;

class FormApiClient {
  private config: { baseUrl: string };

  constructor({ baseUrl }: { baseUrl: string }) {
    this.config = {
      baseUrl,
    };
  }

  /**
   * Submit form data to the API endpoint
   */
  async submitForm(
    formId: string,
    data: FormSubmissionPayload
  ): Promise<ApiResult<SubmitFormResponse["data"]>> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/client-api/v1/form/submit/${formId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );

      const responseData = await response.json();

      // Handle different status codes
      switch (response.status) {
        case 200: {
          const parsedResponse = submitFormResponseSchema.parse(responseData);
          return {
            success: true,
            data: parsedResponse.data,
            message: parsedResponse.message,
          };
        }

        case 400: {
          const errorResponse = errorResponseSchema.parse(responseData);
          return {
            success: false,
            message: errorResponse.message,
            statusCode: response.status,
            validationErrors: errorResponse.errors,
          };
        }

        case 404:
          return {
            success: false,
            message: "Form not found. Please check the form ID and try again.",
            statusCode: response.status,
          };

        case 429:
          return {
            success: false,
            message:
              "Too many requests. Please wait a moment before trying again.",
            statusCode: response.status,
          };

        case 500:
          return {
            success: false,
            message: "Server error occurred. Please try again later.",
            statusCode: response.status,
          };

        default:
          return {
            success: false,
            message: `Unexpected error occurred (${response.status}). Please try again.`,
            statusCode: response.status,
          };
      }
    } catch (error) {
      // Handle network errors, parsing errors, etc.
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      return {
        success: false,
        message: `Network error: ${errorMessage}. Please check your connection and try again.`,
        statusCode: 0, // Network error doesn't have HTTP status
      };
    }
  }

  /**
   * Get user-friendly error message for toast notifications
   */
  getToastMessage(result: ApiResult): string {
    if (result.success) {
      return result.message;
    }

    // Handle validation errors specifically
    if (
      result.validationErrors &&
      Object.keys(result.validationErrors).length > 0
    ) {
      const firstError = Object.values(result.validationErrors)[0];
      return `Validation error: ${firstError}`;
    }

    return result.message;
  }

  /**
   * Get all validation errors for form field highlighting
   */
  getValidationErrors(result: ApiResult): Record<string, string> {
    if (!result.success && result.validationErrors) {
      return result.validationErrors;
    }
    return {};
  }
}

/**
 * Default API client instance
 */
export const formApiClient = new FormApiClient({
  baseUrl: campaignConfiguration.apiUrl,
});
