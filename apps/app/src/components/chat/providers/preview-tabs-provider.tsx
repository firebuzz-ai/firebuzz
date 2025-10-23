"use client";

import {
	createContext,
	type Dispatch,
	type SetStateAction,
	useState,
} from "react";

export type PreviewTab =
	| "preview"
	| "analytics"
	| "page-speed"
	| "seo"
	| "tags";

interface PreviewTabsContext {
	activeTab: PreviewTab;
	setActiveTab: Dispatch<SetStateAction<PreviewTab>>;
}

const previewTabsContext = createContext<PreviewTabsContext>({
	activeTab: "preview",
	setActiveTab: () => {},
});

export const PreviewTabsProvider = ({
	children,
}: {
	children: React.ReactNode;
}) => {
	const [activeTab, setActiveTab] = useState<PreviewTab>("preview");

	const exposed: PreviewTabsContext = {
		activeTab,
		setActiveTab,
	};

	return (
		<previewTabsContext.Provider value={exposed}>
			{children}
		</previewTabsContext.Provider>
	);
};

export { previewTabsContext };
