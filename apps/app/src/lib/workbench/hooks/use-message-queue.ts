import { type Id, api, useMutation } from "@firebuzz/convex";
import { useAtom, useAtomValue } from "jotai";
import { RESET } from "jotai/utils";
import { useEffect, useState } from "react";
import {
  type Action,
  type Artifact,
  actionsAtom,
  artifactsAtom,
  isDevServerRunningAtom,
  messageQueueAtom,
  parsedFilesAtom,
  projectIdAtom,
  workbenchStore,
} from "../atoms";
import { WORK_DIR } from "../contants";
import { webcontainerInstance } from "../webcontainer";

export function useMessageQueue() {
  const [messageQueue, setMessageQueue] = useAtom(messageQueueAtom);

  const [isProcessing, setIsProcessing] = useState(false);
  const landingPageId = useAtomValue(projectIdAtom);
  const isServerRunning = useAtomValue(isDevServerRunningAtom);

  // Get the Convex mutation
  const createLandingPageVersion = useMutation(
    api.collections.landingPageVersions.mutations.createLandingPageVersion
  );

  useEffect(() => {
    // Skip if there are no messages in the queue or if we're already processing
    if (messageQueue.length === 0 || isProcessing) {
      return;
    }

    const processQueue = async () => {
      setIsProcessing(true);

      try {
        // Process all items in the queue
        for (const item of messageQueue) {
          if (item.type === "artifact") {
            if (item.callbackType === "open") {
              // Add new artifact
              workbenchStore.set(artifactsAtom, (prev) => {
                const artifact: Artifact = {
                  id: item.data.id,
                  messageId: item.data.messageId,
                  closed: false,
                  isInitial: item.isInitial,
                  versionId: item.data.versionId,
                  title: item.data.title || "",
                };
                return [...prev, artifact];
              });
            } else if (item.callbackType === "close") {
              // Update artifact closed state
              workbenchStore.set(artifactsAtom, (prev) => {
                return prev.map((artifact) => {
                  if (artifact.messageId === item.data.messageId) {
                    return { ...artifact, closed: true };
                  }
                  return artifact;
                });
              });
              console.log("Artifact closed");
              console.log({ isInitial: item.isInitial, landingPageId });

              // Save version if not initial
              if (!item.isInitial && landingPageId) {
                try {
                  console.log("Getting files");
                  // Get Files
                  const files = await webcontainerInstance.export(
                    `./${WORK_DIR}/workspace/${landingPageId}`,
                    {
                      excludes: [
                        "node_modules",
                        "dist",
                        "build",
                        "public",
                        "false",
                      ],
                    }
                  );

                  console.log({ files });

                  await createLandingPageVersion({
                    landingPageId: landingPageId as Id<"landingPages">,
                    files: JSON.stringify(files),
                  });
                  console.log("Version created");
                } catch (error) {
                  console.error("Error creating landing page version:", error);
                }
              }
            }
          } else if (item.type === "action") {
            if (item.callbackType === "open") {
              // Add new action
              workbenchStore.set(actionsAtom, (prev) => {
                const baseAction = {
                  id: item.data.actionId,
                  messageId: item.data.messageId,
                  artifactId: item.data.artifactId,
                  status: item.isInitial
                    ? ("success" as const)
                    : ("pending" as const),
                  isInitial: item.isInitial,
                  title: item.data.action.title,
                  content: item.data.action.content,
                };

                const action: Action =
                  item.data.action.type === "file"
                    ? {
                        ...baseAction,
                        type: "file" as const,
                        filePath: item.data.action.filePath,
                      }
                    : {
                        ...baseAction,
                        type: "shell" as const,
                      };

                return [...prev, action];
              });
            } else if (item.callbackType === "close" && !item.isInitial) {
              // Skip if initial or server not running
              if (!isServerRunning) {
                console.log("Server is not running - skipping action close");
                continue;
              }

              try {
                if (item.data.action.type === "file" && landingPageId) {
                  const filePath = item.data.action.filePath;
                  const content = item.data.action.content;
                  const extension = filePath.split(".").pop() || "";

                  // Write file to webcontainer
                  await webcontainerInstance.fs.writeFile(
                    `${WORK_DIR}/workspace/${landingPageId}/${filePath}`,
                    content
                  );

                  // Update parsed files
                  workbenchStore.set(parsedFilesAtom, (prev) => {
                    return new Map(prev).set(filePath, {
                      path: filePath,
                      content: content,
                      extension: extension,
                    });
                  });
                }

                // Update action status
                workbenchStore.set(actionsAtom, (prev) => {
                  return prev.map((action) => {
                    if (action.id === item.data.actionId) {
                      return {
                        ...action,
                        status: "success",
                        content: item.data.action.content,
                      };
                    }
                    return action;
                  });
                });
              } catch (error) {
                // Update action status to error
                workbenchStore.set(actionsAtom, (prev) => {
                  return prev.map((action) => {
                    if (action.id === item.data.actionId) {
                      return { ...action, status: "error" };
                    }
                    return action;
                  });
                });
                console.error("Error processing action:", error);
              }
            }
          }
        }

        // Clear the queue after processing all items
        setMessageQueue(RESET);
      } catch (error) {
        console.error("Error processing message queue:", error);
      } finally {
        setIsProcessing(false);
      }
    };

    processQueue();
  }, [
    messageQueue,
    setMessageQueue,
    createLandingPageVersion,
    isProcessing,
    landingPageId,
    isServerRunning,
  ]);

  return {
    messageQueue,
    isProcessing,
  };
}
