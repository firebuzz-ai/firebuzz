"use client";

import { ChatLayout } from "@/components/layouts/two-panels/panels/generative-chat/chat-layout";
import { PreviewLayout } from "@/components/layouts/two-panels/panels/generative-chat/preview-layout";
import { Preview } from "@/components/preview/preview";
import { useWorkbench } from "@/lib/workbench/hooks/use-workbench";

import { useWorkbenchHelpers } from "@/lib/workbench/hooks/use-workbench-helpers";
import { api, useMutation } from "@firebuzz/convex";
import type { Doc, Id } from "@firebuzz/convex/nextjs";
import { toast } from "@firebuzz/ui/lib/utils";
import type { FileSystemTree } from "@webcontainer/api";
import { Chat } from "./chat";
export function EditLandingPage({
  id,
  initialFiles,
  initialMessages,
}: {
  id: string;
  initialFiles: FileSystemTree;
  initialMessages: Doc<"landingPageMessages">[];
}) {
  useWorkbench(initialFiles, id);
  const { buildProject, getBuildFiles } = useWorkbenchHelpers();

  const publishMutation = useMutation(
    api.collections.landingPages.mutations.publishLandingPage
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
      const files = await getBuildFiles(id);

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

  return (
    <>
      <ChatLayout>
        <Chat id={id} initialMessages={initialMessages} />
      </ChatLayout>
      <PreviewLayout>
        <Preview publish={publish} />
      </PreviewLayout>
    </>
  );
}
