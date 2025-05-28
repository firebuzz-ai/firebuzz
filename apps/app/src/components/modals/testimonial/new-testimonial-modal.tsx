import { useNewTestimonialModal } from "@/hooks/ui/use-new-testimonial-modal";
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
import { TestimonialForm } from "./testimonial-form";

export const NewTestimonialModal = () => {
  const [state, setState] = useNewTestimonialModal();
  const [isCreating, setIsCreating] = useState(false);
  const [saveHandler, setSaveHandler] = useState<(() => Promise<void>) | null>(
    null
  );

  const handleCreate = async () => {
    if (!saveHandler) return;

    try {
      setIsCreating(true);
      await saveHandler();
      // Close modal on success
      setState({ create: false });
    } catch (error) {
      console.error(error);
      if (error instanceof ConvexError) {
        toast.error("Failed to create testimonial.", {
          description: error.data,
          id: "create-testimonial",
        });
      } else {
        toast.error("Failed to create testimonial.", {
          description: "Please try again.",
          id: "create-testimonial",
        });
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setState({ create: false });
  };

  const isOpen = state.create ?? false;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl w-full flex flex-col !gap-0 !p-0">
        <DialogHeader className="px-4 py-4 border-b">
          <DialogTitle>Create New Testimonial</DialogTitle>
          <DialogDescription>
            Add a new customer testimonial to showcase feedback and build trust
            with potential customers.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 max-h-full py-4 overflow-hidden">
          <TestimonialForm setSaveHandler={setSaveHandler} />
        </div>

        {/* Footer */}
        <div className="p-4 border-t">
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={handleCreate}
            disabled={isCreating}
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
