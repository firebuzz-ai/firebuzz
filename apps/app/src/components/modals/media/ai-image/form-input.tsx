import { useAIImageModal } from "@/hooks/ui/use-ai-image-modal";
import ImageGenClient from "@/lib/ai/image/client";
import { api, useMutation, useUploadFile } from "@firebuzz/convex";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import { Input } from "@firebuzz/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@firebuzz/ui/components/ui/select";
import { Separator } from "@firebuzz/ui/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import {
  CornerDownRight,
  Paintbrush,
  Ratio,
  SlidersHorizontal,
} from "@firebuzz/ui/icons/lucide";
import { cn, toast } from "@firebuzz/ui/lib/utils";
import { useState } from "react";

const IMAGE_SIZES = {
  "1024x1024": "Square (1:1)",
  "1536x1024": "Landscape (3:2)",
  "1024x1536": "Portrait (2:3)",
  auto: "Auto",
} as const;

type ImageSize = keyof typeof IMAGE_SIZES;

interface GenerateImageFormInputProps {
  selectedSize: ImageSize;

  setSelectedSize: React.Dispatch<React.SetStateAction<ImageSize>>;
  setState: React.Dispatch<React.SetStateAction<"idle" | "generating">>;
  quality: "low" | "medium" | "high";
  setQuality: React.Dispatch<React.SetStateAction<"low" | "medium" | "high">>;
  isMasking: boolean;
  setIsMasking: React.Dispatch<React.SetStateAction<boolean>>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export const GenerateImageFormInput = ({
  selectedSize,
  setSelectedSize,
  setState,
  quality,
  setQuality,
  isMasking,
  setIsMasking,
  canvasRef,
}: GenerateImageFormInputProps) => {
  const { selectedImage, setSelectedImage } = useAIImageModal();
  const [prompt, setPrompt] = useState("");
  const uploadFile = useUploadFile(api.helpers.r2);
  const createMedia = useMutation(
    api.collections.storage.media.mutations.create
  );

  // Return a Promise that resolves with the mask File or null
  const getMaskFile = (): Promise<File | null> => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        console.warn(
          "getMaskFile: Canvas not available or has zero dimensions."
        );
        resolve(null);
        return;
      }

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        console.error("getMaskFile: Failed to get 2D context.");
        resolve(null);
        return;
      }

      try {
        // 1. Get the original ImageData drawn by MaskCanvas
        const originalImageData = ctx.getImageData(
          0,
          0,
          canvas.width,
          canvas.height
        );
        const originalData = originalImageData.data;

        // 2. Create a new ImageData for the inverted mask
        const invertedImageData = new ImageData(canvas.width, canvas.height);
        const invertedData = invertedImageData.data;

        // 3. Iterate and invert the alpha logic
        for (let i = 0; i < originalData.length; i += 4) {
          const originalAlpha = originalData[i + 3];

          if (originalAlpha > 0) {
            // --- Area was brushed (EDIT this area) ---
            // Make it fully transparent in the inverted mask
            invertedData[i] = 0; // R
            invertedData[i + 1] = 0; // G
            invertedData[i + 2] = 0; // B
            invertedData[i + 3] = 0; // A (Transparent)
          } else {
            // --- Area was NOT brushed (KEEP this area) ---
            // Make it fully opaque white in the inverted mask
            invertedData[i] = 255; // R
            invertedData[i + 1] = 255; // G
            invertedData[i + 2] = 255; // B
            invertedData[i + 3] = 255; // A (Opaque)
          }
        }

        // 4. Use a temporary canvas to generate the blob from inverted data
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext("2d");

        if (!tempCtx) {
          console.error(
            "getMaskFile: Failed to get context for temporary canvas."
          );
          resolve(null);
          return;
        }

        // 5. Put the inverted data onto the temp canvas and get blob
        tempCtx.putImageData(invertedImageData, 0, 0);
        tempCanvas.toBlob((blob) => {
          if (blob) {
            // Check blob size (optional but good practice)
            if (blob.size > 4 * 1024 * 1024) {
              console.warn("Generated mask blob exceeds 4MB limit.");
              toast.error("Mask image is too large (max 4MB).");
              resolve(null);
            } else {
              const file = new File([blob], "mask.png", { type: "image/png" });
              resolve(file);
            }
          } else {
            console.error(
              "getMaskFile: Failed to create blob from temporary canvas."
            );
            resolve(null);
          }
        }, "image/png");
      } catch (error) {
        console.error("Error processing mask image data:", error);
        resolve(null);
      }
    });
  };

  const clearMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Use the clearMask method that was attached to the canvas by the MaskCanvas component
    if ("clearMask" in canvas && typeof canvas.clearMask === "function") {
      canvas.clearMask();
    } else {
      // Fallback to the original implementation
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // Check if mask has content
  const hasMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log("hasMask: No canvas ref");
      return false;
    }

    // Use consistent context attributes as MaskCanvas
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      console.log("hasMask: No canvas context");
      return false;
    }

    console.log(`hasMask: Checking canvas ${canvas.width}x${canvas.height}`);

    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) {
          console.log(
            `hasMask: Found non-transparent pixel at index ${i / 4} (alpha=${data[i]})`
          );
          return true; // Found content
        }
      }

      console.log("hasMask: No non-transparent pixels found");
      return false; // No content found
    } catch (error) {
      console.error("hasMask: Error getting image data:", error);
      // Added try-catch just in case getImageData fails
      return false; // Treat errors as no mask
    }
  };

  // Use the client for generation, but handle edit via direct fetch
  const imageGenClient = new ImageGenClient(); // Keep for generate

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }
    setState("generating");
    try {
      const result = await imageGenClient.generate({
        prompt,
        size: selectedSize,
        quality,
        model: "gpt-image-1",
        n: 1,
        background: "auto",
        output_format: "png",
        output_compression: 100,
        moderation: "low",
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      const firstResultData = result.data?.[0];

      if (firstResultData?.b64_json) {
        const byteCharacters = atob(firstResultData.b64_json);
        const byteArrays = [];
        for (let i = 0; i < byteCharacters.length; i++) {
          byteArrays.push(byteCharacters.charCodeAt(i));
        }
        const byteArray = new Uint8Array(byteArrays);
        const blob = new Blob([byteArray], { type: "image/png" });
        const file = new File([blob], `generated-${Date.now()}.png`, {
          type: "image/png",
        });
        const key = await uploadFile(file);
        const aiMetadata = {
          prompt,
          size: selectedSize,
          quality,
        };
        await createMedia({
          key,
          name: `generated-${Date.now()}.png`,
          type: "image",
          contentType: "image/png",
          size: blob.size,
          source: "ai-generated",
          aiMetadata,
        });
        setSelectedImage(key);
      } else {
        throw new Error("No image data received");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate image"
      );
    } finally {
      setState("idle");
    }
  };

  const handleEdit = async () => {
    if (!prompt.trim() || !selectedImage) {
      toast.error("Please enter an edit prompt and select an image");
      return;
    }

    const maskIsPresent = hasMask();

    if (isMasking && !maskIsPresent) {
      toast.error("Please draw a mask first or disable masking");
      return;
    }

    setState("generating");
    try {
      // 1. Get mask file if needed
      const maskFile = isMasking && maskIsPresent ? await getMaskFile() : null;
      if (isMasking && maskIsPresent && !maskFile) {
        // If masking was intended but failed to get file, stop here
        toast.error("Failed to process mask image.");
        setState("idle");
        return;
      }
      // 2. Call the client's edit method
      // The client handles FormData creation internally
      const result = await imageGenClient.edit({
        prompt,
        imageKeys: selectedImage,
        quality,
        mask: maskFile ?? undefined,
        model: "gpt-image-1",
        n: 1,
        size: selectedSize,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      // 3. Process successful API Response
      const firstResultData = result.data?.[0];

      if (firstResultData?.b64_json) {
        const byteCharacters = atob(firstResultData.b64_json);
        const byteArrays = [];
        for (let i = 0; i < byteCharacters.length; i++) {
          byteArrays.push(byteCharacters.charCodeAt(i));
        }
        const byteArray = new Uint8Array(byteArrays);
        const editedBlob = new Blob([byteArray], { type: "image/png" });
        const file = new File([editedBlob], `edited-${Date.now()}.png`, {
          type: "image/png",
        });
        const key = await uploadFile(file);
        // Store metadata matching the expected type for createMedia
        const aiMetadata = {
          prompt,
          quality,
          size: selectedSize,
        };
        await createMedia({
          key,
          name: file.name,
          type: "image",
          contentType: "image/png",
          size: editedBlob.size,
          source: "ai-generated",
          aiMetadata,
        });
        setSelectedImage(key);
        setPrompt("");

        if (isMasking) clearMask();
      } else {
        throw new Error("No image data received");
      }
    } catch (error) {
      console.error("handleEdit error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to edit image"
      );
    } finally {
      setState("idle");
    }
  };

  return (
    <div className="flex items-center justify-center w-full py-10 border-t">
      <div className="flex flex-col w-full max-w-3xl gap-3">
        {/* Top-left AI settings */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Size Select */}
          <Select
            value={selectedSize}
            onValueChange={(v) => setSelectedSize(v as ImageSize)}
          >
            <SelectTrigger className="h-8 max-w-fit">
              <div className="flex items-center gap-2 pr-2 whitespace-nowrap">
                <Ratio className="size-3.5" />
                <SelectValue placeholder="Size" />
              </div>
            </SelectTrigger>
            <SelectContent side="top" sideOffset={10}>
              {Object.entries(IMAGE_SIZES).map(([key, value]) => (
                <SelectItem key={key} value={key}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Quality Select */}
          <Select
            value={quality}
            onValueChange={(v) => setQuality(v as "low" | "medium" | "high")}
          >
            <SelectTrigger className="h-8 max-w-fit">
              <div className="flex items-center gap-2 pr-2 whitespace-nowrap">
                <SlidersHorizontal className="size-3.5" />
                <SelectValue placeholder="Quality" />
              </div>
            </SelectTrigger>
            <SelectContent side="top" sideOffset={10}>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
          <Separator orientation="vertical" className="h-4" />
          {/* Mask Toggle */}
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                disabled={!selectedImage}
                variant="outline"
                className={cn("h-8", {
                  "text-brand hover:text-brand/80": isMasking,
                })}
                size="sm"
                onClick={() => {
                  if (isMasking) {
                    // If turning off masking, clear any existing mask
                    clearMask();
                  }
                  setIsMasking((v) => !v);
                }}
              >
                <Paintbrush className="!size-3.5" /> Select
              </Button>
            </TooltipTrigger>
            <TooltipContent className="text-xs" side="top" sideOffset={5}>
              Mask the image
            </TooltipContent>
          </Tooltip>
        </div>
        {/* Input + Buttons */}
        <div className="flex items-center gap-4 p-2 border rounded-lg shadow-lg bg-background-subtle">
          <Input
            className="bg-transparent border-none outline-none focus-visible:ring-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            placeholder="Describe the image you want to generate..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <div className="flex gap-2 right-3 bottom-2">
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  disabled={
                    !prompt.trim() || isMasking || Boolean(selectedImage)
                  }
                  onClick={handleGenerate}
                >
                  Generate{" "}
                  <ButtonShortcut>
                    <CornerDownRight className="!size-3" />
                  </ButtonShortcut>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs" side="top" sideOffset={5}>
                Generate a new image with AI
              </TooltipContent>
            </Tooltip>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8"
                  disabled={!prompt.trim() || !selectedImage}
                  onClick={handleEdit}
                >
                  Edit <ButtonShortcut>⌘E</ButtonShortcut>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs" side="top" sideOffset={5}>
                Edit the generated image with AI
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
};
