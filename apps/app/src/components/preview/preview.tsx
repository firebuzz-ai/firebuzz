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
			{/* Use a full-height layout so the iframe receives the remaining space.
			   Without this, header + toolbar add extra height causing the frame's
			   bottom to be clipped inside the panel (parent has overflow-hidden). */}
			<div className="grid h-full min-h-0 grid-rows-[auto_auto_1fr]">
				<Header />
				<Toolbar url="https://www.firebuzz.ai" iframeRef={frameRef} />
				<div className="min-h-0">
					<Frame ref={frameRef} />
				</div>
			</div>
		</>
	);
};
