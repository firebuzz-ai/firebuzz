import { type Id, api, useMutation } from "@firebuzz/convex";
import { reloadPreview } from "@webcontainer/api";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useState } from "react";
import { ActionError } from "../action-error";
import {
  type Action,
  type Artifact,
  type MessageQueueItem,
  actionsAtom,
  artifactsAtom,
  currentPreviewVersionAtom,
  failedActionsAtom,
  messageQueueAtom,
  parsedFilesAtom,
  previewRefAtom,
  projectIdAtom,
  workbenchStore,
} from "../atoms";
import type { QuickEditAction } from "../parser/message-parser";
import { webcontainerInstance } from "../webcontainer";

export function useMessageQueue() {
  const [messageQueue, setMessageQueue] = useAtom(messageQueueAtom);

  const setFailedActions = useSetAtom(failedActionsAtom);

  const [isProcessing, setIsProcessing] = useState(false);
  const landingPageId = useAtomValue(projectIdAtom);
  const setArtifacts = useSetAtom(artifactsAtom);
  const setActions = useSetAtom(actionsAtom);
  const setParsedFiles = useSetAtom(parsedFilesAtom);
  const setCurrentPreviewVersion = useSetAtom(currentPreviewVersionAtom);
  const previewRef = useAtomValue(previewRefAtom);

  // Get the Convex mutation
  const createLandingPageVersion = useMutation(
    api.collections.landingPages.versions.mutations.create
  );

  // Process Artifacts
  const processArtifacts = useCallback(
    async (item: MessageQueueItem) => {
      if (item.type !== "artifact" || item.isProcessed) {
        return;
      }

      try {
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

          // Reload preview
          if (previewRef) {
            reloadPreview(previewRef, 120);
          }

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
                `${landingPageId}`,
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
                  messageId: `${landingPageId}-${item.data.messageId}`,
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
      } catch (error) {
        console.log("Error processing artifact:", error);
      } finally {
        setMessageQueue((prev) => {
          return prev.map((i) => {
            if (i.id === item.id) {
              return { ...i, isProcessed: true };
            }
            return i;
          });
        });
      }
    },
    [
      landingPageId,
      setArtifacts,
      setCurrentPreviewVersion,
      createLandingPageVersion,
      setMessageQueue,
      previewRef,
    ]
  );

  // Process Actions
  const processActions = useCallback(
    async (item: MessageQueueItem) => {
      if (item.type !== "action" || item.isProcessed) {
        return;
      }

      try {
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
                      filePath: (item.data.action as QuickEditAction).filePath,
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
          // File action
          if (item.data.action.type === "file" && landingPageId) {
            const filePath = item.data.action.filePath;
            const content = item.data.action.content;
            const extension = filePath.split(".").pop() || "";

            // Write file to webcontainer
            await webcontainerInstance.fs.writeFile(
              `${landingPageId}/${filePath}`,
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

            // Read the current file content
            const fileContent = await webcontainerInstance.fs
              .readFile(`${landingPageId}/${filePath}`, "utf-8")
              .catch((error) => {
                console.error("Error reading file:", error);
                throw new ActionError(
                  `Error reading file: ${filePath}`,
                  item.data,
                  { cause: error }
                );
              })
              .then((content) => {
                if (!content) {
                  throw new ActionError("File content is empty", item.data);
                }
                return content;
              });

            // Ensure from and to are defined
            if (!from || !to) {
              throw new ActionError(
                "Quick-edit action missing from or to values",
                item.data
              );
            }

            // Decode HTML entities in from and to values
            const decodeHtmlEntities = (str: string): string => {
              return str
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/&quot;/g, '"')
                .replace(/&apos;/g, "'")
                .replace(/&amp;/g, "&");
            };

            const decodedFrom = decodeHtmlEntities(from);
            const decodedTo = decodeHtmlEntities(to);

            // Replace the text
            const normalizeWhitespace = (str: string) => {
              return str.replace(/\s+/g, " ").trim();
            };

            // Create a regex that's more flexible with whitespace
            const fromRegex = new RegExp(
              normalizeWhitespace(decodedFrom)
                .replace(/[.*+?^${}()|[\]\\]/g, "\\$&") // Escape regex special chars
                .replace(/ /g, "\\s+"), // Make whitespace flexible
              "g" // Global flag to replace all occurrences
            );

            // Attempt to find the content with flexible matching
            let newContent = fileContent;
            if (fileContent.includes(decodedFrom)) {
              // If exact match found, use it
              newContent = fileContent.replace(decodedFrom, decodedTo);
            } else {
              // Try with regex for more flexible matching
              newContent = fileContent.replace(fromRegex, decodedTo);
            }

            // Make sure the replacement happened (the 'from' text was found)
            if (newContent === fileContent) {
              throw new ActionError(
                `Could not find text to replace in ${filePath}`,
                item.data
              );
            }

            // Write the updated content back to the file
            await webcontainerInstance.fs.writeFile(
              `${landingPageId}/${filePath}`,
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

            const process = await webcontainerInstance.spawn(
              args[0],
              args.slice(1),
              {
                cwd: `/${landingPageId}`,
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
              const errorMessage = `Shell command failed with exit code ${exitCode}: ${item.data.action.content}`;

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

              throw new ActionError(errorMessage, item.data);
            }

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

        // Create a new ActionError with detailed information
        const actionError =
          error instanceof ActionError
            ? error
            : new ActionError(
                error instanceof Error ? error.message : String(error),
                item.data,
                { cause: error }
              );

        setFailedActions((prev) => {
          return [
            ...prev,
            {
              messageId: item.data.messageId,
              error: actionError,
              data: item.data,
            },
          ];
        });

        console.log("Error processing action:", actionError);
      } finally {
        setMessageQueue((prev) => {
          return prev.map((i) => {
            if (i.id === item.id) {
              return { ...i, isProcessed: true };
            }
            return i;
          });
        });
      }
    },
    [
      landingPageId,
      setActions,
      setFailedActions,
      setParsedFiles,
      setMessageQueue,
    ]
  );

  useEffect(() => {
    if (messageQueue.length === 0 || isProcessing) return;

    const processQueue = async () => {
      setIsProcessing(true);

      try {
        // Process all items in the queue
        for (const item of messageQueue) {
          // Skip if already processed
          if (item.isProcessed) {
            continue;
          }

          if (item.type === "artifact") {
            await processArtifacts(item);
          } else if (item.type === "action") {
            await processActions(item);
          }
        }

        // Clean processed items immediately after successful processing
        if (messageQueue.some((item) => item.isProcessed)) {
          setMessageQueue((prev) => prev.filter((i) => !i.isProcessed));
        }
      } catch (error) {
        console.error("[Queue] Processing error:", error);
      } finally {
        setIsProcessing(false);
      }
    };

    processQueue();
  }, [
    messageQueue,
    isProcessing,
    processArtifacts,
    processActions,
    setMessageQueue,
  ]);

  // Separate effect for safety cleanup of large queues
  useEffect(() => {
    const QUEUE_SIZE_THRESHOLD = 50;
    const CLEANUP_INTERVAL = 5000;

    // Only set up the interval if we have a potentially problematic queue
    if (
      messageQueue.filter((i) => i.isProcessed).length > QUEUE_SIZE_THRESHOLD
    ) {
      const intervalId = setInterval(() => {
        const processedCount = messageQueue.filter((i) => i.isProcessed).length;

        if (processedCount > 0) {
          console.log(
            `[Queue] Safety cleanup: removing ${processedCount} processed items`
          );
          setMessageQueue((prev) => prev.filter((i) => !i.isProcessed));
        }
      }, CLEANUP_INTERVAL);

      return () => clearInterval(intervalId);
    }
  }, [messageQueue, setMessageQueue]);
}
