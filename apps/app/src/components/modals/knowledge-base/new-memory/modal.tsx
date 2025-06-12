import content from "@/components/modals/knowledge-base/new-memory/initial-content.json";
import { SimpleEditor } from "@/components/tiptap/tiptap-templates/simple/simple-editor";
import { useNewMemoryItem } from "@/hooks/ui/use-new-memory-item";
import "@/styles/tiptap/_keyframe-animations.scss";
import "@/styles/tiptap/_variables.scss";
import {
  ConvexError,
  type Id,
  api,
  useMutation,
  useUploadFile,
} from "@firebuzz/convex";
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
import type { Editor } from "@tiptap/react";
import { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

export const NewMemoryItemModal = () => {
  const [state, setState] = useNewMemoryItem();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const uploadFile = useUploadFile(api.components.r2);
  const createMemoryItem = useMutation(
    api.collections.storage.documents.mutations.createMemoryItem
  );

  useHotkeys(
    "meta+s",
    async () => {
      await handleCreate();
    },
    {
      preventDefault: true,
      enabled: state.createMemoryItem ?? false,
    }
  );

  const handleCreate = async () => {
    if (!editor) {
      toast.error("You can't create an empty memory item.", {
        description: "Please add some content to the memory item.",
        id: "create-memory-item",
      });
      return;
    }
    if (!state.knowledgeBase) {
      toast.error("You can't create a memory item without a knowledge base.", {
        description: "Please select a knowledge base.",
        id: "create-memory-item",
      });
      return;
    }
    const content = editor.storage.markdown.getMarkdown();
    const jsonContent = editor.getJSON();
    if (content.trim() === "") {
      toast.error("You can't create an empty memory item.", {
        description: "Please add some content to the memory item.",
        id: "create-memory-item",
      });
      return;
    }
    try {
      setIsLoading(true);
      // Create MD file with content
      const fileName = `memory-item-${Date.now()}.json`;
      const file = new File([JSON.stringify(jsonContent)], fileName, {
        type: "application/json",
      });

      // Upload file to R2
      const key = await uploadFile(file);

      // Create memory item
      await createMemoryItem({
        key,
        name: fileName,
        content,
        knowledgeBase: state.knowledgeBase as Id<"knowledgeBases">,
        size: file.size,
      });

      // Close modal
      setState(null);
    } catch (error) {
      console.error(error);
      if (error instanceof ConvexError) {
        toast.error("Failed to create memory item.", {
          description: error.data,
          id: "create-memory-item",
        });
      } else {
        toast.error("Failed to create memory item.", {
          description: "Please try again.",
          id: "create-memory-item",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={state.createMemoryItem ?? false}
      onOpenChange={(value) => {
        setState(
          value
            ? {
                createMemoryItem: true,
              }
            : null
        );
      }}
    >
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="sm:max-w-2xl w-full h-[70vh] flex flex-col !gap-0 !p-0"
      >
        <DialogHeader className="px-4 py-4">
          <div className="w-full max-w-xl mx-auto">
            <DialogTitle>New Memory Item</DialogTitle>
            <DialogDescription>
              Create a new memory item for your knowledge base.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex flex-col flex-1 h-full overflow-hidden">
          <SimpleEditor initialContent={content} setEditor={setEditor} />
        </div>

        {/* Footer */}
        <div className="px-4 pt-4 pb-6">
          <div className="flex items-center justify-between max-w-xl gap-4 mx-auto">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={handleCreate}
              disabled={isLoading}
            >
              {isLoading ? (
                <Spinner size="xs" />
              ) : (
                <>
                  Create <ButtonShortcut>⌘S</ButtonShortcut>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
