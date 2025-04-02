import type { FileSystemTree } from "@webcontainer/api";
import { useAtom, useSetAtom } from "jotai";
import { useCallback, useEffect, useRef } from "react";

import {
  devServerInstanceAtom,
  devServerLogsAtom,
  errorsAtom,
  isDependenciesInstalledAtom,
  isProjectMountedAtom,
} from "../atoms";
import {
  checkDependenciesInstalled,
  checkProjectMounted,
  installDependencies,
  mountProjectFiles,
  startDevServer,
} from "../utils";
import { webcontainerInstance } from "../webcontainer";

export const useWorkbench = (
  initialFiles: FileSystemTree | undefined,
  id: string
) => {
  const isInitilizing = useRef(false);
  const setIsDependenciesInstalled = useSetAtom(isDependenciesInstalledAtom);
  const setErrors = useSetAtom(errorsAtom);
  const setDevServerLogs = useSetAtom(devServerLogsAtom);
  const setIsProjectMounted = useSetAtom(isProjectMountedAtom);

  const [devServerInstance, setDevServerInstance] = useAtom(
    devServerInstanceAtom
  );

  const initialize = useCallback(async () => {
    if (!webcontainerInstance || !initialFiles) {
      return false;
    }

    isInitilizing.current = true;
    let projectMounted = false;

    // Check project dir
    projectMounted = await checkProjectMounted(id);

    if (!projectMounted) {
      projectMounted = await mountProjectFiles(id, initialFiles);
    }

    if (!projectMounted) {
      setErrors((prev) => {
        return [
          ...prev,
          {
            type: "container",
            message: "Failed to mount initial files",
            rawError: null,
          },
        ];
      });
      return false;
    }

    setIsProjectMounted(true);

    let isDependenciesInstalled = await checkDependenciesInstalled(id);

    if (!isDependenciesInstalled) {
      isDependenciesInstalled = await installDependencies(id);
    }

    if (!isDependenciesInstalled) {
      setErrors((prev) => {
        return [
          ...prev,
          {
            type: "container",
            message: "Failed to install dependencies",
            rawError: null,
          },
        ];
      });
      return false;
    }

    setIsDependenciesInstalled(true);

    // Start the dev server and store the process
    const devProcess = await startDevServer(id);
    if (!devProcess) {
      setErrors((prev) => {
        return [
          ...prev,
          {
            type: "dev-server",
            message: "Failed to start dev server",
            rawError: null,
          },
        ];
      });
      return false;
    }

    setDevServerInstance(devProcess);

    return true;
  }, [
    initialFiles,
    id,
    setIsDependenciesInstalled,
    setDevServerInstance,
    setIsProjectMounted,
    setErrors,
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
    if (!isInitilizing.current && !devServerInstance) {
      initialize();
    }
  }, [initialize, devServerInstance]);
};
