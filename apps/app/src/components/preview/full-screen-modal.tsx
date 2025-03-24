import { isIframeFullScreenAtom } from "@/lib/workbench/atoms";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@firebuzz/ui/components/ui/drawer";
import { useAtom } from "jotai";
import { useRef } from "react";
import { Frame } from "./frame";
export const FullScreenModal = () => {
  const [isOpen, setIsOpen] = useAtom(isIframeFullScreenAtom);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerContent className="w-full h-[95vh]">
        <DrawerHeader className="sr-only bg-red-100">
          <DrawerTitle>Preview</DrawerTitle>
        </DrawerHeader>
        <Frame ref={iframeRef} />
      </DrawerContent>
    </Drawer>
  );
};
