"use client";

import type { GeneratedImage } from "@/hooks/ui/use-ai-image-modal";
import { useAIImageModal } from "@/hooks/ui/use-ai-image-modal";
import { envCloudflarePublic } from "@firebuzz/env";
import { cn } from "@firebuzz/ui/lib/utils";
import { motion } from "motion/react";
import Image from "next/image";

const GenrationItem = ({ generation }: { generation: GeneratedImage }) => {
  const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();
  const { setSelectedImage, selectedImage, setIsMasking } = useAIImageModal();

  const isSelected = selectedImage?.key === generation.imageKey;

  const onSelectHandler = () => {
    setSelectedImage({
      key: generation.imageKey,
      name: generation.name,
      contentType: generation.contentType,
      size: generation.fileSize,
    });
    setIsMasking(false);
  };

  return (
    <div
      onClick={onSelectHandler}
      className={cn(
        "relative flex items-center overflow-hidden rounded-md cursor-pointer size-16",
        isSelected && "ring-2 ring-muted-foreground"
      )}
    >
      <Image
        unoptimized
        src={`${NEXT_PUBLIC_R2_PUBLIC_URL}/${generation.imageKey}`}
        alt="AI Image"
        fill
        className="object-cover rounded-md"
      />
    </div>
  );
};

export const Generations = ({
  generations,
}: {
  generations: GeneratedImage[];
}) => {
  return (
    <motion.div className="space-y-2">
      <div className="text-sm text-muted-foreground">Recent Generations</div>
      <div className="flex items-center gap-2">
        {generations?.map((generation) => (
          <GenrationItem key={generation.imageKey} generation={generation} />
        ))}
      </div>
    </motion.div>
  );
};
