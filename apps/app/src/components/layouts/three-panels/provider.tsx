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

interface ThreePanelsContext {
  isLeftPanelOpen: boolean;
  isLeftPanelClosing: boolean;
  isLeftPanelOpening: boolean;
  openLeftPanel: () => void;
  closeLeftPanel: () => void;
  leftPanelSize: number;
  isRightPanelOpen: boolean;
  isRightPanelClosing: boolean;
  isRightPanelOpening: boolean;
  openRightPanel: () => void;
  closeRightPanel: () => void;
  rightPanelSize: number;
  isBottomPanelOpen: boolean;
  isBottomPanelClosing: boolean;
  isBottomPanelOpening: boolean;
  openBottomPanel: () => void;
  closeBottomPanel: () => void;
  bottomPanelSize: number;
  setIsDraggingHorizontal: Dispatch<SetStateAction<boolean>>;
  setIsDraggingVertical: Dispatch<SetStateAction<boolean>>;
  isDraggingHorizontal: boolean;
  isDraggingVertical: boolean;
  horizontalPanelGroupRef: React.RefObject<ImperativePanelGroupHandle | null>;
  verticalPanelGroupRef: React.RefObject<ImperativePanelGroupHandle | null>;
  id: string;
}

const threePanelsContext = createContext<ThreePanelsContext>({
  isLeftPanelOpen: false,
  isLeftPanelClosing: false,
  isLeftPanelOpening: false,
  openLeftPanel: () => {},
  closeLeftPanel: () => {},
  leftPanelSize: 0,
  isRightPanelOpen: false,
  isRightPanelClosing: false,
  isRightPanelOpening: false,
  openRightPanel: () => {},
  closeRightPanel: () => {},
  rightPanelSize: 0,
  isBottomPanelOpen: false,
  isBottomPanelClosing: false,
  isBottomPanelOpening: false,
  openBottomPanel: () => {},
  closeBottomPanel: () => {},
  bottomPanelSize: 0,
  isDraggingHorizontal: false,
  isDraggingVertical: false,
  setIsDraggingHorizontal: () => {},
  setIsDraggingVertical: () => {},
  horizontalPanelGroupRef: { current: null },
  verticalPanelGroupRef: { current: null },
  id: "",
});

