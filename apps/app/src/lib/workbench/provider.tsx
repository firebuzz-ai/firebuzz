import { useSetAtom } from "jotai";
import type React from "react";
import { useEffect } from "react";
import {
  errorsAtom,
  isIframeLoadedAtom,
  portAtom,
  resetState,
  selectedElementAtom,
} from "./atoms";
import { PREVIEW_SCRIPT } from "./constants";
import { webcontainerInstance } from "./webcontainer";

// Set Preview Script
async function setPreviewScript() {
  await webcontainerInstance.setPreviewScript(PREVIEW_SCRIPT);
}

export const WebcontainerProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const setPort = useSetAtom(portAtom);
  const setIsIframeLoaded = useSetAtom(isIframeLoadedAtom);
  const setSelectedElement = useSetAtom(selectedElementAtom);
  const setErrors = useSetAtom(errorsAtom);
  // Port Listener
  useEffect(() => {
    const unsubPort = webcontainerInstance.on("port", (port, type, url) => {
      if (type === "open") {
        setPort({
          port,
          url,
        });
      } else {
        resetState();
      }
    });

    // Client Error Listener
    const unsubClientError = webcontainerInstance.on(
      "preview-message",
      (message) => {
        setErrors((prev) => {
          return [
            ...prev,
            {
              type: "client",
              // @ts-ignore
              message: message?.message ?? "",
              rawError: JSON.stringify(message),
            },
          ];
        });
      }
    );

    // Container Error Listener
    const unsubContainerError = webcontainerInstance.on("error", (error) => {
      console.log("container error", error);
      setErrors((prev) => {
        return [
          ...prev,
          {
            type: "container",
            message: error.message,
            rawError: JSON.stringify(error),
          },
        ];
      });
    });

    setPreviewScript();

    // Cleanup
    return () => {
      resetState();
      unsubPort();
      unsubClientError();
      unsubContainerError();
    };
  }, [setPort, setErrors]);

  // Listen for messages from the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "iframe-loaded") {
        setIsIframeLoaded(true);
      } else if (event.data?.type === "element-selected") {
        console.log("element-selected", event.data.data);
        setSelectedElement(event.data.data);
      } else {
        console.log("unknown message", event.data);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [setIsIframeLoaded, setSelectedElement]);

  return <>{children}</>;
};
