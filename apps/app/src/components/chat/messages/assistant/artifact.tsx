import { actionsAtom, artifactsAtom } from "@/lib/workbench/atoms";
import { Button } from "@firebuzz/ui/components/ui/button";
import { useAtomValue } from "jotai";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { ActionList } from "./action-list";

interface ArtifactProps {
  id: string;
}

export const Artifact = ({ id }: ArtifactProps) => {
  const [isActionsVisible, setIsActionsVisible] = useState(true);
  const artifacts = useAtomValue(artifactsAtom);
  const actions = useAtomValue(actionsAtom);

  const artifact = artifacts.find((a) => a.messageId === id);
  const artifactActions = actions.filter((action) => action.messageId === id);

  if (!artifact) return null;

  return (
    <div className="border rounded-md overflow-hidden w-full">
      <div className="flex items-stretch">
        <Button
          variant="ghost"
          className="flex-1 justify-start px-4 py-2 h-auto hover:bg-accent rounded-none"
          onClick={() => setIsActionsVisible(!isActionsVisible)}
        >
          <div className="text-left">
            <div className="font-medium text-sm">{artifact.title}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Click to {isActionsVisible ? "close" : "open"} actions
            </div>
          </div>
        </Button>
      </div>

      <AnimatePresence>
        {isActionsVisible && artifactActions.length > 0 && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="h-px bg-border" />
            <div className="p-4 bg-muted/50">
              <ActionList actions={artifactActions} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
