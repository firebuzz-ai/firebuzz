import { SimpleEditor } from "@/components/tiptap/tiptap-templates/simple/simple-editor";
import { useEditMemoryItem } from "@/hooks/ui/use-edit-memory-item";
import "@/styles/tiptap/_keyframe-animations.scss";
import "@/styles/tiptap/_variables.scss";
import {
  ConvexError,
  type Id,
  api,
  useMutation,
  useUploadFile,
} from "@firebuzz/convex";
import { envCloudflarePublic } from "@firebuzz/env";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@firebuzz/ui/components/ui/dialog";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { toast } from "@firebuzz/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import type { Editor } from "@tiptap/react";
import { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

export const EditMemoryItemModal = () => {
  const [state, setState] = useEditMemoryItem();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();

  const {
    data: initialContent,
    isLoading: isFetching,
    error,
  } = useQuery({
    queryKey: ["initialContent", state.documentKey],
    queryFn: async () => {
      const response = await fetch(
        `${NEXT_PUBLIC_R2_PUBLIC_URL}/${state.documentKey}`
      );
      return response.json();
    },
  });

  const uploadFile = useUploadFile(api.helpers.r2);
  const updateMemoryItem = useMutation(
    api.collections.storage.documents.mutations.updateMemoryItem // Assuming this mutation exists
  );

  useHotkeys(
    "meta+s",
    async () => {
      await handleUpdate();
    },
    {
      preventDefault: true,
      enabled: state.editMemoryItem ?? false,
    }
  );

  const handleUpdate = async () => {
    if (!editor) {
      toast.error("Editor is not initialized.", {
        description: "Please try again.",
        id: "update-memory-item",
      });
      return;
    }
    if (!state.documentKey) {
      toast.error("Document key is missing.", {
        description: "Please try again.",
        id: "update-memory-item",
      });
      return;
    }

    if (!state.documentId) {
      toast.error("Document ID is missing.", {
        description: "Please try again.",
        id: "update-memory-item",
      });
      return;
    }

    const content = editor.storage.markdown.getMarkdown();
    const jsonContent = editor.getJSON();
    if (content.trim() === "") {
      toast.error("You can't save an empty memory item.", {
        description: "Please add some content to the memory item.",
        id: "update-memory-item",
      });
      return;
    }

    // Check the content is same as the initial content
    if (content === initialContent) {
      toast.error("You haven't made any changes to the memory item.", {
        description: "Please try again.",
        id: "update-memory-item",
      });
      return;
    }

    try {
      setIsLoading(true);
      const fileName = `memory-item-${Date.now()}.json`;
      const file = new File([JSON.stringify(jsonContent)], fileName, {
        type: "application/json",
      });

      const newKey = await uploadFile(file);

      await updateMemoryItem({
        originalKey: state.documentKey,
        newKey,
        documentId: state.documentId as Id<"documents">,
        name: fileName,
        content,
        size: file.size,
      });

      toast.success("Memory item updated successfully!", {
        description: "Re-indexing memory item...",
        id: "update-memory-item",
      });

      setState(null);
    } catch (error) {
      console.error(error);
      if (error instanceof ConvexError) {
        toast.error("Failed to update memory item.", {
          description: error.data,
          id: "update-memory-item",
        });
      } else {
        toast.error("Failed to update memory item.", {
          description: "Please try again.",
          id: "update-memory-item",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!state.editMemoryItem) return null;

  return (
    <Dialog
      open={state.editMemoryItem ?? false}
      onOpenChange={(value) => {
        setState(value ? { editMemoryItem: true } : null);
      }}
    >
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="sm:max-w-2xl w-full h-[70vh] flex flex-col !gap-0 !p-0"
      >
        <DialogHeader className="px-4 py-4">
          <div className="w-full max-w-xl mx-auto">
            <DialogTitle>Edit Memory Item</DialogTitle>
            <DialogDescription>
              Update the content of your memory item.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex flex-col flex-1 h-full overflow-hidden">
          {(isFetching || !initialContent) && !error ? (
            <div className="flex items-center justify-center flex-1">
              <Spinner size="sm" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center flex-1">
              <p>Error loading memory item.</p>
            </div>
          ) : (
            <SimpleEditor
              key={state.documentKey} // Ensure re-render when documentKey changes
              initialContent={initialContent}
              setEditor={setEditor}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pt-4 pb-6">
          <div className="flex items-center justify-between max-w-xl gap-4 mx-auto">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={handleUpdate}
              disabled={isLoading || isFetching}
            >
              {isLoading ? (
                <Spinner size="xs" />
              ) : (
                <>
                  Update <ButtonShortcut>⌘S</ButtonShortcut>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
