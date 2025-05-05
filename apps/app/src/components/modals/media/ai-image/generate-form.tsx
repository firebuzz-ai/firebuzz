import { useAIImageModal } from "@/hooks/ui/use-ai-image-modal";
import { useRef } from "react";
import { GenerateImageFormInput } from "./form-input";
import { ImagePreviewWithEdit } from "./image-preview-with-edit";

interface GenerateFormProps {
  setState: React.Dispatch<React.SetStateAction<"idle" | "generating">>;
}

export const GenerateForm = ({ setState }: GenerateFormProps) => {
  const {
    selectedImageSize,
    selectedImageQuality,
    setSelectedImageSize,
    setSelectedImageQuality,
    isMasking,
  } = useAIImageModal();

  const canvasRef = useRef<HTMLCanvasElement>(null);

  return (
    <div className="flex flex-col w-full h-full max-h-full overflow-hidden">
      <ImagePreviewWithEdit canvasRef={canvasRef} isMasking={isMasking} />
      <GenerateImageFormInput
        selectedSize={selectedImageSize}
        setSelectedSize={setSelectedImageSize}
        canvasRef={canvasRef}
        setState={setState}
        quality={selectedImageQuality}
        setQuality={setSelectedImageQuality}
      />
    </div>
  );
};
