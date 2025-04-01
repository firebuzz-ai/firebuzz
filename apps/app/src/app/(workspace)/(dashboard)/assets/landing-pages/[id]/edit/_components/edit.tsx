"use client";

import { ChatLayout } from "@/components/layouts/two-panels/panels/generative-chat/chat-layout";
import { PreviewLayout } from "@/components/layouts/two-panels/panels/generative-chat/preview-layout";
import { Preview } from "@/components/preview/preview";
import { useWorkbench } from "@/lib/workbench/hooks/use-workbench";

import {
  parsedFilesAtom,
  projectIdAtom,
  workbenchStore,
} from "@/lib/workbench/atoms";
import { useWorkbenchHelpers } from "@/lib/workbench/hooks/use-workbench-helpers";
import { api, useMutation } from "@firebuzz/convex";
import type { Id } from "@firebuzz/convex/nextjs";
import { toast } from "@firebuzz/ui/lib/utils";
import type { FileSystemTree } from "@webcontainer/api";
import { useEffect } from "react";
import { Chat } from "./chat";
import { parseFileSystemTree } from "@/lib/workbench/parser/current-files-parser";
export function EditLandingPage({
  id,
  initialFiles,
}: {
  id: string;
  initialFiles: FileSystemTree;
}) {
  useWorkbench(initialFiles, id);

  const { buildProject, getBuildFiles } = useWorkbenchHelpers();

  const publishMutation = useMutation(
    api.collections.landingPages.mutations.publish
  );

  const publishPreviewMutation = useMutation(
    api.collections.landingPages.mutations.publishPreview
  );

  const publish = async () => {
    console.log("Publishing");
    try {
      // Build project
      const isBuildFinished = await buildProject(id);

      if (!isBuildFinished) {
        toast.error("Failed to build", {
          description: "Please try again",
          id: "build-process",
        });
        return;
      }

      // Get build files
      const files = await getBuildFiles(id, "production");

      await publishMutation({
        id: id as Id<"landingPages">,
        html: files.indexHTML,
        js: files.indexJS,
        css: files.indexCSS,
      });

      toast.success("Published", {
        description: "Landing page published successfully",
        id: "publish-process",
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to publish", {
        description: "Please try again",
        id: "publish-process",
      });
    }
  };

  const publishPreview = async () => {
    console.log("Publishing preview");
    try {
      // Build project
      const isBuildFinished = await buildProject(id);

      if (!isBuildFinished) {
        toast.error("Failed to build", {
          description: "Please try again",
          id: "build-process",
        });
        return;
      }

      // Get build files
      const files = await getBuildFiles(id, "preview");

      await publishPreviewMutation({
        id: id as Id<"landingPages">,
        html: files.indexHTML,
        js: files.indexJS,
        css: files.indexCSS,
      });

      toast.success("Preview Published", {
        description: "Landing page preview published successfully",
        id: "publish-preview-process",
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to publish preview", {
        description: "Please try again",
        id: "publish-preview-process",
      });
    }
  };

  useEffect(() => {
    workbenchStore.set(parsedFilesAtom, parseFileSystemTree(initialFiles));
    workbenchStore.set(projectIdAtom, id);
  }, [id, initialFiles]);

  return (
    <div className="flex w-full h-screen overflow-hidden">
      <ChatLayout>
        <Chat id={id} />
      </ChatLayout>
      <PreviewLayout>
        <Preview publish={publish} publishPreview={publishPreview} />
      </PreviewLayout>
    </div>
  );
}
