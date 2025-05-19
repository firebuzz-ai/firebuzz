"use client";

import { useSheet } from "@/hooks/ui/use-sheet";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import { ScrollArea } from "@firebuzz/ui/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@firebuzz/ui/components/ui/sheet";
import { useCallback, useState } from "react";
import { SettingsTab } from "./tabs/settings/settings";

export const KnowledgeBaseSettingsSheet = () => {
  const { isOpen, setIsOpen } = useSheet("knowledge-base-settings");
  const [isSaving, setIsSaving] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [saveHandler, setSaveHandler] = useState<(() => Promise<void>) | null>(
    null
  );

  const handleSave = useCallback(async () => {
    if (!saveHandler || !unsavedChanges) return;

    try {
      setIsSaving(true);
      await saveHandler();
      setUnsavedChanges(false);
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setIsSaving(false);
    }
  }, [saveHandler, unsavedChanges, setIsOpen]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="sm:max-w-[600px]">
        <div className="flex flex-col w-full h-full">
          <SheetHeader className="sr-only">
            <SheetTitle>Knowledge Base Settings</SheetTitle>
            <SheetDescription>
              Manage the order, names, and descriptions of your knowledge bases.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col flex-1 max-h-full overflow-hidden">
            <ScrollArea className="flex-1">
              <SettingsTab
                setSaveHandler={setSaveHandler}
                setUnsavedChanges={setUnsavedChanges}
              />
            </ScrollArea>
          </div>

          <SheetFooter className="p-2 border-t">
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              Cancel <ButtonShortcut>Esc</ButtonShortcut>
            </Button>
            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={handleSave}
              disabled={!unsavedChanges || isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
              <ButtonShortcut>⌘S</ButtonShortcut>
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
};
