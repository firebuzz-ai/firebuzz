"use client";

import { ChatLayout } from "@/components/layouts/two-panels/panels/generative-chat/chat-layout";
import { PreviewLayout } from "@/components/layouts/two-panels/panels/generative-chat/preview-layout";
import { Preview } from "@/components/preview/preview";
import { useWorkbench } from "@/lib/workbench/hooks/use-workbench";

import { useWorkbenchHelpers } from "@/lib/workbench/hooks/use-workbench-helpers";
import { api, useMutation } from "@firebuzz/convex";
import type { Id } from "@firebuzz/convex/nextjs";
import { toast } from "@firebuzz/ui/lib/utils";
import type { FileSystemTree } from "@webcontainer/api";
import { Chat } from "./chat";

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
    api.collections.landingPages.mutations.publishLandingPage
  );

  const publishPreviewMutation = useMutation(
    api.collections.landingPages.mutations.publishPreviewLandingPage
  );

  const publish = async () => {
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

  return (
    <>
      <ChatLayout>
        <Chat id={id} />
      </ChatLayout>
      <PreviewLayout>
        <Preview publish={publish} publishPreview={publishPreview} />
      </PreviewLayout>
    </>
  );
}
