import type { Doc } from "@firebuzz/convex";
import { envCloudflarePublic } from "@firebuzz/env";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { buttonVariants } from "@firebuzz/ui/components/ui/button";
import { ExternalLink, EyeOff } from "@firebuzz/ui/icons/lucide";
import { AnimatePresence, motion } from "motion/react";
import { parseAsString, parseAsStringEnum, useQueryStates } from "nuqs";
import { useHotkeys } from "react-hotkeys-hook";
import { PDFViewer } from "./pdf-viewer";
import { DetailsSidebar } from "./sidebar";

const DocumentRenderer = ({
  documentUrl,
  documentType,
}: {
  documentUrl: string;
  documentType: Doc<"documents">["type"];
}) => {
  // For security and browser compatibility, only certain types are directly embeddable.
  // PDFs are generally safe. For other types, consider backend conversion or a placeholder.
  if (documentType === "pdf") {
    return (
      <div className="w-full h-full p-10">
        <PDFViewer src={documentUrl} />
      </div>
    );
  }

  // For other document types, direct iframe embedding can be tricky or insecure.
  // Showing a "preview not available" message or an icon is a safer default.
  // You could extend this to support more types if you have a secure way to render them.
  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-muted/30">
      <div className="flex items-center justify-center p-4 mb-4 border rounded-full bg-muted">
        <EyeOff className="size-8 animate-pulse" />
      </div>
      <div className="mb-6 text-center">
        <p className="text-lg font-bold">Preview Not Available</p>
        <div className="max-w-sm mt-1 text-sm">
          Direct preview for{" "}
          <Badge variant="outline" className="uppercase">
            {documentType}
          </Badge>{" "}
          files is not currently supported.
        </div>
      </div>
      <a
        href={documentUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        Open in New Tab <ExternalLink className="size-4" />
      </a>
    </div>
  );
};

export const DocumentDetailsModal = () => {
  const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();
  const documentTypes = ["md", "html", "txt", "pdf", "csv", "docx"] as const;
  const [{ documentId, documentKey, documentType }, setDocumentState] =
    useQueryStates(
      {
        documentId: parseAsString,
        documentKey: parseAsString,
        documentType: parseAsStringEnum([...documentTypes]),
      },
      {
        urlKeys: {
          documentId: "docId",
          documentKey: "docKey",
          documentType: "docType",
        },
      }
    );

  const handleClose = () => {
    setDocumentState(null);
  };

  useHotkeys("esc", handleClose);

  const fullDocumentUrl = documentKey
    ? `${NEXT_PUBLIC_R2_PUBLIC_URL}/${documentKey}`
    : null;

  return (
    <AnimatePresence initial={false}>
      {documentId && fullDocumentUrl && documentType && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/80"
          exit={{ opacity: 0, transition: { duration: 0.2, ease: "easeOut" } }}
          onClick={handleClose}
        >
          <motion.div className="container flex items-center justify-center h-full max-w-7xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{
                duration: 0.2,
                ease: "easeOut",
              }}
              className="flex bg-background border border-border rounded-lg shadow-lg overflow-hidden h-full max-h-[90vh] w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative flex-1 p-2">
                <DocumentRenderer
                  documentUrl={fullDocumentUrl}
                  documentType={documentType}
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
