"use client";

import { useAttachmentPreviewModal } from "@/hooks/ui/use-attachment-preview-modal";
import { getAttachmentType } from "@firebuzz/utils";
import type { Message as MessageType } from "ai";
import { motion } from "motion/react";
import Image from "next/image";

// Helper type for attachments
export interface Attachment {
  name?: string;
  contentType?: string;
  url: string;
  size?: number;
}

interface AttachmentsProps {
  message: MessageType;
}

// Function to get attachments from message
export const getAttachments = (message: MessageType): Attachment[] => {
  // Check for experimental_attachments (fresh messages)
  if (
    message.experimental_attachments &&
    message.experimental_attachments.length > 0
  ) {
    return message.experimental_attachments.filter((attachment) =>
      attachment.contentType?.startsWith("image/")
    );
  }

  // Check for stored attachments from database
  // @ts-ignore - attachments might be in metadata or directly on the message
  if (message.attachments?.length > 0) {
    // @ts-ignore
    return message.attachments;
  }

  // @ts-ignore - attachments might be in metadata
  if (message.metadata?.attachments?.length > 0) {
    // @ts-ignore
    return message.metadata.attachments;
  }

  return [];
};

export const Attachments = ({ message }: AttachmentsProps) => {
  const attachments = getAttachments(message);
  const [, setAttachmentState] = useAttachmentPreviewModal();
  const placement = "chat-attachment";

  if (attachments.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="grid max-w-2xl grid-cols-5 gap-2">
        {attachments.map((attachment) => {
          const key = `${attachment.url.split(".com/")[1]}?messageId=${message.id}`;
          return (
            <motion.div
              className="cursor-pointer"
              layoutId={`media-${key}-${placement}`}
              key={key}
              onClick={() => {
                setAttachmentState({
                  key,
                  type: getAttachmentType(attachment.contentType ?? ""),
                  placement,
                });
              }}
            >
              <div className="relative w-full overflow-hidden border rounded-md aspect-square border-border">
                <Image
                  unoptimized
                  src={attachment.url}
                  alt={attachment.name ?? "Image"}
                  fill
                  className="object-cover object-center"
                />
              </div>
              {attachment.name && (
                <p className="mt-1 text-xs truncate text-muted-foreground">
                  {attachment.name}
                </p>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
