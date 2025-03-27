"use client";

import { ReactFlowProvider, useKeyPress } from "@xyflow/react";
import {
	type Dispatch,
	type SetStateAction,
	createContext,
	useContext,
	useEffect,
	useState,
} from "react";

export const controllerContext = createContext<{
	mode: "select" | "drag";
	isAddingNote: boolean;
	setIsAddingNote: Dispatch<SetStateAction<boolean>>;
	setMode: (mode: "select" | "drag") => void;
}>({
	mode: "select",
	isAddingNote: false,
	setIsAddingNote: () => {},
	setMode: () => {},
});

const ControllerProvider = ({ children }: { children: React.ReactNode }) => {
	const [mode, setMode] = useState<"select" | "drag">("select");
	const [isAddingNote, setIsAddingNote] = useState(false);
	const selectPressed = useKeyPress("v");
	const dragPressed = useKeyPress("h");

	useEffect(() => {
		if (selectPressed) {
			setMode("select");
		}
		if (dragPressed) {
			setMode("drag");
		}
	}, [selectPressed, dragPressed]);

	return (
		<controllerContext.Provider
			value={{ mode, setMode, isAddingNote, setIsAddingNote }}
		>
			{children}
		</controllerContext.Provider>
	);
};

export const useCanvasController = () => {
	const ctx = useContext(controllerContext);
	if (!ctx) {
		throw new Error(
			"useCanvasController must be used within a ControllerProvider",
		);
	}
	return ctx;
};

export const CanvasProvider = ({ children }: { children: React.ReactNode }) => {
	return (
		<ReactFlowProvider>
			<ControllerProvider>{children}</ControllerProvider>
		</ReactFlowProvider>
	);
};
