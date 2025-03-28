"use client";
import { previewRefAtom } from "@/lib/workbench/atoms";
import { useSetAtom } from "jotai";
import { useEffect, useRef } from "react";
import { Frame } from "./frame";
import { FullScreenModal } from "./full-screen-modal";
import { Header } from "./header";
import { Toolbar } from "./toolbar";

export const Preview = ({
	publish,
	publishPreview,
}: {
	publish: () => Promise<void>;
	publishPreview: () => Promise<void>;
}) => {
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
			<Header publish={publish} publishPreview={publishPreview} />
			<Toolbar url="https://www.firebuzz.ai" iframeRef={frameRef} />
			<Frame ref={frameRef} />
		</>
	);
};
