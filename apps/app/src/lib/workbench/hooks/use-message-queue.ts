import { type Id, api, useMutation } from "@firebuzz/convex";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { RESET } from "jotai/utils";
import { useEffect, useState } from "react";
import {
  type Action,
  type Artifact,
  actionsAtom,
  artifactsAtom,
  currentPreviewVersionAtom,
  isDevServerRunningAtom,
  messageQueueAtom,
  parsedFilesAtom,
  projectIdAtom,
  workbenchStore,
} from "../atoms";
import { WORK_DIR } from "../constants";
import type { QuickEditAction } from "../parser/message-parser";
import { webcontainerInstance } from "../webcontainer";

export function useMessageQueue() {
  const [messageQueue, setMessageQueue] = useAtom(messageQueueAtom);

  const [isProcessing, setIsProcessing] = useState(false);
  const landingPageId = useAtomValue(projectIdAtom);
  const isServerRunning = useAtomValue(isDevServerRunningAtom);
  const setArtifacts = useSetAtom(artifactsAtom);
  const setActions = useSetAtom(actionsAtom);
  const setParsedFiles = useSetAtom(parsedFilesAtom);
  const setCurrentPreviewVersion = useSetAtom(currentPreviewVersionAtom);

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
              const artifact: Artifact = {
                id: item.data.id,
                messageId: item.data.messageId,
                closed: false,
                isInitial: item.isInitial,
                versionId: item.data.versionId,
                versionNumber: item.data.versionNumber,
                title: item.data.title || "",
                isSaving: false,
              };
              // Add new artifact
              setArtifacts((prev) => {
                return [...prev, artifact];
              });
            } else if (item.callbackType === "close") {
              console.log("Closing artifact", item);

              setCurrentPreviewVersion(null);

              // Update artifact closed state
              setArtifacts((prev) => {
                return prev.map((artifact) => {
                  if (artifact.messageId === item.data.messageId) {
                    return { ...artifact, closed: true };
                  }
                  return artifact;
                });
              });

              // Save version if not initial
              if (!item.isInitial && landingPageId) {
                try {
                  // Set is saving to true
                  setArtifacts((prev) => {
                    return prev.map((artifact) => {
                      if (artifact.messageId === item.data.messageId) {
                        return { ...artifact, isSaving: true };
                      }
                      return artifact;
                    });
                  });
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

                  const { landingPageVersionId, number } =
                    await createLandingPageVersion({
                      landingPageId: landingPageId as Id<"landingPages">,
                      messageId: item.data.messageId,
                      filesString: JSON.stringify(files),
                    });

                  // Update Version ID
                  setArtifacts((prev) => {
                    return prev.map((artifact) => {
                      if (artifact.messageId === item.data.messageId) {
                        return {
                          ...artifact,
                          versionId: landingPageVersionId,
                          versionNumber: number,
                          isSaving: false,
                        };
                      }
                      return artifact;
                    });
                  });
                } catch (error) {
                  console.error("Error creating landing page version:", error);
                }
              }
            }
          } else if (item.type === "action") {
            if (item.callbackType === "open") {
              // Add new action
              setActions((prev) => {
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
                    : item.data.action.type === "quick-edit"
                      ? {
                          ...baseAction,
                          type: "quick-edit" as const,
                          filePath: (item.data.action as QuickEditAction)
                            .filePath,
                          from: (item.data.action as QuickEditAction).from,
                          to: (item.data.action as QuickEditAction).to,
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
                continue;
              }

              try {
                // File action
                if (item.data.action.type === "file" && landingPageId) {
                  const filePath = item.data.action.filePath;
                  const content = item.data.action.content;
                  const extension = filePath.split(".").pop() || "";

                  // Write file to webcontainer
                  await webcontainerInstance.fs.writeFile(
                    `${WORK_DIR}/workspace/${landingPageId}/${filePath}`,
                    content
                  );

                  // Update action status to success
                  setActions((prev) => {
                    return prev.map((action) => {
                      if (action.id === item.data.actionId) {
                        return { ...action, status: "success" };
                      }
                      return action;
                    });
                  });

                  // Update parsed files
                  setParsedFiles((prev) => {
                    return new Map(prev).set(filePath, {
                      path: filePath,
                      content: content,
                      extension: extension,
                    });
                  });
                }

                // Quick-edit action
                if (item.data.action.type === "quick-edit" && landingPageId) {
                  const quickEditAction = item.data.action as QuickEditAction;
                  const { filePath, from, to } = quickEditAction;

                  try {
                    // Read the current file content
                    const fileContent = await webcontainerInstance.fs.readFile(
                      `${WORK_DIR}/workspace/${landingPageId}/${filePath}`,
                      "utf-8"
                    );

                    // Ensure from and to are defined
                    if (!from || !to) {
                      throw new Error(
                        "Quick-edit action missing from or to values"
                      );
                    }

                    // Replace the text
                    const normalizeWhitespace = (str: string) => {
                      return str.replace(/\s+/g, " ").trim();
                    };

                    // Create a regex that's more flexible with whitespace
                    const fromRegex = new RegExp(
                      normalizeWhitespace(from)
                        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&") // Escape regex special chars
                        .replace(/ /g, "\\s+"), // Make whitespace flexible
                      "g" // Global flag to replace all occurrences
                    );

                    // Attempt to find the content with flexible matching
                    let newContent = fileContent;
                    if (fileContent.includes(from)) {
                      // If exact match found, use it
                      newContent = fileContent.replace(from, to);
                    } else {
                      // Try with regex for more flexible matching
                      newContent = fileContent.replace(fromRegex, to);
                    }

                    // Make sure the replacement happened (the 'from' text was found)
                    if (newContent === fileContent) {
                      throw new Error(
                        `Could not find text to replace in ${filePath}`
                      );
                    }

                    // Write the updated content back to the file
                    await webcontainerInstance.fs.writeFile(
                      `${WORK_DIR}/workspace/${landingPageId}/${filePath}`,
                      newContent
                    );

                    // Update action status to success
                    setActions((prev) => {
                      return prev.map((action) => {
                        if (action.id === item.data.actionId) {
                          return { ...action, status: "success" };
                        }
                        return action;
                      });
                    });

                    // Update parsed files
                    const extension = filePath.split(".").pop() || "";
                    setParsedFiles((prev) => {
                      return new Map(prev).set(filePath, {
                        path: filePath,
                        content: newContent,
                        extension: extension,
                      });
                    });
                  } catch (error) {
                    console.error("Error processing quick-edit action:", error);
                    // Update action status to error
                    setActions((prev) => {
                      return prev.map((action) => {
                        if (action.id === item.data.actionId) {
                          return { ...action, status: "error" };
                        }
                        return action;
                      });
                    });
                  }
                }

                // Shell action
                if (item.data.action.type === "shell" && landingPageId) {
                  // Run shell command
                  const args = item.data.action.content
                    .replaceAll("\n", "")
                    .replaceAll("\r", "")
                    .replaceAll("\t", "")
                    .split(" ")
                    .filter(
                      (arg) =>
                        arg !== "" &&
                        arg !== " " &&
                        arg !== "\n" &&
                        arg !== "\r" &&
                        arg !== "\t"
                    );

                  console.log("Running shell command");
                  console.log(args);

                  const process = await webcontainerInstance.spawn(
                    args[0],
                    args.slice(1),
                    {
                      cwd: `${WORK_DIR}/workspace/${landingPageId}`,
                    }
                  );

                  process.output.pipeTo(
                    new WritableStream({
                      write(chunk) {
                        console.log(chunk);
                      },
                    })
                  );

                  const exitCode = await process.exit;
                  // If the command failed, update the action status
                  if (exitCode !== 0) {
                    // Update action status
                    workbenchStore.set(actionsAtom, (prev) => {
                      return prev.map((action) => {
                        if (action.id === item.data.actionId) {
                          return {
                            ...action,
                            status: "error",
                            content: item.data.action.content,
                          };
                        }
                        return action;
                      });
                    });
                  } else {
                    // Update action status to success
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
                  }
                }
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
    setArtifacts,
    setActions,
    setParsedFiles,
    isProcessing,
    landingPageId,
    isServerRunning,
    setCurrentPreviewVersion,
  ]);

  return {
    messageQueue,
    isProcessing,
  };
}
