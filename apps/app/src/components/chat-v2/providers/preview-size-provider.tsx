"use client";

import {
	createContext,
	type Dispatch,
	type SetStateAction,
	useState,
} from "react";

export type PreviewSize = "mobile" | "tablet" | "desktop";

interface PreviewSizeContext {
	currentSize: PreviewSize;
	setCurrentSize: Dispatch<SetStateAction<PreviewSize>>;
}

const previewSizeContext = createContext<PreviewSizeContext>({
	currentSize: "desktop",
	setCurrentSize: () => {},
});

export const PreviewSizeProvider = ({
	children,
}: {
	children: React.ReactNode;
}) => {
	const [currentSize, setCurrentSize] = useState<PreviewSize>("desktop");

	const exposed: PreviewSizeContext = {
		currentSize,
		setCurrentSize,
	};

	return (
		<previewSizeContext.Provider value={exposed}>
			{children}
		</previewSizeContext.Provider>
	);
};

export { previewSizeContext };
