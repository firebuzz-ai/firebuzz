import type { FileSystemTree } from "@webcontainer/api";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect } from "react";

import {
  devServerInstanceAtom,
  devServerLogsAtom,
  errorsAtom,
  isDependenciesInstalledAtom,
  isDevServerRunningAtom,
  isIframeLoadedAtom,
  parsedFilesAtom,
  portAtom,
  projectIdAtom,
} from "../atoms";
import { WORK_DIR } from "../constants";
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
  const setErrors = useSetAtom(errorsAtom);
  const setDevServerLogs = useSetAtom(devServerLogsAtom);

  const [devServerInstance, setDevServerInstance] = useAtom(
    devServerInstanceAtom
  );
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
          ["install"],
          { cwd: `${WORK_DIR}/workspace/${id}` }
        );
        const exitCode = await installProcess.exit;
        if (exitCode !== 0) {
          throw new Error("Failed to install dependencies");
        }
      }

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
    if (devServerInstance) {
      // Improved logging - collect all output in a readable format
      devServerInstance.output.pipeTo(
        new WritableStream({
          write(data) {
            // Remove ANSI escape codes for cleaner output
            // biome-ignore lint/suspicious/noControlCharactersInRegex: <explanation>
            const cleanedData = data.replace(/\u001b\[[0-9;]*[mGKH]/g, "");

            if (
              cleanedData.includes("Internal server error") ||
              cleanedData.includes("Error:")
            ) {
              setErrors((prev) => {
                return [
                  ...prev,
                  { type: "dev-server", message: cleanedData, rawError: null },
                ];
              });
            }
            setDevServerLogs((prev) => {
              return prev + cleanedData;
            });
          },
        })
      );
    }
  }, [devServerInstance, setErrors, setDevServerLogs]);

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
