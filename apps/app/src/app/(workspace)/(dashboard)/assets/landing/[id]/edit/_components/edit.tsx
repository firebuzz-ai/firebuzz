"use client";

import { ChatLayout } from "@/components/layouts/two-panels/panels/generative-chat/chat-layout";
import { PreviewLayout } from "@/components/layouts/two-panels/panels/generative-chat/preview-layout";
import { Preview } from "@/components/preview/preview";
import { useWorkbench } from "@/lib/workbench/hooks/use-workbench";

import { webcontainerInstance } from "@/lib/workbench/webcontainer";
import { createClient } from "@engine/api";
import { toast } from "@firebuzz/ui/lib/utils";
import type { FileSystemTree } from "@webcontainer/api";
import { Chat } from "./chat";

const engineAPIClient = createClient();

export function EditLandingPage({
  id,
  initialFiles,
}: {
  id: string;
  initialFiles: FileSystemTree;
}) {
  useWorkbench(initialFiles, id);

  const buildAndGetFiles = async () => {
    try {
      // Start building process
      const buildProcess = await webcontainerInstance.spawn(
        "pnpm",
        ["run", "build"],
        {
          cwd: `/workspace/${id}`,
        }
      );

      buildProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            console.log(data);
          },
        })
      );

      const exitCode = await buildProcess.exit;

      if (exitCode !== 0) {
        throw new Error("Failed to build");
      }

      // Get the file names in dist folder
      console.log("Reading dist folder");
      const indexHTML = await webcontainerInstance.fs.readFile(
        `/workspace/${id}/dist/index.html`,
        "utf-8"
      );

      const files = await webcontainerInstance.fs.readdir(
        `/workspace/${id}/dist/assets`
      );

      const assets = await Promise.all(
        files.map(async (file) => ({
          name: file,
          content: await webcontainerInstance.fs.readFile(
            `/workspace/${id}/dist/assets/${file}`,
            "utf-8"
          ),
        }))
      );

      const indexJS = assets.find((asset) => asset.name.includes(".js"));
      const indexCSS = assets.find((asset) => asset.name.includes(".css"));

      const updatedHTML = indexHTML
        .replace(`/assets/${indexJS?.name}`, `/${id}/assets/script`)
        .replace(`/assets/${indexCSS?.name}`, `/${id}/assets/styles`);

      return {
        indexHTML: updatedHTML,
        indexJS: indexJS?.content ?? "",
        indexCSS: indexCSS?.content ?? "",
      };
    } catch (error) {
      console.error(error);
      toast.error("Failed to build", {
        description:
          error instanceof Error ? error.message : "Please try again",
        id: "build-process",
      });
    }
  };

  const publish = async () => {
    const files = await buildAndGetFiles();

    if (!files) {
      toast.error("Failed to build", {
        description: "Please try again",
        id: "build-process",
      });
      return;
    }

    // Put files in KV
    const htmlPromise = engineAPIClient.kv.assets.$post({
      json: {
        key: id,
        value: files.indexHTML,
        options: {
          metadata: {
            contentType: "html",
            projectId: "1",
            landingId: "1",
            variantId: "1",
            language: "en",
          },
        },
      },
    });

    const jsPromise = engineAPIClient.kv.assets.$post({
      json: {
        key: `assets/${id}/script`,
        value: files.indexJS,
        options: {
          metadata: {
            contentType: "js",
            projectId: "1",
            landingId: "1",
            variantId: "1",
            language: "en",
          },
        },
      },
    });

    const cssPromise = engineAPIClient.kv.assets.$post({
      json: {
        key: `assets/${id}/styles`,
        value: files.indexCSS,
        options: {
          metadata: {
            contentType: "css",
            projectId: "1",
            landingId: "1",
            variantId: "1",
            language: "en",
          },
        },
      },
    });

    try {
      await Promise.all([htmlPromise, jsPromise, cssPromise]);
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
    } finally {
      toast.success("Published", {
        description: "Landing page published successfully",
        id: "publish-process",
      });
    }
  };

  return (
    <>
      <ChatLayout>
        <Chat id={id} />
      </ChatLayout>
      <PreviewLayout>
        <Preview publish={publish} />
      </PreviewLayout>
    </>
  );
}
