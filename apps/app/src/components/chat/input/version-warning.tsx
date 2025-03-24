"use client";

import {
  currentPreviewVersionAtom,
  currentVersionAtom,
  isPreviewVersionDifferentAtom,
} from "@/lib/workbench/atoms";
import { WORK_DIR } from "@/lib/workbench/constants";
import { webcontainerInstance } from "@/lib/workbench/webcontainer";
import { useMutation } from "@firebuzz/convex";
import type { Id } from "@firebuzz/convex/nextjs";
import { api } from "@firebuzz/convex/nextjs";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import { AlertTriangle } from "@firebuzz/ui/icons/lucide";
import { cn, toast } from "@firebuzz/ui/lib/utils";
import { useAtom, useAtomValue } from "jotai";
import { motion } from "motion/react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface VersionWarningProps {
  inputValue: string;
  shake: boolean;
}

export const VersionWarning = ({ inputValue, shake }: VersionWarningProps) => {
  const { id: landingPageId } = useParams();
  const [isProcessing, setIsProcessing] = useState(false);
  const isPreviewVersionDifferent = useAtomValue(isPreviewVersionDifferentAtom);
  const currentVersion = useAtomValue(currentVersionAtom);
  const [currentPreviewVersion, setCurrentPreviewVersion] = useAtom(
    currentPreviewVersionAtom
  );

  // State to track when shake animation should be active
  const [shakeX, setShakeX] = useState(0);

  const updateLandingPageVersion = useMutation(
    api.collections.landingPages.mutations.updateLandingPageVersion
  );

  // Handle shake animation when the shake prop changes
  useEffect(() => {
    if (shake) {
      // Create a shake sequence for x position
      const sequence = [0, -10, 10, -10, 10, 0];
      let index = 0;

      // Clear any existing interval
      const interval = setInterval(() => {
        setShakeX(sequence[index]);
        index++;

        if (index >= sequence.length) {
          clearInterval(interval);
          setShakeX(0);
        }
      }, 80); // ~500ms total for the 6 positions

      return () => clearInterval(interval);
    }
  }, [shake]);

  const handleRevertToCurrent = useCallback(async () => {
    setIsProcessing(true);
    try {
      if (!currentVersion?.signedUrl || !landingPageId) {
        toast.error("Missing current version data");
        return;
      }

      // Download files from current version
      const initialFilesResponse = await fetch(currentVersion.signedUrl);
      const initialFiles = await initialFilesResponse.json();

      // Mount files
      await webcontainerInstance.mount(initialFiles, {
        mountPoint: `${WORK_DIR}/workspace/${landingPageId}`,
      });

      // Clear preview version
      setCurrentPreviewVersion(null);

      toast.success("Reverted to current version");
    } catch (error) {
      console.error("Failed to revert to current version:", error);
      toast.error("Failed to revert to current version");
    } finally {
      setIsProcessing(false);
    }
  }, [currentVersion, landingPageId, setCurrentPreviewVersion]);

  const handleMakePreviewCurrent = useCallback(async () => {
    setIsProcessing(true);
    try {
      if (!currentPreviewVersion?._id || !landingPageId) {
        toast.error("Missing preview version data");
        return;
      }

      // Update landing page version in Convex
      await updateLandingPageVersion({
        id: landingPageId as Id<"landingPages">,
        landingPageVersionId:
          currentPreviewVersion._id as Id<"landingPageVersions">,
      });

      // Set current version to preview version
      setCurrentPreviewVersion(null);

      toast.success(`Made version ${currentPreviewVersion.number} current`);
    } catch (error) {
      console.error("Failed to make preview version current:", error);
      toast.error("Failed to make preview version current");
    } finally {
      setIsProcessing(false);
    }
  }, [
    currentPreviewVersion,
    landingPageId,
    setCurrentPreviewVersion,
    updateLandingPageVersion,
  ]);

  // Only show warning if there's input and versions are different
  if (!inputValue || !isPreviewVersionDifferent || !currentPreviewVersion)
    return null;

  return (
    <div className="absolute -top-16 px-4 w-full">
      <motion.div
        animate={{
          opacity: 1,
          y: 0,
          x: shakeX,
        }}
        style={{ x: shakeX }}
        className={cn(
          "px-3 py-2 bg-muted border rounded-lg shadow-sm flex w-full items-center justify-between"
        )}
        initial={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-500">
          <AlertTriangle className="size-4" />
          <p className="text-sm">
            <span className="font-medium">Version mismatch</span>
            <span className="text-muted-foreground ml-2">
              You are previewing version {currentPreviewVersion.number}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRevertToCurrent}
            size="sm"
            variant="ghost"
            className="h-8"
            disabled={isProcessing}
          >
            <div className="flex items-center gap-2">
              <div>{isProcessing ? "Processing..." : "Revert to current"}</div>
              <ButtonShortcut>Esc</ButtonShortcut>
            </div>
          </Button>
          <Button
            onClick={handleMakePreviewCurrent}
            size="sm"
            className="h-8"
            variant="outline"
            disabled={isProcessing}
          >
            <div className="flex items-center gap-2">
              <div>{isProcessing ? "Processing..." : "Make current"}</div>
              <ButtonShortcut>Enter</ButtonShortcut>
            </div>
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
