"use client";
import { isIframeLoadedAtom, portAtom } from "@/lib/workbench/atoms";
import { useAtomValue } from "jotai";
import { useEffect } from "react";
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
    <div className="relative size-full overflow-hidden">
      {/* Loading Component */}
      {(!isIframeLoaded || !port?.url) && <Loading />}
      <iframe
        ref={ref}
        sandbox="allow-same-origin allow-scripts allow-forms"
        referrerPolicy="no-referrer"
        allow="geolocation cross-origin-isolated"
        title="Preview"
        className="border-none w-full h-full bg-white"
        rel="noopener"
      />
    </div>
  );
}
