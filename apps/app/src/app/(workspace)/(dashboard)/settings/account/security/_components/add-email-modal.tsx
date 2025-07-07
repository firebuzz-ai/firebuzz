"use client";

import { useAddEmailModal } from "@/hooks/ui/use-add-email-modal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@firebuzz/ui/components/ui/dialog";
import { EmailForm } from "./email-form";

export const AddEmailModal = () => {
  const [state, setState] = useAddEmailModal();

  const handleClose = () => {
    setState(null);
  };

  return (
    <Dialog
      open={state?.create ?? false}
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
        className="sm:max-w-md w-full flex flex-col !gap-0 !p-0"
      >
        <DialogHeader className="px-4 py-4 border-b">
          <div className="w-full">
            <DialogTitle className="flex gap-2 items-center">
              Add email address
            </DialogTitle>
            <DialogDescription>
              Add a new email address to your account.
            </DialogDescription>
          </div>
        </DialogHeader>

        <EmailForm onSuccess={handleClose} />
      </DialogContent>
    </Dialog>
  );
};
