"use client";
import { useAtomValue } from "jotai";
import { useEffect } from "react";
import { isIframeLoadedAtom, portAtom } from "@/lib/workbench/atoms";
import { Loading } from "./loading";

export function Frame({
	ref,
}: {
	ref: React.RefObject<HTMLIFrameElement | null>;
}) {
	const port = useAtomValue(portAtom);
	const isIframeLoaded = useAtomValue(isIframeLoadedAtom);

	// Regenerate iframe key when port changes to force proper remount
	useEffect(() => {
		if (port?.url && ref.current) {
			ref.current.src = port.url;
		}

		return () => {
			if (ref.current) {
				ref.current.src = "about:blank";
			}
		};
	}, [port?.url, ref]);

	return (
		<div className="overflow-hidden relative size-full">
			{/* Loading Component */}
			{(!isIframeLoaded || !port?.url) && <Loading />}
			<iframe
				ref={ref}
				sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
				referrerPolicy="no-referrer"
				title="Preview"
				className="w-full h-full bg-white border-none"
				rel="noopener"
			/>
		</div>
	);
}
