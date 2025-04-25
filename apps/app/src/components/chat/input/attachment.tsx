import { useAttachmentPreviewModal } from "@/hooks/ui/use-attachment-preview-modal";
import { attachmentsAtom } from "@/lib/workbench/atoms";
import { Button } from "@firebuzz/ui/components/ui/button";
import {
  FileAudio,
  FileText,
  FileVideo,
  Loader2,
  X,
} from "@firebuzz/ui/icons/lucide";
import { getAttachmentType } from "@firebuzz/utils";
import { useAtom } from "jotai";
import { motion } from "motion/react";

import { AnimatePresence } from "motion/react";
import Image from "next/image";

export const Attachment = ({
  isUploading,
  clearAttachments,
}: {
  isUploading: boolean;
  clearAttachments: () => void;
}) => {
  const [, setAttachmentState] = useAttachmentPreviewModal();
  const [attachments, setAttachments] = useAtom(attachmentsAtom);

  const removeAttachment = (index: number) => {
    if (attachments) {
      // If there is only one attachment, clear the attachment state
      if (attachments.length === 1) {
        console.log("clearing attachments");
        clearAttachments();
      }

      setAttachments((prev) =>
        prev ? prev.filter((_, i) => i !== index) : []
      );
    }
  };

  if (!attachments || attachments.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      {isUploading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className="px-4 pb-2"
        >
          <div className="flex items-center gap-2 p-2 rounded-md bg-secondary/20">
            <div className="flex items-center justify-center w-16 h-16 border rounded-md border-border">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Uploading media...</p>
              <p className="text-xs text-muted-foreground">Please wait</p>
            </div>
          </div>
        </motion.div>
      )}

      {!isUploading && attachments && attachments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className="px-4 pb-2"
        >
          <div className="relative px-4 py-3 border rounded-md bg-secondary/20">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                clearAttachments();
              }}
              className="absolute top-2 right-2"
            >
              <X className="size-3" />
            </Button>
            <div className="flex flex-wrap gap-2">
              {attachments.map((attachment, index) => {
                const key = attachment.url.split(".com/")[1];
                const placement = "chat-input";
                return (
                  <div key={key} className="relative group max-w-20">
                    <motion.div
                      key={`media-${key}-item`}
                      initial={{ opacity: 0, y: 10 + index * 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 + index * 10 }}
                      transition={{ duration: 0.2 }}
                      layoutId={`media-${key}-${placement}`}
                      onClick={() => {
                        setAttachmentState({
                          key,
                          type: getAttachmentType(attachment.contentType),
                          placement,
                        });
                      }}
                      className="relative overflow-hidden border rounded-md cursor-pointer aspect-square size-20 border-border"
                    >
                      {getAttachmentType(attachment.contentType) === "image" ? (
                        <Image
                          src={attachment.url}
                          alt={attachment.name}
                          fill
                          className="object-cover"
                        />
                      ) : getAttachmentType(attachment.contentType) ===
                        "video" ? (
                        <div className="flex items-center justify-center w-full h-full bg-background-subtle">
                          <FileVideo className="size-10 text-muted-foreground" />
                        </div>
                      ) : getAttachmentType(attachment.contentType) ===
                        "audio" ? (
                        <div className="flex items-center justify-center w-full h-full bg-background-subtle">
                          <FileAudio className="size-10 text-muted-foreground" />
                        </div>
                      ) : getAttachmentType(attachment.contentType) ===
                        "pdf" ? (
                        <div className="flex items-center justify-center w-full h-full bg-background-subtle">
                          <FileText className="size-10 text-muted-foreground" />
                        </div>
                      ) : null}
                      {/* Overlay on Hover */}
                      <div className="absolute inset-0 transition-opacity duration-200 opacity-0 bg-black/50 group-hover:opacity-100">
                        <Button
                          variant="secondary"
                          className="absolute top-1 right-1 !size-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeAttachment(index);
                          }}
                        >
                          <X className="size-3" />
                        </Button>
                      </div>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
