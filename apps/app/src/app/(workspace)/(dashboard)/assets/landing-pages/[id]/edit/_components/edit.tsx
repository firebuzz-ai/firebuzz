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
import { parseFileSystemTree } from "@/lib/workbench/parser/current-files-parser";
import { useAuth } from "@clerk/nextjs";
import { api } from "@firebuzz/convex";
import { type Id, fetchQuery } from "@firebuzz/convex/nextjs";
import type { FileSystemTree } from "@webcontainer/api";
import { useCallback, useEffect, useState } from "react";
import { Chat } from "./chat";
export function EditLandingPage({ id }: { id: string }) {
  const { getToken } = useAuth();
  const [initialFiles, setInitialFiles] = useState<FileSystemTree>();

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

  useEffect(() => {
    if (!initialFiles) return;
    workbenchStore.set(parsedFilesAtom, parseFileSystemTree(initialFiles));
    workbenchStore.set(projectIdAtom, id);
  }, [id, initialFiles]);

  useEffect(() => {
    getLandingPageWithInitialFiles().then((data) => {
      if (!data) return;
      setInitialFiles(data.initialFiles);
    });
  }, [getLandingPageWithInitialFiles]);

  return (
    <div className="flex w-full h-screen overflow-hidden">
      <ChatLayout>
        <Chat id={id} />
      </ChatLayout>
      <PreviewLayout>
        <Preview />
      </PreviewLayout>
    </div>
  );
}
