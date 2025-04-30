import { useAIImageModal } from "@/hooks/ui/use-ai-image-modal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@firebuzz/ui/components/ui/dialog";
import { GenerateImage } from "./generate-image";
import { MiniGallery } from "./mini-gallery";

export const AIImageModal = () => {
  const { isOpen, setIsOpen } = useAIImageModal();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-screen-xl max-h-[90vh] h-full p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Generate Image</DialogTitle>
          <DialogDescription>Generate an image using AI.</DialogDescription>
        </DialogHeader>

        {/* Main Container */}
        <div className="grid h-full max-h-full grid-cols-12 overflow-hidden">
          {/* Generation Container */}
          <GenerateImage />
          <MiniGallery />
        </div>
      </DialogContent>
    </Dialog>
  );
};
