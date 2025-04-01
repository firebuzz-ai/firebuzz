import type { FileSystemTree } from "@webcontainer/api";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useRef } from "react";

import {
  devServerInstanceAtom,
  devServerLogsAtom,
  errorsAtom,
  isDependenciesInstalledAtom,
  isDevServerRunningAtom,
  isIframeLoadedAtom,
  portAtom,
} from "../atoms";
import { webcontainerInstance } from "../webcontainer";

const checkProjectMounted = async (id: string) => {
  const projectMounted = await webcontainerInstance.fs
    .readdir(id)
    .then((files) => files.length > 0)
    .catch(() => false);
  return projectMounted;
};

const mountProjectFiles = async (id: string, initialFiles: FileSystemTree) => {
  try {
    await webcontainerInstance.fs.mkdir(id);
    await webcontainerInstance.mount(initialFiles, { mountPoint: id });
    return true;
  } catch (error) {
    console.error("Failed to mount initial files:", error);
    return false;
  }
};

const checkDependenciesInstalled = async (id: string) => {
  const isDependenciesInstalled = await webcontainerInstance.fs
    .readdir(`${id}/node_modules`)
    .then((files) => files.length > 0)
    .catch(() => false);

  if (isDependenciesInstalled) {
    // Set pnpm store config
    await webcontainerInstance.spawn(
      "pnpm",
      ["config", "set", "store-dir", "false/v3"],
      {
        cwd: `/${id}`,
      }
    );
  }

  return isDependenciesInstalled;
};

const installDependencies = async (id: string) => {
  try {
    const installProcess = await webcontainerInstance.spawn(
      "pnpm",
      ["install", "--store-dir", "false/v3"],
      {
        cwd: `/${id}`,
      }
    );

    const exitCode = await installProcess.exit;
    if (exitCode !== 0) {
      console.log("Failed to install dependencies", exitCode);
      return false;
    }

    // Set pnpm store config
    await webcontainerInstance.spawn(
      "pnpm",
      ["config", "set", "store-dir", "false/v3"],
      {
        cwd: `/${id}`,
      }
    );

    return true;
  } catch (error) {
    console.error("Failed to install dependencies:", error);
    return false;
  }
};

const startDevServer = async (id: string) => {
  try {
    const devProcess = await webcontainerInstance.spawn(
      "pnpm",
      ["run", "dev"],
      {
        cwd: `/${id}`,
      }
    );
    return devProcess;
  } catch (error) {
    console.error("Failed to start dev server:", error);
    return null;
  }
};
export const useWorkbench = (
  initialFiles: FileSystemTree | undefined,
  id: string
) => {
  const initilization = useRef({
    isInitilizing: false,
    isInitialized: false,
  });
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

  const initialize = useCallback(async () => {
    if (!webcontainerInstance || !initialFiles) {
      return false;
    }

    let projectMounted = false;

    // Check project dir
    projectMounted = await checkProjectMounted(id);

    if (!projectMounted) {
      projectMounted = await mountProjectFiles(id, initialFiles);
    }

    if (!projectMounted) {
      console.log("Failed to mount initial files");
      return false;
    }

    let isDependenciesInstalled = await checkDependenciesInstalled(id);

    if (!isDependenciesInstalled) {
      isDependenciesInstalled = await installDependencies(id);
    }

    if (!isDependenciesInstalled) {
      console.log("Failed to install dependencies");
      return false;
    }

    setIsDependenciesInstalled(true);

    // Start the dev server and store the process
    const devProcess = await startDevServer(id);
    if (!devProcess) {
      console.log("Failed to start dev server");
      return false;
    }

    setDevServerInstance(devProcess);

    return true;
  }, [initialFiles, id, setIsDependenciesInstalled, setDevServerInstance]);

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
    if (!initilization.current.isInitilizing && !devServerInstance) {
      initilization.current.isInitilizing = true;
      initialize()
        .then((isInitialized) => {
          if (isInitialized) {
            initilization.current.isInitialized = true;
          }
        })
        .finally(() => {
          initilization.current.isInitilizing = false;
        });
    }
  }, [initialize, devServerInstance]);

  return {
    port,
    isDevServerRunning,
    isDependenciesInstalled,
    isIframeLoaded,
  };
};
