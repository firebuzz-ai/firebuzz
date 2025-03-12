"use client";
import { useRef } from "react";
import { Frame } from "./frame";
import { Header } from "./header";
import { Toolbar } from "./toolbar";

export const Preview = ({ publish }: { publish: () => Promise<void> }) => {
  const frameRef = useRef<HTMLIFrameElement>(null);

  return (
    <>
      <Header publish={publish} />
      <Toolbar url="https://www.firebuzz.ai" iframeRef={frameRef} />
      <Frame ref={frameRef} />
    </>
  );
};
