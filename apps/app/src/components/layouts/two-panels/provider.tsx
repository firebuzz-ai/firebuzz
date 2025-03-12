"use client";
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
import { setPanelSize } from "./set-cookie-action";

interface TwoPanelsContext {
  isRightPanelOpen: boolean;
  isRightPanelClosing: boolean;
  isRightPanelOpening: boolean;
  openRightPanel: () => void;
  closeRightPanel: () => void;
  rightPanelSize: number;
  setIsDragging: Dispatch<SetStateAction<boolean>>;
  isDragging: boolean;
  id: string;
}

const twoPanelsContext = createContext<TwoPanelsContext>({
  isRightPanelOpen: false,
  isRightPanelClosing: false,
  isRightPanelOpening: false,
  openRightPanel: () => {},
  closeRightPanel: () => {},
  isDragging: false,
  setIsDragging: () => {},
  rightPanelSize: 0,
  id: "",
});

const TwoPanelsProvider = ({
  children,
  rightPanelSizeFromCookie,
  id,
  isRightPanelClosable = true,
}: {
  children: React.ReactNode;
  rightPanelSizeFromCookie: number;
  id: string;
  isRightPanelClosable?: boolean;
}) => {
  const panelGroupRef = useRef<ImperativePanelGroupHandle>(null);
  const [isRightPanelClosing, setIsRightPanelClosing] = useState(false);
  const [isRightPanelOpening, setIsRightPanelOpening] = useState(false);
  const [isRightPanelMounted, setIsRightPanelMounted] = useState(true);
  const [rightPanelSize, setRightPanelSize] = useState(
    rightPanelSizeFromCookie
  );

  const [isDragging, setIsDragging] = useState(false);

  const closeRightPanel = useCallback(async () => {
    if (isRightPanelMounted && isRightPanelClosable) {
      setIsRightPanelClosing(true);
      await sleep(100);
      panelGroupRef.current?.setLayout([100, 0]);
      await sleep(150);
      setIsRightPanelClosing(false);
      setIsRightPanelMounted(false);
      setRightPanelSize(0);
    }
  }, [isRightPanelMounted, isRightPanelClosable]);

  const openRightPanel = useCallback(async () => {
    setIsRightPanelOpening(true);
    setIsRightPanelMounted(true);
    await sleep(50); // Small delay to ensure the panel is mounted
    setRightPanelSize(rightPanelSizeFromCookie);
    setIsRightPanelOpening(false);
  }, [rightPanelSizeFromCookie]);

  useLayoutEffect(() => {
    if (!isDragging) {
      return;
    }

    return () => {
      const sizes = panelGroupRef.current?.getLayout();
      if (sizes?.[1] && sizes[1] > 0) {
        setPanelSize(sizes[1], `${id}-right-panel-size`);
      }
    };
  }, [isDragging, id]);

  useEffect(() => {
    if (
      isRightPanelMounted &&
      !isRightPanelClosing &&
      !isRightPanelOpening &&
      rightPanelSize > 0
    ) {
      const leftSize = Math.max(0, Math.min(100, 100 - rightPanelSize));
      const rightSize = Math.max(0, Math.min(100, rightPanelSize));

      // Ensure the sum is exactly 100
      const totalSize = leftSize + rightSize;
      if (totalSize !== 100) {
        const adjustedLeftSize = (leftSize / totalSize) * 100;
        const adjustedRightSize = (rightSize / totalSize) * 100;
        panelGroupRef.current?.setLayout([adjustedLeftSize, adjustedRightSize]);
      } else {
        panelGroupRef.current?.setLayout([leftSize, rightSize]);
      }
    }
  }, [
    isRightPanelMounted,
    isRightPanelClosing,
    isRightPanelOpening,
    rightPanelSize,
  ]);

  const exposed: TwoPanelsContext = {
    isRightPanelOpen: isRightPanelMounted,
    isRightPanelClosing,
    isRightPanelOpening,
    rightPanelSize,
    openRightPanel,
    closeRightPanel,
    setIsDragging,
    isDragging,
    id,
  };

  return (
    <twoPanelsContext.Provider value={exposed}>
      <ResizablePanelGroup
        key={`${id}-panel-group`}
        id={`${id}-panel-group`}
        ref={panelGroupRef}
        direction="horizontal"
        onLayout={(sizes) => {
          if (!isDragging && sizes[1] > 0) {
            setRightPanelSize(sizes[1]);
          }
        }}
      >
        {children}
      </ResizablePanelGroup>
    </twoPanelsContext.Provider>
  );
};

export { TwoPanelsProvider, twoPanelsContext };
