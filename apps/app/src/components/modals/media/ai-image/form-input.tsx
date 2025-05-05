import {
  type GeneratedImage,
  useAIImageModal,
} from "@/hooks/ui/use-ai-image-modal";
import ImageGenClient from "@/lib/ai/image/client";
import {
  api,
  useMutation,
  useStableCachedQuery,
  useUploadFile,
} from "@firebuzz/convex";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import { Input } from "@firebuzz/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@firebuzz/ui/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import {
  CornerDownRight,
  Ratio,
  SlidersHorizontal,
} from "@firebuzz/ui/icons/lucide";
import { toast } from "@firebuzz/ui/lib/utils";
import { useMemo, useState } from "react";
import { Generations } from "./generations";
import { ImageList } from "./image-list";
import { MaskButton } from "./mask-button";

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
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export const GenerateImageFormInput = ({
  selectedSize,
  setSelectedSize,
  setState,
  quality,
  setQuality,
  canvasRef,
}: GenerateImageFormInputProps) => {
  const {
    selectedImage,
    setSelectedImage,
    images,
    isMasking,
    setIsMasking,
    isSelectedImagePrimary,
  } = useAIImageModal();

  const [prompt, setPrompt] = useState("");
  const generations = useStableCachedQuery(
    api.collections.storage.media.queries.getRecentGenerations
  );

  const memoizedGenerations = useMemo(() => {
    return generations?.map((generation) => ({
      imageKey: generation.key,
      prompt: generation.aiMetadata?.prompt ?? "",
      quality: generation.aiMetadata?.quality ?? "medium",
      size: generation.aiMetadata?.size ?? "auto",
    })) as GeneratedImage[];
  }, [generations]);

  const uploadFile = useUploadFile(api.helpers.r2);
  const createMedia = useMutation(
    api.collections.storage.media.mutations.create
  );

  // Return a Promise that resolves with the mask File or null, scaled to natural dimensions stored on canvas
  const getMaskFile = (): Promise<File | null> => {
    return new Promise((resolve) => {
      // Cast canvasRef.current to include our custom properties
      const canvas = canvasRef.current as
        | (HTMLCanvasElement & {
            naturalWidth?: number;
            naturalHeight?: number;
          })
        | null;

      const originalWidth = canvas?.naturalWidth;
      const originalHeight = canvas?.naturalHeight;

      if (
        !canvas ||
        canvas.width === 0 ||
        canvas.height === 0 ||
        !originalWidth || // Check if natural dimensions exist
        !originalHeight ||
        originalWidth <= 0 ||
        originalHeight <= 0
      ) {
        console.warn(
          "getMaskFile: Canvas not available, has zero dimensions, or missing natural dimensions."
        );
        resolve(null);
        return;
      }

      const renderedWidth = canvas.width;
      const renderedHeight = canvas.height;

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        console.error("getMaskFile: Failed to get 2D context.");
        resolve(null);
        return;
      }

      try {
        // 1. Get rendered ImageData
        const renderedImageData = ctx.getImageData(
          0,
          0,
          renderedWidth,
          renderedHeight
        );
        const renderedData = renderedImageData.data;

        // 2. Create inverted ImageData at original dimensions
        const invertedImageData = new ImageData(originalWidth, originalHeight);
        const invertedData = invertedImageData.data;

        // Scaling factors
        const scaleX = renderedWidth / originalWidth;
        const scaleY = renderedHeight / originalHeight;

        // 3. Iterate through original dimensions, sample from rendered, invert
        for (let oy = 0; oy < originalHeight; oy++) {
          for (let ox = 0; ox < originalWidth; ox++) {
            const sx = Math.floor(ox * scaleX);
            const sy = Math.floor(oy * scaleY);
            const safeSx = Math.max(0, Math.min(renderedWidth - 1, sx));
            const safeSy = Math.max(0, Math.min(renderedHeight - 1, sy));
            const sourceIndex = (safeSy * renderedWidth + safeSx) * 4;
            const originalAlpha = renderedData[sourceIndex + 3];
            const targetIndex = (oy * originalWidth + ox) * 4;

            if (originalAlpha > 0) {
              invertedData[targetIndex] = 0;
              invertedData[targetIndex + 1] = 0;
              invertedData[targetIndex + 2] = 0;
              invertedData[targetIndex + 3] = 0;
            } else {
              invertedData[targetIndex] = 255;
              invertedData[targetIndex + 1] = 255;
              invertedData[targetIndex + 2] = 255;
              invertedData[targetIndex + 3] = 255;
            }
          }
        }

        // 4. Temp canvas at original dimensions
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = originalWidth;
        tempCanvas.height = originalHeight;
        const tempCtx = tempCanvas.getContext("2d");

        if (!tempCtx) {
          console.error(
            "getMaskFile: Failed to get context for temporary canvas."
          );
          resolve(null);
          return;
        }

        // 5. Put scaled/inverted data, get blob, check size, return file
        tempCtx.putImageData(invertedImageData, 0, 0);
        tempCanvas.toBlob((blob) => {
          if (blob) {
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

  // Check if mask has content
  const hasMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return false;
    }

    // Use consistent context attributes as MaskCanvas
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      console.log("hasMask: No canvas context");
      return false;
    }

    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) {
          return true; // Found content
        }
      }

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
      // 1. Get mask file - no arguments needed now
      const maskFile = isMasking && maskIsPresent ? await getMaskFile() : null;

      if (isMasking && maskIsPresent && !maskFile) {
        toast.error("Failed to process mask image.");
        setState("idle");
        return;
      }

      // 2. Call client edit method
      const result = await imageGenClient.edit({
        prompt,
        imageKeys: images,
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

        setIsMasking(false);
        setSelectedImage(key);
        setPrompt("");
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
    <div className="flex items-center justify-center w-full px-4 py-8">
      <div className="flex flex-col w-full max-w-5xl gap-3">
        {/* Generations */}
        {memoizedGenerations?.length && memoizedGenerations.length > 0 && (
          <Generations generations={memoizedGenerations} />
        )}

        <div className="flex items-center justify-between gap-3">
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
            {/* Mask Button */}
            {selectedImage && isSelectedImagePrimary && (
              <MaskButton canvasRef={canvasRef} selectedImage={selectedImage} />
            )}
          </div>
          {/* Right-side buttons */}
          <ImageList selectedImageKey={selectedImage ?? ""} />
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
                  disabled={
                    !prompt.trim() || !selectedImage || !isSelectedImagePrimary
                  }
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
