"use client";
import {
	type ImperativePanelHandle,
	ResizablePanelGroup,
} from "@firebuzz/ui/components/ui/resizable";
import {
	createContext,
	type Dispatch,
	type SetStateAction,
	useRef,
	useState,
} from "react";

interface TwoPanelsAgentContext {
	leftPanelRef: React.RefObject<ImperativePanelHandle | null>;
	setIsDragging: Dispatch<SetStateAction<boolean>>;
	isDragging: boolean;
	isLeftPanelCollapsed: boolean;
	setIsLeftPanelCollapsed: Dispatch<SetStateAction<boolean>>;
	id: string;
}

const twoPanelsAgentContext = createContext<TwoPanelsAgentContext>({
	leftPanelRef: { current: null },
	isDragging: false,
	setIsDragging: () => {},
	isLeftPanelCollapsed: false,
	setIsLeftPanelCollapsed: () => {},
	id: "",
});

const TwoPanelsAgentProvider = ({
	children,
	id,
}: {
	children: React.ReactNode;
	leftPanelSizeFromCookie: number;
	id: string;
}) => {
	const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
	const leftPanelRef = useRef<ImperativePanelHandle>(null);
	const [isDragging, setIsDragging] = useState(false);

	const exposed: TwoPanelsAgentContext = {
		leftPanelRef,
		setIsDragging,
		isDragging,
		isLeftPanelCollapsed,
		setIsLeftPanelCollapsed,
		id,
	};

	return (
		<twoPanelsAgentContext.Provider value={exposed}>
			<ResizablePanelGroup
				key={`${id}-panel-group`}
				id={`${id}-panel-group`}
				direction="horizontal"
			>
				{children}
			</ResizablePanelGroup>
		</twoPanelsAgentContext.Provider>
	);
};

export { TwoPanelsAgentProvider, twoPanelsAgentContext };
