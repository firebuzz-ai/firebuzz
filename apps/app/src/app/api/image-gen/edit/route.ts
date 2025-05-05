import { editImageParamsSchema } from "@/lib/ai/image/client";
import { openAIRaw } from "@/lib/ai/openai";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

// Standard error response structure - shared with generate route
interface ApiErrorResponse {
  success: false;
  error: string;
  details?: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
    if (!r2PublicUrl) {
      console.error("Missing NEXT_PUBLIC_R2_PUBLIC_URL environment variable");
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: "Server configuration error: Missing R2 public URL.",
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    // Get form data (will contain mask if provided, and params)
    const formData = await request.formData();

    // Parse the params JSON
    const paramsJson = formData.get("params") as string;
    if (!paramsJson) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: "Missing 'params' in form data.",
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }
    const params = editImageParamsSchema.parse(JSON.parse(paramsJson));

    // Get mask if provided (from formData) - mask applies to all edits
    const mask = formData.get("mask");
    const maskFile = mask instanceof File ? mask : undefined;

    // Ensure imageKeys is an array
    const imageKeysArray = Array.isArray(params.imageKeys)
      ? params.imageKeys
      : [params.imageKeys];

    if (imageKeysArray.length === 0) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: "Missing 'imageKeys' in params.",
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Prepare base params for OpenAI, removing imageKeys and the incompatible size
    const { imageKeys, size, ...openaiBaseParams } = params;

    // --- Fetch All Image Files Concurrently ---
    let imageFiles: File[] = [];
    try {
      const fetchPromises = imageKeysArray.map(async (imageKey) => {
        const imageUrl = `${r2PublicUrl}/${imageKey}`;
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          throw new Error(
            `Failed to fetch image ${imageKey} from R2: ${imageResponse.status} ${imageResponse.statusText}`
          );
        }
        const fetchedContentType = imageResponse.headers.get("content-type");
        if (!fetchedContentType) {
          throw new Error(
            `Could not determine content type for image ${imageKey}.`
          );
        }
        const arrayBuffer = await imageResponse.arrayBuffer();
        const imageBlob = new Blob([arrayBuffer], { type: fetchedContentType });
        return new File([imageBlob], imageKey, { type: imageBlob.type });
      });

      imageFiles = await Promise.all(fetchPromises);
    } catch (fetchError) {
      console.error("Error fetching source images:", fetchError);
      const errorResponse: ApiErrorResponse = {
        success: false,
        error:
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to fetch one or more source images from storage.",
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    // --- Call OpenAI Edit API Once with All Images ---
    try {
      // Determine if we pass a single file or an array
      const imageInput = imageFiles.length === 1 ? imageFiles[0] : imageFiles;

      console.log("imageInput", imageInput);
      console.log("maskFile", maskFile);

      const response = await openAIRaw.images.edit({
        image: imageInput,
        mask: maskFile,
        ...openaiBaseParams,
      });

      // Return the single response object from the API call
      return NextResponse.json({ ...response, success: true });
    } catch (apiError) {
      console.error("Error calling OpenAI image edit API:", apiError);
      const errorResponse: ApiErrorResponse = {
        success: false,
        error:
          apiError instanceof Error
            ? apiError.message
            : "Failed to edit image(s) via external API.",
      };
      // Potentially map apiError status codes if available
      return NextResponse.json(errorResponse, { status: 500 });
    }
  } catch (error) {
    console.error("Image edit API error:", error);

    if (error instanceof z.ZodError) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: "Invalid request parameters.",
        details: error.errors,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Generic error response
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to edit image.",
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
