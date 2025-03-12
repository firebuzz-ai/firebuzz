import type { FileSystemTree } from "@webcontainer/api";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect } from "react";

import {
  devServerInstanceAtom,
  isDependenciesInstalledAtom,
  isDevServerRunningAtom,
  isIframeLoadedAtom,
  parsedFilesAtom,
  portAtom,
  projectIdAtom,
} from "../atoms";
import {
  type ParsedFile,
  parseFileSystemTree,
} from "../parser/current-files-parser";
import { webcontainerInstance } from "../webcontainer";
export const useWorkbench = (initialFiles: FileSystemTree, id: string) => {
  const [isDependenciesInstalled, setIsDependenciesInstalled] = useAtom(
    isDependenciesInstalledAtom
  );
  const port = useAtomValue(portAtom);
  const isDevServerRunning = useAtomValue(isDevServerRunningAtom);
  const setDevServerInstance = useSetAtom(devServerInstanceAtom);
  const isIframeLoaded = useAtomValue(isIframeLoadedAtom);
  const setInitialFiles = useSetAtom(parsedFilesAtom);
  const setProjectId = useSetAtom(projectIdAtom);

  const initialize = useCallback(async () => {
    if (!webcontainerInstance) {
      return;
    }

    let projectDir: string[] = [];

    try {
      // Set files
      setInitialFiles(
        initialFiles
          ? parseFileSystemTree(initialFiles)
          : new Map<string, ParsedFile>()
      );
      setProjectId(id);

      // Check project dir
      projectDir = await webcontainerInstance.fs
        .readdir(`/workspace/${id}`)
        .catch(() => [])
        .then((dir) => dir);

      if (!projectDir.length || projectDir.length === 0) {
        // Create project dir
        await webcontainerInstance.fs.mkdir(`/workspace/${id}`, {
          recursive: true,
        });
        await webcontainerInstance.mount(initialFiles, {
          mountPoint: `/workspace/${id}`,
        });
      }

      if (!projectDir?.includes("node_modules")) {
        // Install dependencies without cache

        const installProcess = await webcontainerInstance.spawn(
          "pnpm",
          ["install", "--no-store"],
          { cwd: `/workspace/${id}` }
        );
        const exitCode = await installProcess.exit;
        if (exitCode !== 0) {
          throw new Error("Failed to install dependencies");
        }
      }

      console.log("Dependencies installed");
      setIsDependenciesInstalled(true);

      // Start the dev server and store the process

      const devProcess = await webcontainerInstance.spawn(
        "pnpm",
        ["run", "dev"],
        {
          cwd: `/workspace/${id}`,
        }
      );

      setDevServerInstance(devProcess);

      return devProcess;
    } catch (error) {
      console.error("Failed to initialize webcontainer:", error);
      // Handle error appropriately
    }
  }, [
    initialFiles,
    id,
    setIsDependenciesInstalled,
    setDevServerInstance,
    setInitialFiles,
    setProjectId,
  ]);

  useEffect(() => {
    const devProcess = initialize();
    return () => {
      devProcess?.then((process) => {
        process?.kill();
      });
    };
  }, [initialize]);

  return {
    port,
    isDevServerRunning,
    isDependenciesInstalled,
    isIframeLoaded,
  };
};
