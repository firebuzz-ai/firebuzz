"use client";
import { previewRefAtom } from "@/lib/workbench/atoms";
import { useSetAtom } from "jotai";
import { useEffect, useRef } from "react";
import { Frame } from "./frame";
import { FullScreenModal } from "./full-screen-modal";
import { Header } from "./header";
import { Toolbar } from "./toolbar";

export const Preview = () => {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const setPreviewRef = useSetAtom(previewRefAtom);

  useEffect(() => {
    if (frameRef.current) {
      setPreviewRef(frameRef.current);
    }
  }, [setPreviewRef]);

  return (
    <>
      <FullScreenModal />
      <Header />
      <Toolbar url="https://www.firebuzz.ai" iframeRef={frameRef} />
      <Frame ref={frameRef} />
    </>
  );
};
