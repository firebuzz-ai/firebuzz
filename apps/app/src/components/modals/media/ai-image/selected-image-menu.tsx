import { useAIImageModal } from "@/hooks/ui/use-ai-image-modal";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import {
  Asterisk,
  CornerDownRight,
  Plus,
  Trash2,
} from "@firebuzz/ui/icons/lucide";
import { motion } from "motion/react";
import { useMemo } from "react";
export const SelectedImageMenu = () => {
  console.log("selectedImageMenu");
  const {
    selectedImage,
    images,
    onInsert,
    setImages,
    setSelectedImage,
    setIsOpen,
  } = useAIImageModal();

  const imageType = useMemo(() => {
    return selectedImage && images.includes(selectedImage)
      ? "input"
      : "generation";
  }, [selectedImage, images]);

  const isPrimary = useMemo(() => {
    return selectedImage && images.includes(selectedImage)
      ? images.indexOf(selectedImage) === 0
      : false;
  }, [selectedImage, images]);

  const isInsertable = useMemo(() => {
    return imageType === "generation" && onInsert;
  }, [imageType, onInsert]);

  const deleteImageHandler = () => {
    const newImages = images.filter((image) => image !== selectedImage);
    setImages(newImages);
    setSelectedImage(newImages[0]);
  };

  const makePrimaryHandler = (key: string) => {
    if (imageType === "generation") return;
    setImages((prev) => {
      const filteredImages = prev.filter((image) => image !== key);
      return [key, ...filteredImages];
    });
  };

  const addToInputHandler = (key: string) => {
    setImages((prev) => {
      if (prev.length >= 5) {
        const poppedImages = prev.slice(0, -1);
        return [...poppedImages, key];
      }
      return [...prev, key];
    });
  };

  const insertHandler = (key: string) => {
    onInsert?.(key);
    setIsOpen(false);
  };

  console.log("imageType", imageType);
  console.log("selectedImage", selectedImage);

  if (imageType === "input" && selectedImage) {
    return (
      <motion.div
        key={`selected-image-menu-${selectedImage}`}
        className="absolute left-0 right-0 flex items-center justify-center gap-2 pointer-events-none bottom-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
      >
        {/* Delete Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="pointer-events-auto"
              variant="outline"
              size="iconSm"
              onClick={deleteImageHandler}
            >
              <Trash2 className="!size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete</TooltipContent>
        </Tooltip>
        {/* Make Primary Button */}
        {!isPrimary && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="pointer-events-auto"
                variant="outline"
                size="iconSm"
                onClick={() => makePrimaryHandler(selectedImage)}
              >
                <Asterisk className="!size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Make Primary</TooltipContent>
          </Tooltip>
        )}
      </motion.div>
    );
  }

  if (imageType === "generation" && selectedImage) {
    return (
      <motion.div
        key={`selected-image-menu-${selectedImage}`}
        className="absolute left-0 right-0 flex items-center justify-center gap-2 pointer-events-none bottom-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
      >
        {/* Delete Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="pointer-events-auto"
              variant="outline"
              size="iconSm"
              onClick={deleteImageHandler}
            >
              <Trash2 className="!size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete</TooltipContent>
        </Tooltip>
        {/* Insert Button */}
        {isInsertable && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="pointer-events-auto"
                variant="outline"
                size="sm"
                onClick={() => insertHandler(selectedImage)}
              >
                Insert
                <CornerDownRight className="!size-3.5" />
                <ButtonShortcut>⌘I</ButtonShortcut>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Insert</TooltipContent>
          </Tooltip>
        )}
        {/* Add to Input Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="pointer-events-auto"
              variant="outline"
              size="iconSm"
              onClick={() => addToInputHandler(selectedImage)}
            >
              <Plus className="!size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add to Input</TooltipContent>
        </Tooltip>
      </motion.div>
    );
  }

  return null;
};
