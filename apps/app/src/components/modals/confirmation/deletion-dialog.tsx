"use client";

import { InfoBox } from "@firebuzz/ui/components/reusable/info-box";
import { Button } from "@firebuzz/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@firebuzz/ui/components/ui/dialog";
import { Input } from "@firebuzz/ui/components/ui/input";
import { Label } from "@firebuzz/ui/components/ui/label";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { useState } from "react";

interface DeletionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmationText: string;
  isLoading?: boolean;
}

export const DeletionDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmationText,
  isLoading = false,
}: DeletionDialogProps) => {
  const [inputValue, setInputValue] = useState("");

  const handleClose = () => {
    setInputValue("");
    onClose();
  };

  const handleConfirm = () => {
    if (inputValue === confirmationText) {
      onConfirm();
    }
  };

  const isConfirmationValid = inputValue === confirmationText;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex gap-3 items-center">
            <div>
              <DialogTitle className="text-left">{title}</DialogTitle>
              <DialogDescription className="text-left">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <InfoBox variant="destructive">
            <p>
              This action cannot be undone. This will permanently delete your
              data.
            </p>
          </InfoBox>

          <div className="space-y-2">
            <Label htmlFor="confirmation-input" className="text-sm font-medium">
              To confirm, type{" "}
              <span className="font-mono text-primary font-bold bg-subtle-background border px-2 py-0.5 rounded-md">
                {confirmationText}
              </span>{" "}
              below:
            </Label>
            <Input
              id="confirmation-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={confirmationText}
              className="h-8 font-mono"
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmationValid || isLoading}
          >
            {isLoading ? (
              <div className="flex gap-2 items-center">
                <Spinner size="xs" variant="destructive" />
                Deleting...
              </div>
            ) : (
              "Delete"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
