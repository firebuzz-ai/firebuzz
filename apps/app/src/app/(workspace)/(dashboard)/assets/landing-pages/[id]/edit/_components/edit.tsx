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
import { parseFileSystemTree } from "@/lib/workbench/parser/current-files-parser";
import { useAuth } from "@clerk/nextjs";
import { api, useMutation } from "@firebuzz/convex";
import { type Doc, type Id, fetchQuery } from "@firebuzz/convex/nextjs";
import { toast } from "@firebuzz/ui/lib/utils";
import type { FileSystemTree } from "@webcontainer/api";
import { useCallback, useEffect, useState } from "react";
import { Chat } from "./chat";
export function EditLandingPage({ id }: { id: string }) {
  const { getToken } = useAuth();
  const [initialFiles, setInitialFiles] = useState<FileSystemTree>();
  const [initialLandingPage, setInitialLandingPage] =
    useState<Doc<"landingPages"> | null>(null);

  const getLandingPageWithInitialFiles = useCallback(async () => {
    try {
      const token = await getToken({ template: "convex" });
      if (!token) {
        throw new Error("No token");
      }
      const landingPage = await fetchQuery(
        api.collections.landingPages.queries.getById,
        {
          id: id as Id<"landingPages">,
        },
        { token }
      );

      const initialFiles = await fetch(landingPage.signedUrl).then((res) =>
        res.json()
      );

      return { landingPage, initialFiles };
    } catch (error) {
      console.error(error);
      return null;
    }
  }, [getToken, id]);

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
    if (!initialFiles) return;
    workbenchStore.set(parsedFilesAtom, parseFileSystemTree(initialFiles));
    workbenchStore.set(projectIdAtom, id);
  }, [id, initialFiles]);

  useEffect(() => {
    getLandingPageWithInitialFiles().then((data) => {
      if (!data) return;
      setInitialLandingPage(data.landingPage);
      setInitialFiles(data.initialFiles);
    });
  }, [getLandingPageWithInitialFiles]);

  return (
    <div className="flex w-full h-screen overflow-hidden">
      <ChatLayout>
        <Chat id={id} initialLandingPage={initialLandingPage} />
      </ChatLayout>
      <PreviewLayout>
        <Preview publish={publish} publishPreview={publishPreview} />
      </PreviewLayout>
    </div>
  );
}
