"use client";
import { setPanelSize } from "@/components/layouts/generative-chat/set-cookie-action";
import {
  type ImperativePanelGroupHandle,
  ResizablePanelGroup,
} from "@firebuzz/ui/components/ui/resizable";
import { sleep } from "@firebuzz/utils";
import {
  type Dispatch,
  type SetStateAction,
  createContext,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

interface GenerativeChatContext {
  isPreviewPanelOpen: boolean;
  isPreviewPanelClosing: boolean;
  isPreviewPanelOpening: boolean;
  openPreviewPanel: () => void;
  closePreviewPanel: () => void;
  previewPanelSize: number;
  setIsDragging: Dispatch<SetStateAction<boolean>>;
  isDragging: boolean;
}

const generativeChatContext = createContext<GenerativeChatContext>({
  isPreviewPanelOpen: false,
  isPreviewPanelClosing: false,
  isPreviewPanelOpening: false,
  openPreviewPanel: () => {},
  closePreviewPanel: () => {},
  isDragging: false,
  setIsDragging: () => {},
  previewPanelSize: 0,
});

const GenerativeChatProvider = ({
  children,
  previewPanelSizeFromCookie,
}: {
  children: React.ReactNode;
  previewPanelSizeFromCookie: number;
}) => {
  const panelGroupRef = useRef<ImperativePanelGroupHandle>(null);
  const [isPreviewPanelClosing, setIsPreviewPanelClosing] = useState(false);
  const [isPreviewPanelOpening, setIsPreviewPanelOpening] = useState(false);
  const [isPreviewPanelMounted, setIsPreviewPanelMounted] = useState(true);
  const [previewPanelSize, setPreviewPanelSize] = useState(
    previewPanelSizeFromCookie
  );

  const [isDragging, setIsDragging] = useState(false);

  const closePreviewPanel = useCallback(async () => {
    if (isPreviewPanelMounted) {
      setIsPreviewPanelClosing(true);
      await sleep(100);
      panelGroupRef.current?.setLayout([100, 0]);
      await sleep(150);
      setIsPreviewPanelClosing(false);
      setIsPreviewPanelMounted(false);
      setPreviewPanelSize(0);
    }
  }, [isPreviewPanelMounted]);

  const openPreviewPanel = useCallback(async () => {
    setIsPreviewPanelOpening(true);
    setIsPreviewPanelMounted(true);
    await sleep(50); // Small delay to ensure the panel is mounted
    setPreviewPanelSize(previewPanelSizeFromCookie);
    setIsPreviewPanelOpening(false);
  }, [previewPanelSizeFromCookie]);

  useLayoutEffect(() => {
    if (!isDragging) {
      return;
    }

    return () => {
      const sizes = panelGroupRef.current?.getLayout();
      if (sizes?.[1] && sizes[1] > 0) {
        setPanelSize(sizes[1]);
      }
    };
  }, [isDragging]);

  useEffect(() => {
    if (isPreviewPanelMounted && !isPreviewPanelClosing) {
      panelGroupRef.current?.setLayout([
        100 - previewPanelSize,
        previewPanelSize,
      ]);
    }
  }, [isPreviewPanelMounted, isPreviewPanelClosing, previewPanelSize]);

  const exposed: GenerativeChatContext = {
    isPreviewPanelOpen: isPreviewPanelMounted,
    isPreviewPanelClosing,
    isPreviewPanelOpening,
    previewPanelSize,
    openPreviewPanel,
    closePreviewPanel,
    setIsDragging,
    isDragging,
  };

  return (
    <generativeChatContext.Provider value={exposed}>
      <ResizablePanelGroup
        key="panel-group"
        id="panel-group"
        ref={panelGroupRef}
        direction="horizontal"
        onLayout={(sizes) => {
          if (!isDragging && sizes[1] > 0) {
            setPreviewPanelSize(sizes[1]);
          }
        }}
      >
        {children}
      </ResizablePanelGroup>
    </generativeChatContext.Provider>
  );
};

export { GenerativeChatProvider, generativeChatContext };
