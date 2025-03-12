import { useSetAtom } from "jotai";
import type React from "react";
import { useEffect } from "react";
import {
  type PreviewError,
  isIframeLoadedAtom,
  portAtom,
  previewErrorAtom,
  resetState,
  selectedElementAtom,
} from "./atoms";
import { PREVIEW_SCRIPT } from "./contants";
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
  const setPreviewError = useSetAtom(previewErrorAtom);
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

    const unsubError = webcontainerInstance.on("preview-message", (message) => {
      setPreviewError(message as PreviewError);
    });

    setPreviewScript();

    // Cleanup
    return () => {
      resetState();
      unsubPort();
      unsubError();
    };
  }, [setPort, setPreviewError]);

  // Listen for messages from the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "iframe-loaded") {
        setIsIframeLoaded(true);
      } else if (event.data?.type === "element-selected") {
        console.log("element-selected", event.data.data);
        setSelectedElement(event.data.data);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [setIsIframeLoaded, setSelectedElement]);

  return <>{children}</>;
};
