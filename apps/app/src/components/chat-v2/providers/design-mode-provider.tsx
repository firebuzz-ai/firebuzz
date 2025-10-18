"use client";

import {
	createContext,
	type Dispatch,
	type SetStateAction,
	useCallback,
	useState,
} from "react";

export interface ElementData {
	tagName: string;
	className: string;
	textContent: string | null;
	sourcePath?: string;
	sourceLine?: string;
	componentName?: string;
	computedStyles?: Record<string, string>;
}

interface DesignModeContext {
	isDesignModeActive: boolean;
	selectedElement: ElementData | null;
	toggleDesignMode: () => void;
	setIsDesignModeActive: Dispatch<SetStateAction<boolean>>;
	selectElement: (data: ElementData | null) => void;
}

export const designModeContext = createContext<DesignModeContext>({
	isDesignModeActive: false,
	selectedElement: null,
	toggleDesignMode: () => {},
	setIsDesignModeActive: () => {},
	selectElement: () => {},
});

export const DesignModeProvider = ({
	children,
}: {
	children: React.ReactNode;
}) => {
	const [isDesignModeActive, setIsDesignModeActive] = useState(false);
	const [selectedElement, setSelectedElement] = useState<ElementData | null>(
		null,
	);

	const toggleDesignMode = useCallback(() => {
		setIsDesignModeActive((prev) => !prev);
		// Clear selection when toggling off
		if (isDesignModeActive) {
			setSelectedElement(null);
		}
	}, [isDesignModeActive]);

	const selectElement = useCallback((data: ElementData | null) => {
		setSelectedElement(data);
	}, []);

	const exposed: DesignModeContext = {
		isDesignModeActive,
		selectedElement,
		toggleDesignMode,
		setIsDesignModeActive,
		selectElement,
	};

	return (
		<designModeContext.Provider value={exposed}>
			{children}
		</designModeContext.Provider>
	);
};
