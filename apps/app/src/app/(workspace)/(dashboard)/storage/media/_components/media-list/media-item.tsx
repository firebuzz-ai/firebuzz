import type { Doc } from "@firebuzz/convex";
import { envCloudflarePublic } from "@firebuzz/env";
import { Button } from "@firebuzz/ui/components/ui/button";
import {
  FileAudio,
  FileVideo,
  Image as ImageIcon,
} from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import { formatRelativeTimeShort } from "@firebuzz/utils";
import { motion } from "motion/react";
import Image from "next/image";
import { parseAsString, useQueryStates } from "nuqs";
import type { Dispatch, SetStateAction } from "react";

interface MediaItemProps {
  media: Doc<"media">;
  selected: string[];
  setSelected: Dispatch<SetStateAction<string[]>>;
}

const MediaThumbnail = ({ media }: { media: Doc<"media"> }) => {
  const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();
  const mediaUrl = `${NEXT_PUBLIC_R2_PUBLIC_URL}/${media.key}`;

  // Check media type from type property
  const mediaType = media.type || "image";

  if (mediaType === "image") {
    return (
      <div className="relative flex items-center justify-center w-full h-full rounded-md bg-background-subtle">
        <Image
          unoptimized
          src={mediaUrl}
          alt={media.name}
          fill
          sizes="(max-width: 768px) 33vw, (max-width: 1200px) 16vw"
          className="z-0 object-cover transition-all rounded-md"
          priority={false}
        />
      </div>
    );
  }

  if (mediaType === "video") {
    return (
      <div className="flex items-center justify-center w-full h-full rounded-md bg-background-subtle">
        <FileVideo className="size-10 text-muted-foreground" />
      </div>
    );
  }

  if (mediaType === "audio") {
    return (
      <div className="flex items-center justify-center w-full h-full rounded-md bg-background-subtle">
        <FileAudio className="size-10 text-muted-foreground" />
      </div>
    );
  }

  // Fallback
  return (
    <div className="flex items-center justify-center w-full h-full rounded-md bg-background-subtle">
      <ImageIcon className="size-10 text-muted-foreground" />
    </div>
  );
};

export const MediaItem = ({ media, selected, setSelected }: MediaItemProps) => {
  const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();
  const [_mediaState, setMediaState] = useQueryStates(
    {
      mediaId: parseAsString,
      publicUrl: parseAsString,
      mediaType: parseAsString,
    },
    {
      urlKeys: {
        mediaId: "id",
        publicUrl: "url",
        mediaType: "type",
      },
    }
  );
  const isSelected = selected.includes(media._id);

  const handleSelection = () => {
    setSelected((prev) =>
      prev.includes(media._id)
        ? prev.filter((id) => id !== media._id)
        : [...prev, media._id]
    );
  };

  const handleDetailClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMediaState({
      mediaId: media._id,
      publicUrl: `${NEXT_PUBLIC_R2_PUBLIC_URL}/${media.key}`,
      mediaType: media.type,
    });
  };

  return (
    <motion.div
      onClick={handleSelection}
      key={media._id}
      layoutId={`media-${media._id}`}
      className={cn(
        "flex flex-col relative bg-background rounded-md border border-border bg-muted overflow-hidden cursor-default transition-colors duration-100 ease-in-out",
        isSelected && "border-brand"
      )}
    >
      {/* Media preview */}
      <div
        className={cn(
          "relative h-full h-40",
          media.isArchived && "opacity-50 grayscale"
        )}
      >
        {/* Selected Overlay */}
        {isSelected && (
          <div className="absolute inset-0 z-10 rounded-md bg-brand/10" />
        )}

        <div className="w-full h-full p-3">
          <MediaThumbnail media={media} />
        </div>
      </div>

      {/* Media info */}
      <div className="flex flex-col p-3 space-y-1">
        <div className="flex items-start justify-between">
          <h3 className="flex-1 text-sm font-medium truncate">{media.name}</h3>
        </div>

        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-muted-foreground">
            {formatRelativeTimeShort(media._creationTime)}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="px-3 text-xs h-7"
            onClick={handleDetailClick}
          >
            Detail
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
