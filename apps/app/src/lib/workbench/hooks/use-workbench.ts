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
import { WORK_DIR } from "../contants";
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
        .readdir(`${WORK_DIR}/workspace/${id}`)
        .catch(() => [])
        .then((dir) => dir);

      console.log({ projectDir });

      if (!projectDir.length || projectDir.length === 0) {
        // Create project dir
        await webcontainerInstance.fs.mkdir(`${WORK_DIR}/workspace/${id}`, {
          recursive: true,
        });
        await webcontainerInstance.mount(initialFiles, {
          mountPoint: `${WORK_DIR}/workspace/${id}`,
        });
      }

      if (!projectDir?.includes("node_modules")) {
        // Install dependencies without cache

        const installProcess = await webcontainerInstance.spawn(
          "pnpm",
          ["install", "--no-store"],
          { cwd: `${WORK_DIR}/workspace/${id}` }
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
          cwd: `${WORK_DIR}/workspace/${id}`,
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