const ThreePanelsProvider = ({
  children,
  leftPanelSizeFromCookie,
  rightPanelSizeFromCookie,
  bottomPanelSizeFromCookie,
  id,
  isLeftPanelClosable = true,
  isRightPanelClosable = true,
}: {
  children: React.ReactNode;
  leftPanelSizeFromCookie: number;
  rightPanelSizeFromCookie: number;
  bottomPanelSizeFromCookie: number;
  id: string;
  isLeftPanelClosable?: boolean;
  isRightPanelClosable?: boolean;
}) => {
  const horizontalPanelGroupRef = useRef<ImperativePanelGroupHandle>(null);
  const verticalPanelGroupRef = useRef<ImperativePanelGroupHandle>(null);

  // Left panel state
  const [isLeftPanelClosing, setIsLeftPanelClosing] = useState(false);
  const [isLeftPanelOpening, setIsLeftPanelOpening] = useState(false);
  const [isLeftPanelMounted, setIsLeftPanelMounted] = useState(true);
  const [leftPanelSize, setLeftPanelSize] = useState(leftPanelSizeFromCookie);

  // Right panel state
  const [isRightPanelClosing, setIsRightPanelClosing] = useState(false);
  const [isRightPanelOpening, setIsRightPanelOpening] = useState(false);
  const [isRightPanelMounted, setIsRightPanelMounted] = useState(true);
  const [rightPanelSize, setRightPanelSize] = useState(
    rightPanelSizeFromCookie
  );

  // Bottom panel state
  const [isBottomPanelClosing, setIsBottomPanelClosing] = useState(false);
  const [isBottomPanelOpening, setIsBottomPanelOpening] = useState(false);
  const [isBottomPanelMounted, setIsBottomPanelMounted] = useState(
    bottomPanelSizeFromCookie > 0
  );
  const [bottomPanelSize, setBottomPanelSize] = useState(
    bottomPanelSizeFromCookie
  );

  const [isDraggingHorizontal, setIsDraggingHorizontal] = useState(false);
  const [isDraggingVertical, setIsDraggingVertical] = useState(false);

  const closeLeftPanel = useCallback(async () => {
    if (isLeftPanelMounted && isLeftPanelClosable) {
      setIsLeftPanelClosing(true);
      await sleep(100);
      horizontalPanelGroupRef.current?.setLayout([0, 100]);
      await sleep(150);
      setIsLeftPanelClosing(false);
      setIsLeftPanelMounted(false);
      setLeftPanelSize(0);
    }
  }, [isLeftPanelMounted, isLeftPanelClosable]);

  const openLeftPanel = useCallback(async () => {
    setIsLeftPanelOpening(true);
    setIsLeftPanelMounted(true);
    await sleep(50);
    setLeftPanelSize(leftPanelSizeFromCookie);
    setIsLeftPanelOpening(false);
  }, [leftPanelSizeFromCookie]);

  const closeRightPanel = useCallback(async () => {
    if (isRightPanelMounted && isRightPanelClosable) {
      setIsRightPanelClosing(true);
      await sleep(100);
      horizontalPanelGroupRef.current?.setLayout([100, 0]);
      await sleep(150);
      setIsRightPanelClosing(false);
      setIsRightPanelMounted(false);
      setRightPanelSize(0);
    }
  }, [isRightPanelMounted, isRightPanelClosable]);

  const openRightPanel = useCallback(async () => {
    setIsRightPanelOpening(true);
    setIsRightPanelMounted(true);
    await sleep(50);
    setRightPanelSize(rightPanelSizeFromCookie);
    setIsRightPanelOpening(false);
  }, [rightPanelSizeFromCookie]);

  const closeBottomPanel = useCallback(async () => {
    if (isBottomPanelMounted) {
      setIsBottomPanelClosing(true);
      await sleep(100);

      verticalPanelGroupRef.current?.setLayout([100, 0]);
      await sleep(150);
      setIsBottomPanelClosing(false);
      setIsBottomPanelMounted(false);
      setBottomPanelSize(0);
      setPanelSize(0, `${id}-bottom-panel-size`);
    }
  }, [isBottomPanelMounted, id]);

  const openBottomPanel = useCallback(async () => {
    setIsBottomPanelOpening(true);
    setIsBottomPanelMounted(true);
    await sleep(50);
    setBottomPanelSize(10);
    verticalPanelGroupRef.current?.setLayout([90, 10]);
    setIsBottomPanelOpening(false);
    setPanelSize(10, `${id}-bottom-panel-size`);
  }, [id]);

  // Save horizontal layout on drag end
  useLayoutEffect(() => {
    if (!isDraggingHorizontal) {
      return;
    }

    return () => {
      const sizes = horizontalPanelGroupRef.current?.getLayout();

      if (sizes?.[0] && sizes[0] > 0) {
        setPanelSize(sizes[0], `${id}-left-panel-size`);
      }
      if (sizes?.[1] && sizes[1] > 0) {
        setPanelSize(sizes[1], `${id}-right-panel-size`);
      }
    };
  }, [isDraggingHorizontal, id]);

  // Save vertical layout on drag end
  useLayoutEffect(() => {
    if (!isDraggingVertical) {
      return;
    }

    return () => {
      const sizes = verticalPanelGroupRef.current?.getLayout();
      if (sizes?.[1] && sizes[1] > 0) {
        setPanelSize(sizes[1], `${id}-bottom-panel-size`);
      }
    };
  }, [isDraggingVertical, id]);

  // Restore horizontal layout
  useEffect(() => {
    if (
      isLeftPanelMounted &&
      isRightPanelMounted &&
      !isLeftPanelClosing &&
      !isLeftPanelOpening &&
      !isRightPanelClosing &&
      !isRightPanelOpening &&
      leftPanelSize > 0 &&
      rightPanelSize > 0
    ) {
      const adjustedLeftSize = Math.max(0, Math.min(100, leftPanelSize));
      const adjustedRightSize = Math.max(0, Math.min(100, rightPanelSize));

      const totalSize = adjustedLeftSize + adjustedRightSize;
      if (totalSize !== 100) {
        const finalLeftSize = (adjustedLeftSize / totalSize) * 100;
        const finalRightSize = (adjustedRightSize / totalSize) * 100;
        horizontalPanelGroupRef.current?.setLayout([
          finalLeftSize,
          finalRightSize,
        ]);
      } else {
        horizontalPanelGroupRef.current?.setLayout([
          adjustedLeftSize,
          adjustedRightSize,
        ]);
      }
    }
  }, [
    isLeftPanelMounted,
    isRightPanelMounted,
    isLeftPanelClosing,
    isLeftPanelOpening,
    isRightPanelClosing,
    isRightPanelOpening,
    leftPanelSize,
    rightPanelSize,
  ]);

  // Restore vertical layout
  useEffect(() => {
    if (
      isBottomPanelMounted &&
      !isBottomPanelClosing &&
      !isBottomPanelOpening &&
      bottomPanelSize > 0
    ) {
      const topSize = Math.max(0, Math.min(100, 100 - bottomPanelSize));
      const bottomSize = Math.max(0, Math.min(100, bottomPanelSize));

      const totalSize = topSize + bottomSize;
      if (totalSize !== 100) {
        const adjustedTopSize = (topSize / totalSize) * 100;
        const adjustedBottomSize = (bottomSize / totalSize) * 100;
        verticalPanelGroupRef.current?.setLayout([
          adjustedTopSize,
          adjustedBottomSize,
        ]);
      } else {
        verticalPanelGroupRef.current?.setLayout([topSize, bottomSize]);
      }
    }
  }, [
    isBottomPanelMounted,
    isBottomPanelClosing,
    isBottomPanelOpening,
    bottomPanelSize,
  ]);

  const exposed: ThreePanelsContext = {
    isLeftPanelOpen: isLeftPanelMounted,
    isLeftPanelClosing,
    isLeftPanelOpening,
    leftPanelSize,
    openLeftPanel,
    closeLeftPanel,
    isRightPanelOpen: isRightPanelMounted,
    isRightPanelClosing,
    isRightPanelOpening,
    rightPanelSize,
    openRightPanel,
    closeRightPanel,
    isBottomPanelOpen: isBottomPanelMounted,
    isBottomPanelClosing,
    isBottomPanelOpening,
    bottomPanelSize,
    openBottomPanel,
    closeBottomPanel,
    setIsDraggingHorizontal,
    setIsDraggingVertical,
    isDraggingHorizontal,
    isDraggingVertical,
    horizontalPanelGroupRef,
    verticalPanelGroupRef,
    id,
  };

  return (
    <threePanelsContext.Provider value={exposed}>
      <ResizablePanelGroup
        key={`${id}-horizontal-panel-group`}
        id={`${id}-horizontal-panel-group`}
        ref={horizontalPanelGroupRef}
        direction="horizontal"
        onLayout={(sizes) => {
          if (!isDraggingHorizontal) {
            if (sizes[0] > 0) {
              setLeftPanelSize(sizes[0]);
            }
            if (sizes[1] > 0) {
              setRightPanelSize(sizes[1]);
            }
          }
        }}
      >
        {children}
      </ResizablePanelGroup>
    </threePanelsContext.Provider>
  );
};

export { ThreePanelsProvider, threePanelsContext };
