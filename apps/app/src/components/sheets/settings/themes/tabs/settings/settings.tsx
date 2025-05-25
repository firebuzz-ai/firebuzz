"use client";

import { useNewThemeModal } from "@/hooks/ui/use-new-theme-modal";
import type { Id } from "@firebuzz/convex";
import { api, useCachedRichQuery, useMutation } from "@firebuzz/convex";
import { InfoBox } from "@firebuzz/ui/components/reusable/info-box";
import { Accordion } from "@firebuzz/ui/components/ui/accordion";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { Plus } from "@firebuzz/ui/icons/lucide";
import { toast } from "@firebuzz/ui/lib/utils";
import { Reorder } from "motion/react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { type ThemeItemDoc, ThemeReorderableItem } from "./item";

interface SettingsTabProps {
  setSaveHandler: React.Dispatch<
    React.SetStateAction<(() => Promise<void>) | null>
  >;
  setUnsavedChanges: (unsavedChanges: boolean) => void;
}

export const SettingsTab = ({
  setSaveHandler,
  setUnsavedChanges,
}: SettingsTabProps) => {
  const [items, setItems] = useState<ThemeItemDoc[]>([]);
  const [initialItemsState, setInitialItemsState] = useState<ThemeItemDoc[]>(
    []
  );
  const [editingNameId, setEditingNameId] = useState<Id<"themes"> | null>(null);
  const [currentNameValue, setCurrentNameValue] = useState<string>("");
  const [openAccordionId, setOpenAccordionId] = useState<string>("");
  const [, setIsNewModalOpen] = useNewThemeModal();

  const { data: themes, isPending: isLoadingThemes } = useCachedRichQuery(
    api.collections.brands.themes.queries.getAll,
    {
      showHidden: true,
    }
  );

  const updateThemeMutation = useMutation(
    api.collections.brands.themes.mutations.update
  );

  const deleteThemeMutation = useMutation(
    api.collections.brands.themes.mutations.deletePermanent
  );

  useEffect(() => {
    if (themes) {
      const sortedThemes = [...themes].sort(
        (a, b) => (a.index ?? 0) - (b.index ?? 0)
      );
      setItems(sortedThemes);
      setInitialItemsState(JSON.parse(JSON.stringify(sortedThemes)));
    }
  }, [themes]);

  const handleReorder = (newOrder: ThemeItemDoc[]) => {
    setOpenAccordionId("");
    setItems(newOrder);
  };

  const handleNameChange = (id: Id<"themes">, newName: string) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item._id === id ? { ...item, name: newName } : item
      )
    );
  };

  const handleDescriptionChange = (
    id: Id<"themes">,
    newDescription: string
  ) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item._id === id ? { ...item, description: newDescription } : item
      )
    );
  };

  const handleToggleVisibility = (id: Id<"themes">) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item._id === id ? { ...item, isVisible: !item.isVisible } : item
      )
    );
  };

  const handleSave = useCallback(async (): Promise<void> => {
    setOpenAccordionId("");

    await new Promise((resolve) => setTimeout(resolve, 0));

    if (items.length === 0) {
      toast.info("No items to save.");
      return;
    }
    try {
      const updatePromises = items
        .map((item, index) => {
          const originalItem = initialItemsState.find(
            (initItem) => initItem._id === item._id
          );
          const payload: Partial<ThemeItemDoc> & {
            id: Id<"themes">;
            name?: string;
            description?: string;
            index?: number;
            isVisible?: boolean;
          } = { id: item._id };

          let changed = false;
          if (item.name !== originalItem?.name) {
            payload.name = item.name;
            changed = true;
          }
          if ((item.description ?? "") !== (originalItem?.description ?? "")) {
            payload.description = item.description ?? "";
            changed = true;
          }
          if (item.isVisible !== originalItem?.isVisible) {
            payload.isVisible = item.isVisible;
            changed = true;
          }
          if (
            !originalItem ||
            (item.index ?? 0) !== (originalItem.index ?? 0) ||
            items.findIndex((i) => i._id === item._id) !==
              initialItemsState.findIndex((i) => i._id === item._id)
          ) {
            payload.index = index;
            changed = true;
          }

          if (changed) {
            const updatePayload = {
              id: item._id,
              name: payload.name !== undefined ? payload.name : item.name,
              description:
                payload.description !== undefined
                  ? payload.description
                  : (item.description ?? ""),
              index: payload.index !== undefined ? payload.index : index,
              isVisible:
                payload.isVisible !== undefined
                  ? payload.isVisible
                  : item.isVisible,
            };
            return updateThemeMutation(updatePayload);
          }
          return null;
        })
        .filter(Boolean);

      if (updatePromises.length > 0) {
        await Promise.all(updatePromises as Promise<unknown>[]);
        setInitialItemsState(JSON.parse(JSON.stringify(items)));
        setUnsavedChanges(false);
        toast.success("Theme settings updated successfully.");
      } else {
        toast.info("No changes to save.");
        setUnsavedChanges(false);
      }
    } catch (error) {
      console.error("Failed to update theme settings:", error);
      toast.error("Failed to update theme settings.");
    }
  }, [items, initialItemsState, updateThemeMutation, setUnsavedChanges]);

  const handleDelete = async (id: Id<"themes">) => {
    await deleteThemeMutation({ id });
    setItems((prevItems) => prevItems.filter((item) => item._id !== id));
  };

  useEffect(() => {
    setSaveHandler(() => handleSave);
  }, [handleSave, setSaveHandler]);

  useEffect(() => {
    if (items.length > 0 && initialItemsState.length > 0) {
      if (items.length !== initialItemsState.length) {
        setUnsavedChanges(true);
        return;
      }
      const hasChanged = items.some((item) => {
        const initialItem = initialItemsState.find(
          (initItem) => initItem._id === item._id
        );
        return (
          !initialItem ||
          item.name !== initialItem.name ||
          (item.description ?? "") !== (initialItem.description ?? "") ||
          item.isVisible !== initialItem.isVisible ||
          (item.index ?? 0) !== (initialItem.index ?? 0)
        );
      });

      const orderChanged = items.some((item, index) => {
        const initialIndex = initialItemsState.findIndex(
          (initItem) => initItem._id === item._id
        );
        return initialIndex !== index;
      });

      setUnsavedChanges(hasChanged || orderChanged);
    } else if (items.length !== initialItemsState.length) {
      setUnsavedChanges(true);
    } else {
      setUnsavedChanges(false);
    }
  }, [items, initialItemsState, setUnsavedChanges]);

  if (isLoadingThemes) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Theme Settings</h3>
          <p className="text-sm text-muted-foreground">
            Manage your themes, change their order, and customize their
            settings.
          </p>
        </div>
      </div>

      {/* Loading State */}
      {isLoadingThemes && items.length === 0 && (
        <div className="flex items-center justify-center h-48">
          <Spinner size="sm" />
        </div>
      )}
      {/* List */}
      {items.length > 0 && (
        <Accordion
          type="single"
          collapsible
          className="w-full"
          value={openAccordionId}
          onValueChange={setOpenAccordionId}
        >
          <Reorder.Group
            axis="y"
            values={items}
            onReorder={handleReorder}
            className="space-y-2"
          >
            {items.map((item) => {
              return (
                <ThemeReorderableItem
                  key={item._id}
                  item={item}
                  handleDelete={handleDelete}
                  setOpenAccordionIdForDrag={setOpenAccordionId}
                  editingNameId={editingNameId}
                  setEditingNameId={setEditingNameId}
                  currentNameValue={currentNameValue}
                  setCurrentNameValue={setCurrentNameValue}
                  handleNameChange={handleNameChange}
                  handleDescriptionChange={handleDescriptionChange}
                  handleVisibilityChange={handleToggleVisibility}
                />
              );
            })}
          </Reorder.Group>
        </Accordion>
      )}

      <div className="flex flex-col gap-2">
        {!isLoadingThemes && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setIsNewModalOpen({ create: true })}
                variant="outline"
                className="w-full"
              >
                <Plus className="!size-3" /> Create New
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add new theme</TooltipContent>
          </Tooltip>
        )}

        {/* Information Box */}
        {!isLoadingThemes && (
          <InfoBox variant="info" className="w-full">
            Themes help you customize your brand appearance across all your
            projects. You can create custom color schemes and styles.
          </InfoBox>
        )}
      </div>
    </div>
  );
};
