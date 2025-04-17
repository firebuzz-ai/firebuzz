import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { parseAsString, useQueryStates } from "nuqs";
import { DetailsSidebar } from "./sidebar";

const MediaRenderer = ({
  mediaUrl,
  mediaType,
}: {
  mediaUrl: string;
  mediaType: string;
}) => {
  if (mediaType.startsWith("image")) {
    return (
      <Image
        src={mediaUrl}
        alt="Media content"
        fill
        sizes="(max-width: 1200px) 100vw"
        className="object-contain"
        priority={true}
      />
    );
  }

  if (mediaType.startsWith("video")) {
    return (
      <video
        src={mediaUrl}
        controls
        className="object-contain w-full h-full"
        autoPlay
      >
        <track kind="captions" label="English" />
        Your browser does not support the video tag.
      </video>
    );
  }

  if (mediaType.startsWith("audio")) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full">
        <div className="p-8 mb-4 bg-accent rounded-xl">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </div>
        <audio src={mediaUrl} controls className="w-3/4 max-w-md" autoPlay>
          <track kind="captions" label="English" />
          Your browser does not support the audio tag.
        </audio>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center">
      Unsupported media type
    </div>
  );
};

export const MediaDetailsModal = () => {
  const [{ mediaId, publicUrl, mediaType }, setMediaState] = useQueryStates(
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

  const handleClose = () => {
    setMediaState(null);
  };

  return (
    <AnimatePresence initial={false}>
      {mediaId && publicUrl && (
        <motion.div
          layout
          className="fixed inset-0 z-50 bg-background/95"
          onClick={handleClose}
        >
          <motion.div
            layout
            className="container flex items-center justify-center h-full max-w-7xl"
          >
            <motion.div
              layoutId={`media-${mediaId}`}
              transition={{
                duration: 0.3,
                ease: "easeOut",
              }}
              className="flex bg-background border border-border rounded-lg shadow-lg overflow-hidden h-full max-h-[90vh] w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative flex-1 p-2">
                <MediaRenderer
                  mediaUrl={publicUrl}
                  mediaType={mediaType ?? "image"}
                />
              </div>

              <DetailsSidebar />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
