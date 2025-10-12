"use client";

import { Provider } from "jotai";
import { TwoPanelsProvider } from "@/components/layouts/two-panels/provider";
import { workbenchStore } from "@/lib/workbench/atoms";
import { WebcontainerProvider } from "@/lib/workbench/provider";

export const Providers = ({
	children,
	previewPanelSize,
	panelId,
}: {
	children: React.ReactNode;
	previewPanelSize: number;
	panelId: string;
}) => {
	return (
		<Provider store={workbenchStore}>
			<TwoPanelsProvider
				rightPanelSizeFromCookie={previewPanelSize}
				id={panelId}
			>
				<WebcontainerProvider>{children}</WebcontainerProvider>
			</TwoPanelsProvider>
		</Provider>
	);
};
