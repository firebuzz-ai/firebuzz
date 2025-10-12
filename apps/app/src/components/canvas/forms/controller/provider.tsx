"use client";

import {
	createContext,
	type Dispatch,
	type SetStateAction,
	useContext,
	useState,
} from "react";
import { useHotkeys } from "react-hotkeys-hook";

export const formCanvasControllerContext = createContext<{
	mode: "select" | "drag";
	setMode: (mode: "select" | "drag") => void;
	isGeneratingSchema: boolean;
	setIsGeneratingSchema: Dispatch<SetStateAction<boolean>>;
}>({
	mode: "select",
	setMode: () => {},
	isGeneratingSchema: false,
	setIsGeneratingSchema: () => {},
});

const FormControllerProvider = ({
	children,
}: {
	children: React.ReactNode;
}) => {
	const [mode, setMode] = useState<"select" | "drag">("select");
	const [isGeneratingSchema, setIsGeneratingSchema] = useState(false);

	useHotkeys("v", () => setMode("select"), {});
	useHotkeys("h", () => setMode("drag"), {});
	useHotkeys("meta+g", () => setIsGeneratingSchema(true), {});

	return (
		<formCanvasControllerContext.Provider
			value={{
				mode,
				setMode,
				isGeneratingSchema,
				setIsGeneratingSchema,
			}}
		>
			{children}
		</formCanvasControllerContext.Provider>
	);
};

export const useFormCanvasController = () => {
	const ctx = useContext(formCanvasControllerContext);
	if (!ctx) {
		throw new Error(
			"useFormCanvasController must be used within a FormCanvasControllerProvider",
		);
	}
	return ctx;
};

export const FormCanvasControllerProvider = ({
	children,
}: {
	children: React.ReactNode;
}) => {
	return <FormControllerProvider>{children}</FormControllerProvider>;
};
