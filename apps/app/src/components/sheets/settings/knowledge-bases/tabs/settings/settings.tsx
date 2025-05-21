"use client";

import { useNewKnowledgeBaseModal } from "@/hooks/ui/use-new-knowledgebase-modal";
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
import {
  type KnowledgeBaseItemDoc,
  KnowledgeBaseReorderableItem,
} from "./item";
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
  const [items, setItems] = useState<KnowledgeBaseItemDoc[]>([]);
  const [initialItemsState, setInitialItemsState] = useState<
    KnowledgeBaseItemDoc[]
  >([]);
  const [editingNameId, setEditingNameId] =
    useState<Id<"knowledgeBases"> | null>(null);
  const [currentNameValue, setCurrentNameValue] = useState<string>("");
  const [openAccordionId, setOpenAccordionId] = useState<string>("");
  const [, setIsNewModalOpen] = useNewKnowledgeBaseModal();

  const { data: knowledgeBases, isPending: isLoadingKnowledgeBases } =
    useCachedRichQuery(api.collections.storage.knowledgeBases.queries.getAll, {
      showHidden: true,
    });

  const updateKnowledgeBaseMutation = useMutation(
    api.collections.storage.knowledgeBases.mutations.update
  );

  const deleteKnowledgeBaseMutation = useMutation(
    api.collections.storage.knowledgeBases.mutations.deletePermanent
  );

  useEffect(() => {
    if (knowledgeBases) {
      const sortedBases = [...knowledgeBases].sort((a, b) => a.index - b.index);
      setItems(sortedBases);
      setInitialItemsState(JSON.parse(JSON.stringify(sortedBases)));
    }
  }, [knowledgeBases]);

  const handleReorder = (newOrder: KnowledgeBaseItemDoc[]) => {
    setOpenAccordionId("");
    setItems(newOrder);
  };

  const handleNameChange = (id: Id<"knowledgeBases">, newName: string) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item._id === id ? { ...item, name: newName } : item
      )
    );
  };

  const handleDescriptionChange = (
    id: Id<"knowledgeBases">,
    newDescription: string
  ) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item._id === id ? { ...item, description: newDescription } : item
      )
    );
  };

  const handleToggleVisibility = (id: Id<"knowledgeBases">) => {
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
          const payload: Partial<KnowledgeBaseItemDoc> & {
            id: Id<"knowledgeBases">;
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
            item.index !== originalItem.index ||
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
            return updateKnowledgeBaseMutation(updatePayload);
          }
          return null;
        })
        .filter(Boolean);

      if (updatePromises.length > 0) {
        await Promise.all(updatePromises as Promise<unknown>[]);
        setInitialItemsState(JSON.parse(JSON.stringify(items)));
        setUnsavedChanges(false);
        toast.success("Knowledge base settings updated successfully.");
      } else {
        toast.info("No changes to save.");
        setUnsavedChanges(false);
      }
    } catch (error) {
      console.error("Failed to update knowledge base settings:", error);
      toast.error("Failed to update knowledge base settings.");
    }
  }, [
    items,
    initialItemsState,
    updateKnowledgeBaseMutation,
    setUnsavedChanges,
  ]);

  const handleDelete = async (id: Id<"knowledgeBases">) => {
    await deleteKnowledgeBaseMutation({ id });
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
          (init) => init._id === item._id
        );
        if (!initialItem) return true;
        return (
          item.name !== initialItem.name ||
          (item.description ?? "") !== (initialItem.description ?? "") ||
          item.isVisible !== initialItem.isVisible ||
          items.findIndex((i) => i._id === item._id) !==
            initialItemsState.findIndex((i) => i._id === item._id)
        );
      });
      setUnsavedChanges(hasChanged);
    } else if (items.length === 0 && initialItemsState.length === 0) {
      setUnsavedChanges(false);
    } else {
      setUnsavedChanges(true);
    }
  }, [items, initialItemsState, setUnsavedChanges]);

  if (isLoadingKnowledgeBases) {
    return (
      <div className="flex items-center justify-center h-48">
        <Spinner />
        <span className="ml-2">Loading knowledge bases...</span>
      </div>
    );
  }

  if (!knowledgeBases || knowledgeBases.length === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <p>No knowledge bases found.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div>
        <h2 className="text-lg font-medium">Knowledge Base Settings</h2>
        <p className="text-sm text-muted-foreground">
          Drag to reorder. Click name to edit. Expand to edit description.
        </p>
      </div>
      {/* Container */}
      <div className="flex flex-col w-full h-full gap-2">
        {" "}
        {/* Loading State */}
        {isLoadingKnowledgeBases && items.length === 0 && (
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
                  <KnowledgeBaseReorderableItem
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
        {/* Add new button */}
        {!isLoadingKnowledgeBases && (
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
            <TooltipContent>Add new knowledge base</TooltipContent>
          </Tooltip>
        )}
        {/* Information Box */}
        {!isLoadingKnowledgeBases && (
          <InfoBox variant="info" className="w-full">
            Knowledge bases help you manage your contents to feed AI bots. You
            can create upto 10 knowledge bases.
          </InfoBox>
        )}
      </div>
    </div>
  );
};
