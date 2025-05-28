import { useNewAudienceModal } from "@/hooks/ui/use-new-audience-modal";
import { ConvexError } from "@firebuzz/convex";
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
import { useState } from "react";
import { AudienceForm } from "./audience-form";

export const NewAudienceModal = () => {
  const [state, setState] = useNewAudienceModal();
  const [isCreating, setIsCreating] = useState(false);
  const [saveHandler, setSaveHandler] = useState<(() => Promise<void>) | null>(
    null
  );

  /*   useHotkeys(
    "meta+s",
    async () => {
      await handleCreate();
    },
    {
      preventDefault: true,
      enabled: state.createMemoryItem ?? false,
    }
  ); */

  const handleCreate = async () => {
    if (!saveHandler) return;

    try {
      setIsCreating(true);
      await saveHandler();
      // Close modal on success
      setState(null);
    } catch (error) {
      console.error(error);
      if (error instanceof ConvexError) {
        toast.error("Failed to create audience.", {
          description: error.data,
          id: "create-audience",
        });
      } else {
        toast.error("Failed to create audience.", {
          description: "Please try again.",
          id: "create-audience",
        });
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog
      open={state.create ?? false}
      onOpenChange={(value) => {
        setState(
          value
            ? {
                create: true,
              }
            : null
        );
      }}
    >
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="sm:max-w-2xl w-full h-[70vh] flex flex-col !gap-0 !p-0"
      >
        <DialogHeader className="px-4 py-4 border-b">
          <div className="w-full">
            <DialogTitle>New Audience</DialogTitle>
            <DialogDescription>
              Create a new audience for your brand.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex flex-col flex-1 h-full overflow-hidden">
          <AudienceForm
            setSaveHandler={setSaveHandler}
            isCreating={isCreating}
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t">
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={handleCreate}
            disabled={isCreating || !saveHandler}
          >
            {isCreating ? (
              <Spinner size="xs" />
            ) : (
              <>
                Create <ButtonShortcut>⌘S</ButtonShortcut>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
